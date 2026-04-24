# 메시지 감정 옵션 (ElevenLabs 감정 TTS) API 스펙

> **분석 대상 BE 경로:** `C:\Users\EST-INFRA\voicemate-BE-v2`
> **분석 일자:** 2026-04-23
> **요청 기능:** 메시지 전송 시 감정 옵션 → ElevenLabs TTS에 감정 키워드 전달 → 감정 반영 음성 생성

---

## ⚠️ BE 수정 필요성 판정

### 결론: **시나리오 (A) — BE는 이미 emotion 파라미터를 완전히 지원함. FE만 수정하면 됨.**

**근거 (코드 사실):**

1. **Zod 스키마에 `emotion` 필드 이미 정의됨**
   - `src/schemas/message.ts:14-17` — `sendMessageSchema`에 `emotion: emotionSchema.optional()` 포함
   - `emotionSchema`는 8개 enum 값 (neutral / happy / sad / angry / surprised / excited / whispering / laughing) 정의

2. **메시지 라우트가 emotion을 수신/저장/전달함**
   - `src/routes/message.ts:58` — `const { text, emotion } = req.body`
   - `src/routes/message.ts:60-61` — `'neutral'`은 DB에 `null`로 정규화 (CHECK 제약 회피)
   - `src/routes/message.ts:119` — `messages.emotion` 컬럼에 저장
   - `src/routes/message.ts:141` — `processMessageAudio()`에 `storedEmotion` 전달
   - `src/routes/message.ts:221` — `/retry` 엔드포인트도 저장된 emotion으로 재합성

3. **ElevenLabs 호출부가 emotion을 텍스트 프리픽스로 변환**
   - `src/services/elevenlabs.ts:39-51` — `synthesizeSpeech(text, voiceId, emotion?)`
   - `src/services/elevenlabs.ts:44` — `const prefixed = emotion ? \`[${emotion}] ${text}\` : text;`
   - 모델: **`eleven_v3`** (감정 마크업 지원 모델) + `voiceSettings: { stability: 0.4 }`

4. **DB 마이그레이션 이미 적용됨**
   - `supabase/migrations/004_message_emotion.sql` — `messages.emotion` 컬럼 존재
   - CHECK constraint: `emotion in ('happy','sad','angry','surprised','excited','whispering','laughing')` (neutral 제외 → null)

5. **BE 타입 정의도 갱신됨**
   - `src/types/index.ts:43-51` — `Emotion` union 타입
   - `src/types/index.ts:63` — `Message.emotion: Emotion | null`

**FE에서 해야 할 일만 남음:**
- `src/types/index.ts` (FE)에 `Emotion` 타입 추가, `Message`에 `emotion` 필드 추가
- `src/services/matches.ts`(또는 message 전송 함수)에 `emotion` optional 인자 추가
- 채팅 입력 UI에 감정 선택 UI 추가
- 메시지 버블에 감정 표시(선택) 추가

---

## 엔드포인트 목록 (메시지 전송 관련)

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/messages/:matchId/messages` | Bearer | 메시지 전송 (감정 옵션 지원) |
| GET | `/api/messages/:matchId/messages` | Bearer | 메시지 목록 (페이지네이션) |
| PATCH | `/api/messages/:matchId/messages/read` | Bearer | 메시지 읽음 처리 |
| POST | `/api/messages/:messageId/retry` | Bearer | 실패한 오디오 재생성 |

> **베이스 경로 주의:** `src/index.ts`의 마운트 경로 확인이 필요하지만, 라우트 자체는 `/:matchId/messages` 패턴.

---

## 각 엔드포인트 상세

### POST `/:matchId/messages` — 메시지 전송 (감정 포함)

**Request:**
- Headers: `Authorization: Bearer <token>` (필수)
- URL Param: `matchId` (UUID)
- Body:

| 필드 | 타입 | 제약 | 필수 | 비고 |
|------|------|------|------|------|
| `text` | string | trim, min(1), max(1000) | ✅ | 메시지 본문 |
| `emotion` | enum | one of 아래 8개 | ❌ | 미전송 시 neutral 동작 |

**`emotion` 허용 값:**
```
'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'excited' | 'whispering' | 'laughing'
```

- `neutral` 또는 미지정 → BE가 `null`로 정규화하여 DB 저장, ElevenLabs 호출 시 프리픽스 없음
- 그 외 7개 → DB에 그대로 저장, ElevenLabs 호출 시 텍스트 앞에 `[emotion]` 프리픽스 자동 부착

**예시 Request Body:**
```json
{
  "text": "오늘 정말 즐거웠어요!",
  "emotion": "excited"
}
```

**Response 201 (즉시 응답 — 텍스트만 먼저 저장):**
```json
{
  "id": "uuid",
  "match_id": "uuid",
  "sender_id": "uuid",
  "original_text": "오늘 정말 즐거웠어요!",
  "original_language": "ko",
  "translated_text": null,
  "translated_language": "en",
  "audio_url": null,
  "audio_status": "processing",
  "emotion": "excited",
  "read_at": null,
  "created_at": "2026-04-23T..."
}
```

> 발신자에게 `elevenlabs_voice_id`가 없으면 `audio_status: 'pending'`으로 저장되고 비동기 TTS 파이프라인은 실행되지 않음.

**Error Responses:**
| 코드 | 조건 | 메시지 |
|------|------|--------|
| 400 | Zod validation 실패 (text 길이, emotion 허용값 외) | 표준 validation 에러 (validate 미들웨어) |
| 401 | 토큰 없음/유효하지 않음 | (auth middleware) |
| 403 | 매치 멤버 아님 | `Not a member of this match` |
| 403 | 언매치된 매치 | `This match has been unmatched` |
| 403 | 차단 관계 (양방향) | `Cannot send message to blocked user` |
| 404 | 발신자/수신자 프로필 없음 | `Profile not found` |
| 500 | DB insert 실패 | `<supabase error message>` |

**비동기 처리 (별도 트랙):**
- 응답 후 `processMessageAudio()` 실행 (`message.ts:225-265`)
- 단계: 번역(언어 다르면) → ElevenLabs TTS → Storage 업로드 → `audio_status: 'ready'` + `audio_url`/`translated_text` 업데이트
- 실패 시 `audio_status: 'failed'`로 마킹 → FE는 `/retry` 호출 가능

---

### GET `/:matchId/messages` — 메시지 목록

**Request:**
- Headers: `Authorization: Bearer <token>`
- Query: `limit` (1-100, default 50), `before` (ISO datetime, optional)

**Response 200:** `Message[]` (위와 동일한 shape, `emotion` 필드 포함, `created_at DESC`)

---

### PATCH `/:matchId/messages/read` — 읽음 처리

**Response 200:**
```json
{ "read_count": 3 }
```

---

### POST `/:messageId/retry` — 실패한 오디오 재생성

- 발신자 본인 + `audio_status === 'failed'`인 메시지만 가능
- DB에 저장된 `emotion`을 그대로 사용하여 재합성 (`message.ts:221`)
- **Response 200:** `{ "status": "processing" }`

---

## ElevenLabs 감정 파라미터 지원 현황

### 코드 기반 사실 (BE 구현 방식)

ElevenLabs JS SDK (`@elevenlabs/elevenlabs-js`) 호출 코드 (`src/services/elevenlabs.ts:39-51`):

```ts
export async function synthesizeSpeech(
  text: string,
  voiceId: string,
  emotion?: Exclude<Emotion, 'neutral'> | null
): Promise<Buffer> {
  const prefixed = emotion ? `[${emotion}] ${text}` : text;
  const audioStream = await client.textToSpeech.convert(voiceId, {
    text: prefixed,
    modelId: 'eleven_v3',
    voiceSettings: { stability: 0.4 },
  });
  return streamToBuffer(audioStream);
}
```

### 핵심 발견

1. **모델: `eleven_v3`** — ElevenLabs v3 모델은 **인라인 감정 태그** (`[happy]`, `[whispering]` 등 audio tags) 를 지원함. v2.5/turbo 모델에서는 동일한 효과가 보장되지 않음.
2. **감정 전달 방식: 텍스트 프리픽스** — 별도 emotion 파라미터가 SDK에 없으며, 텍스트 본문 앞에 `[emotion]` 형태로 마크업을 부착하는 방식.
3. **voiceSettings:** `stability: 0.4`만 지정 (style/use_speaker_boost 미사용). v3 모델이 audio tag를 자체적으로 해석.
4. **neutral 처리:** 프리픽스 부착 안 함 → 프롬프트 오염 방지.

### FE 영향
- FE는 `emotion` 필드를 그대로 BE에 보내기만 하면 됨 (텍스트 prefixing은 BE 책임).
- 사용자가 입력한 `text`에 `[...]` 같은 토큰을 그대로 두면 ElevenLabs가 또 다른 audio tag로 오해할 가능성이 있음. → **선택적 권고:** FE 입력 검증에서 `[` `]`를 escape 하거나 막지 않도록 유의 (BE는 막지 않음).

---

## FE용 TypeScript 타입 정의 (제안)

```ts
// src/types/index.ts (FE)

export type Emotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'excited'
  | 'whispering'
  | 'laughing';

export type AudioStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  original_text: string;
  original_language: string;
  translated_text: string | null;
  translated_language: string | null;
  audio_url: string | null;
  audio_status: AudioStatus;
  emotion: Emotion | null; // BE는 'neutral'을 null로 저장하므로 null 가능
  read_at: string | null;
  created_at: string;
}

export interface SendMessagePayload {
  text: string;       // 1~1000자, trim
  emotion?: Emotion;  // optional, neutral은 BE에서 null 처리
}

export interface SendMessageResponse extends Message {}
```

> 기존 FE `src/types/index.ts`에 `Emotion`/`AudioStatus`/`Message.emotion`이 없으면 추가. 있으면 enum 값 정합성 확인.

---

## 비즈니스 규칙 (FE가 알아야 할 로직)

1. **emotion === 'neutral'은 보내지 않거나 보내도 동일** — BE가 null로 정규화. FE는 UI 일관성을 위해 기본값으로 `'neutral'`을 두고, request body에서는 생략하거나 그대로 전송 둘 다 OK.
2. **응답은 즉시 (audio 생성 전)** — `audio_status: 'processing'` 상태로 메시지가 먼저 도착함. FE는 Realtime 구독으로 `audio_status` 전이를 감지해 audio_url 갱신해야 함.
3. **음성 클론이 없는 발신자** — `audio_status: 'pending'`으로 저장되고 TTS 미실행. FE 표시 분기 필요.
4. **언어 같으면 번역 스킵** — `original_language === translated_language`일 때 `translated_text`는 항상 null. FE 렌더 시 fallback 처리.
5. **재시도 가능** — `audio_status: 'failed'`인 메시지에 `/retry` 호출 가능. 저장된 emotion이 자동 사용됨 (FE는 emotion 재선택 UI 불필요).
6. **text 길이 제한 1000자** — Zod 검증. FE 입력단에서 동일 제한 적용 권장.
7. **emotion 값은 enum 외 거부** — 오타/추가 값 시 400 응답.

---

## FE 구현 시 주의사항

### 1. 채팅 입력 UI에 감정 선택 추가
- 8개 감정 중 1개 선택 (neutral 포함). neutral = 기본/감정 미지정.
- i18n: 한/영 라벨 필요 (`src/i18n/locales/en.ts`, `ko.ts`).
- 디자인 토큰 사용 (`src/components/ui/...`).

### 2. 메시지 버블에 emotion 표시 (선택적)
- `src/components/chat/ChatBubble.tsx`에 emotion이 null이 아닐 때 작은 라벨/아이콘/이모지로 표시.
- 디자인 시스템과 일관성 유지.

### 3. 메시지 전송 서비스 시그니처
```ts
// src/services/matches.ts 또는 message 관련 service
export async function sendMessage(matchId: string, text: string, emotion?: Emotion) { ... }
```

### 4. Realtime 구독 처리
- 기존 `src/services/realtime.ts`의 messages 구독에서 emotion 필드도 함께 수신됨.
- audio_status 전이(`processing` → `ready`/`failed`) 감지하여 UI 업데이트는 이미 동작 중인지 확인.

### 5. 입력 검증
- text trim + 1자 이상 1000자 이하.
- emotion이 enum 외 값으로 전송되지 않도록 union 타입 강제.

### 6. 에러 처리
- 403 (차단/언매치) → 명확한 사용자 메시지.
- 400 (validation) → 입력단 사전 검증으로 가급적 발생 회피.

---

## 권장 구현 방향 (FE 통합 가이드)

### Step 1. 타입 추가
`src/types/index.ts`에 `Emotion`, `Message.emotion`, `SendMessagePayload`(있다면) 추가.

### Step 2. 서비스 함수 확장
메시지 전송 함수(`src/services/matches.ts` 혹은 별도 `messages.ts`)에 `emotion?: Emotion` 인자 추가:
```ts
await api.post(`/messages/${matchId}/messages`, { text, ...(emotion && emotion !== 'neutral' ? { emotion } : {}) });
```
> `neutral`도 그대로 보내도 BE가 처리하므로 분기 없이 항상 보내도 무방. 일관성 위해 정책 결정.

### Step 3. 채팅 입력 UI 컴포넌트
- `src/app/(main)/chat/[matchId].tsx`의 입력바에 감정 선택 트리거(아이콘 버튼) 추가.
- 모달/시트/팝오버로 8개 옵션 노출. 선택값을 로컬 state로 관리.
- 전송 후 emotion을 기본값(`neutral`)으로 리셋할지 유지할지 UX 정책 결정 필요.

### Step 4. 메시지 버블에 표시 (선택적)
- `src/components/chat/ChatBubble.tsx`에 emotion null 아닐 때 라벨 노출.
- 감정별 색상/이모지 매핑 디자인 토큰화.

### Step 5. i18n
- `src/i18n/locales/en.ts`, `ko.ts`에 8개 emotion 라벨 키 추가.

### Step 6. 검증
- 타입 체크 (tsc)
- 화면 확인: 감정 선택 → 전송 → 응답 메시지에 `emotion` 필드 포함 → audio_status 전이 후 음성 재생 시 감정 반영 확인.

### BE 수정 필요 없음 — FE 작업만으로 완결됨.

---

## 참고 파일 경로 (BE)

- `C:\Users\EST-INFRA\voicemate-BE-v2\src\routes\message.ts`
- `C:\Users\EST-INFRA\voicemate-BE-v2\src\schemas\message.ts`
- `C:\Users\EST-INFRA\voicemate-BE-v2\src\services\elevenlabs.ts`
- `C:\Users\EST-INFRA\voicemate-BE-v2\src\types\index.ts`
- `C:\Users\EST-INFRA\voicemate-BE-v2\supabase\migrations\004_message_emotion.sql`
- `C:\Users\EST-INFRA\voicemate-BE-v2\supabase\migrations\001_initial_schema.sql`
