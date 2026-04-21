# VoiceMate SRS (Software Requirements Specification)

> **Version:** 1.1 (Emotion-based TTS 반영)
> **Date:** 2026-04-21
> **Author:** VoiceMate Team

---

## 소개

### 1. 목적

#### 1.1. SRS의 목적
본 문서는 **VoiceMate** 모바일 애플리케이션의 소프트웨어 요구사항을 정의하여, 개발 팀과 이해관계자가 구현 범위·기능·제약사항에 대해 동일한 기준을 공유하는 것을 목적으로 한다. 특히 **감정 기반 TTS(Emotion-aware Text-to-Speech)** 기능 추가에 따른 API/DB 변경 사항을 포함한다.

#### 1.2. SRS의 대상
- 프론트엔드 개발자 (Expo / React Native)
- 백엔드 개발자 (Node.js / Supabase)
- 기획 / 디자인 담당자
- QA 및 운영 담당자

---

### 2. 범위

#### 2.1. 소프트웨어의 목적
사용자의 목소리를 복제(Voice Clone)하여, 서로 다른 언어를 사용하는 사용자 간에도 **자신의 음성**으로 번역된 메시지를 전달할 수 있는 **크로스 언어 음성 소개팅 앱**을 제공한다.

#### 2.2. 소프트웨어의 목표
- 사용자의 음성을 통해 자연스러운 1:1 소통 경험 제공
- **한일(韓日) 사용자 간 언어 장벽 없는 매칭 지원** (한국어 / 일본어 기본)
- **감정이 담긴 TTS**로 텍스트 메시지의 뉘앙스 전달력 강화
- 안전한 인증·차단·신고 체계로 안전한 소셜 환경 구축

#### 2.3. 소프트웨어의 개발 범위

| 범위 | 포함 | 제외 |
| --- | --- | --- |
| 플랫폼 | iOS, Android (Expo) | Web |
| 언어 | 한국어(`ko`), 일본어(`ja`) | 기타 언어 (추후 확장) |
| 타깃 지역 | 대한민국, 일본 | 기타 지역 |
| 인증 | Email / Google OAuth | Apple, Kakao, LINE (추후) |
| TTS 엔진 | ElevenLabs `eleven_v3` | 자체 TTS |
| 번역 | Google Gemini 2.5 Flash | - |
| 결제 | - | 유료 결제 (향후 단계) |

#### 2.4. 소프트웨어의 기대 효과
- 음성 기반 매칭으로 기존 텍스트 중심 앱 대비 **신뢰도·몰입감** 상승
- 감정 태그 기반 TTS로 비동기 채팅의 **감정 전달 한계 극복**
- 한국어·일본어 자동 번역과 본인 음성 TTS를 결합해 **한일 사용자 간 자연스러운 교류** 지원
- K-Culture / J-Culture 관심층 및 한일 언어 학습자에게 **실용적 커뮤니케이션 가치** 제공

---

### 3. 약어 정의

| 용어 | 정의 |
| --- | --- |
| **TTS** | Text-to-Speech, 텍스트를 음성으로 변환 |
| **Voice Clone** | ElevenLabs를 이용해 사용자의 음성 샘플로 개인화된 음성을 생성하는 기술 |
| **Emotion Tag** | 메시지에 부여되는 감정 레이블 (예: angry, happy) |
| **Match** | 두 사용자가 서로 Like를 주고받아 매칭된 관계 |
| **RLS** | Row Level Security, Supabase PostgreSQL 행 수준 보안 |
| **SRS** | Software Requirements Specification |
| **JWT** | JSON Web Token, Supabase Auth에서 발급하는 토큰 |

---

### 4. 참고자료

- VoiceMate FE 저장소: `voicemate-FE` (Expo 54, RN 0.81, TS 5.8)
- VoiceMate BE 저장소: `voicemate-BE-v2` (Node 18+, Express 5, Supabase)
- ElevenLabs API Docs — Text to Speech v3 (`eleven_v3`) — 한국어·일본어 멀티링구얼 지원
- Supabase Realtime, Auth, Storage 공식 문서
- Google Gemini API (한국어 ↔ 일본어 번역)
- 대한민국 개인정보보호법(PIPA), 일본 개인정보보호법(APPI)

---

## 전체 개요

### 1. 제품 관점

VoiceMate는 **Expo 기반 크로스 플랫폼 클라이언트**와 **Express + Supabase 백엔드**로 구성된 독립형 모바일 앱이다. 외부 서비스(ElevenLabs, Gemini, Supabase Storage/Realtime)에 의존하여 음성 합성·번역·실시간 통신을 제공한다.

```
┌─────────────┐    HTTPS/JWT    ┌──────────────┐
│ Expo App    │ ───────────────▶│ Express API  │
│ (iOS/AOS)   │ ◀───────────────│ (Node 18+)   │
└─────┬───────┘                 └──────┬───────┘
      │ Realtime (WS)                  │
      ▼                                ▼
┌──────────────────────────────────────────────┐
│ Supabase (Auth / Postgres / Storage / RT)    │
└──────────────────────────────────────────────┘
                      │
                      ▼
          ┌─────────────────────┐
          │ ElevenLabs / Gemini │
          └─────────────────────┘
```

### 2. 제품 기능

| 영역 | 기능 |
| --- | --- |
| 인증 | Email 회원가입/로그인, Google OAuth, 토큰 자동 갱신 |
| 프로필 | 이름·생년월일·성별·국가·언어·관심사·Bio·사진 |
| 음성 등록 | 최대 60초 녹음 → ElevenLabs Voice Clone 생성 |
| 탐색 | 후보자 카드 스와이프(Like/Pass), Gate(음성·Bio 필수) |
| 매칭 | 매치 목록, 마지막 메시지, 언매치 |
| 채팅 | 실시간 메시지 송수신, 자동 번역, **감정 TTS 재생** |
| 설정 | 매칭 선호도, 차단/차단 해제, 신고 |
| 국제화 | 한국어(`ko`) / 일본어(`ja`) UI |
| 번역 | 한국어 ↔ 일본어 자동 번역 (Gemini) |

### 3. 사용자 특성

| 구분 | 설명 |
| --- | --- |
| **Primary User — 한국인** | 20~35세, 일본 문화(애니/여행/J-POP) 또는 일본인과의 교류에 관심이 있는 사용자 |
| **Primary User — 일본인** | 20~35세, 한국 문화(K-POP/드라마/여행) 또는 한국인과의 교류에 관심이 있는 사용자 |
| **Secondary User** | 한일 언어 학습자, 장기 거주·워킹홀리데이 준비자 |
| **기술 수준** | 일반 소셜 앱 사용 경험 보유 (Instagram, Tinder, Pairs 수준) |
| **언어** | 한국어 또는 일본어 원어민/학습자 (영어는 UI 미지원) |

### 4. 제약사항

- **플랫폼**: iOS 15+, Android 8+ (Expo 54 지원 범위)
- **네트워크**: 음성 합성은 ElevenLabs 응답 시간에 의존 (평균 2~6초)
- **파일 크기**: 음성 샘플 업로드 60초 이내
- **TTS 모델**: `eleven_v3` 사용 (한국어·일본어 품질 및 감정 표현 개선)
- **번역**: 한국어(`ko`) ↔ 일본어(`ja`) 양방향 번역만 공식 지원
- **보안**: 모든 API는 HTTPS, Bearer JWT 인증 필수
- **스토리지**: Supabase Storage 공개 버킷(`voice-messages`) 공개 URL 제공
- **Realtime**: Supabase Realtime postgres_changes 기반 (WebSocket)
- **법규**: 한국 개인정보보호법(PIPA) 및 일본 개인정보보호법(APPI) 요건 준수

### 5. 가정 및 의존성

- Supabase 프로젝트(Auth/DB/Storage/Realtime) 단일 인스턴스로 운영
- ElevenLabs API 키는 서버 측에만 존재하며 FE에 노출되지 않음
- 사용자는 앱 최초 실행 시 마이크·사진 권한을 허용한다고 가정
- 번역은 **원문 언어 ≠ 수신자 언어**일 때만 수행 (ko ↔ ja 우선)
- 사용자의 프로필 언어는 `ko` 또는 `ja` 중 하나로 설정된다고 가정
- 감정 태그는 클라이언트가 선택한 값을 신뢰하며 서버는 Zod로 검증

---

## 상세 요구사항

### 1. 사용자 인터페이스

#### 1.1 화면 구성

| 그룹 | 화면 | 주요 요소 |
| --- | --- | --- |
| `(auth)` | `login` | 이메일 입력, Google 로그인 버튼 |
| `setup` | `profile`, `voice` | 프로필 입력 폼, 60초 녹음 UI |
| `(tabs)` | `discover` | 스와이프 카드, Like/Pass |
| `(tabs)` | `matches` | 매치 리스트, 미읽음 배지 |
| `(tabs)` | `profile` | 내 정보 + 음성 샘플 재생 |
| `chat/[matchId]` | 채팅 | 메시지 리스트, **감정 선택 UI**, 오디오 플레이어 |
| `settings` | `preferences`, `blocked` | 선호도, 차단 목록 |

#### 1.2 채팅 화면 신규 UI (감정 선택)

- 입력창 상단 또는 전송 버튼 옆에 **감정 셀렉터(Chip/Segmented)** 배치
- 옵션: `neutral`, `happy`, `sad`, `angry`, `excited`, `calm`, `romantic`
- 기본값: `neutral`, 전송 후 기본값으로 리셋
- 전송된 메시지 버블에는 감정 아이콘 뱃지 표시 (상대/본인 모두)

#### 1.3 공통 UX 원칙

- 라이트 테마 고정, Pretendard 폰트
- 로딩·실패·빈 상태에 대한 명확한 피드백 제공
- 오디오 실패 시 "재시도" 버튼 노출 (`POST /api/matches/:messageId/retry`)

---

### 2. 기능 흐름도

#### 2.1 온보딩 흐름

```
앱 실행 → 토큰 확인
 ├─ 없음 → (auth)/login
 └─ 있음 → 프로필 조회
           ├─ 미완성 → setup/profile → setup/voice → (tabs)/discover
           └─ 완성 → (tabs)/discover
```

#### 2.2 감정 기반 메시지 전송 흐름

```
[FE] 사용자: 텍스트 입력 + 감정 선택(angry)
  │
  ▼
POST /api/matches/{matchId}/messages
  body: { text: "왜 이제야 연락해?", emotion: "angry" }
  // 예: 한국인 → 일본인 수신자 (ko → ja 번역 후 TTS)
  │
  ▼
[BE] 1) Zod 검증 (text, emotion enum)
    2) messages INSERT (emotion 포함, audio_status='processing')
    3) 201 Created 즉시 응답 (emotion 필드 포함)
  │
  ├──── 비동기 (processMessageAudio) ────┐
  │                                       │
  │ 4) 필요 시 Gemini 번역                │
  │ 5) 태그 prefix 부착: "[angry] ..."    │
  │ 6) ElevenLabs eleven_v3 호출          │
  │    voice_settings.stability = 0.3~0.5 │
  │ 7) Supabase Storage 업로드            │
  │ 8) audio_url, audio_status='ready' UPDATE
  │                                       │
  ▼                                       ▼
[FE] Realtime UPDATE 수신 → AudioPlayer 갱신
```

#### 2.3 오디오 실패 시 재시도

```
audio_status='failed' → 버블에 [재시도] 버튼 노출
  → POST /api/matches/{messageId}/retry
  → BE: processMessageAudio 재실행 (저장된 emotion 재사용)
```

---

### 3. 기능 요구사항

#### FR-01. 인증

| ID | 요구사항 | 우선순위 |
| --- | --- | --- |
| FR-01-01 | 이메일/비밀번호 회원가입 및 로그인 | High |
| FR-01-02 | Google OAuth 로그인 | High |
| FR-01-03 | `access_token` 만료 시 `refresh_token`으로 자동 갱신 | High |
| FR-01-04 | 토큰은 `expo-secure-store`에 안전 저장 | High |

#### FR-02. 프로필 & 음성

| ID | 요구사항 |
| --- | --- |
| FR-02-01 | 이름·생년월일·성별·국가·언어·관심사·Bio 입력/수정 |
| FR-02-02 | 사진 다중 업로드 및 삭제 |
| FR-02-03 | 최대 60초 음성 샘플 녹음 및 ElevenLabs Voice Clone 생성 |
| FR-02-04 | Voice Clone 상태 폴링 (`pending`/`processing`/`ready`/`failed`) |
| FR-02-05 | Discover 진입 전 Voice Clone & Bio 완료 Gate |

#### FR-03. 탐색 & 매칭

| ID | 요구사항 |
| --- | --- |
| FR-03-01 | 매칭 선호도(나이·성별·언어) 기반 후보자 추천 |
| FR-03-02 | 스와이프(Like/Pass) API 호출 및 매치 생성 |
| FR-03-03 | 매치 목록 페이지네이션, 마지막 메시지/미읽음 개수 제공 |
| FR-03-04 | 언매치 시 연관 메시지 즉시 접근 차단 |

#### FR-04. 메시지 (감정 TTS 포함)

| ID | 요구사항 |
| --- | --- |
| FR-04-01 | `GET /api/matches/{matchId}/messages` 페이지네이션 조회 |
| FR-04-02 | `POST /api/matches/{matchId}/messages` 메시지 전송 — 요청 바디에 `emotion` 필드 포함 |
| FR-04-03 | **Zod 스키마**: `emotion ∈ {neutral, happy, sad, angry, excited, calm, romantic}`, optional, 기본값 `neutral` |
| FR-04-04 | 응답에 `emotion` 필드 포함 (요청값 그대로 반환) |
| FR-04-05 | 원문 언어 ≠ 수신자 언어이면 Gemini로 번역 후 TTS 합성 (ko ↔ ja 우선 지원) |
| FR-04-06 | TTS 입력 텍스트 앞에 **감정 태그 prefix** 부착: `"[angry] 왜 이제야 연락해?"` |
| FR-04-07 | ElevenLabs 호출 시 `modelId: 'eleven_v3'` 사용 |
| FR-04-08 | `voice_settings.stability`는 감정 반영 위해 **0.3~0.5 범위**로 설정 |
| FR-04-09 | `audio_status` 는 `pending` → `processing` → `ready`/`failed` 로 전이 |
| FR-04-10 | 오디오 실패 시 `POST /api/matches/{messageId}/retry` 로 재생성 (저장된 `emotion` 재사용) |
| FR-04-11 | `PATCH /api/matches/{matchId}/messages/read` 읽음 처리 |
| FR-04-12 | Supabase Realtime로 INSERT/UPDATE 이벤트 구독 |

##### FR-04 API 명세 — `POST /api/matches/{matchId}/messages`

**Request**

```json
{
  "text": "왜 이제야 연락해?",
  "emotion": "angry"
}
```

**Response — `201 Created`**

```ts
{
  id: string;
  match_id: string;
  sender_id: string;
  original_text: string;
  original_language: string;
  translated_language: string;
  translated_text: string | null;
  audio_url: string | null;
  audio_status: "pending" | "processing" | "ready" | "failed";
  emotion: Emotion | null;        // 신규 필드
  read_at: string | null;
  created_at: string;
}
```

##### FR-04 감정 → 태그 매핑 (TTS 프롬프트)

| emotion | prefix |
| --- | --- |
| `neutral` | (태그 없음) |
| `happy` | `[happy]` |
| `sad` | `[sad]` |
| `angry` | `[angry]` |
| `excited` | `[excited]` |
| `calm` | `[calm]` |
| `romantic` | `[romantic]` |

예) `emotion=angry`, `text="왜 이제야 연락해?"` → TTS 입력 = `"[angry] 왜 이제야 연락해?"`

##### FR-04 DB 스키마 변경

```sql
-- migrations/004_add_emotion_to_messages.sql
ALTER TABLE public.messages
  ADD COLUMN emotion TEXT NULL
  CHECK (emotion IN ('neutral','happy','sad','angry','excited','calm','romantic'));
```

#### FR-05. 차단·신고·선호도

| ID | 요구사항 |
| --- | --- |
| FR-05-01 | 사용자 차단/차단 해제, 차단 목록 조회 |
| FR-05-02 | 사용자 신고 (사유 포함) |
| FR-05-03 | 매칭 선호도(나이 범위·성별·언어) 조회/수정 |

---

### 4. 비기능 요구사항

| 구분 | 요구사항 |
| --- | --- |
| **성능** | 메시지 전송 즉시 응답 P95 ≤ 500ms, TTS 합성 완료 평균 ≤ 6초 |
| **가용성** | Supabase / ElevenLabs 장애 시 `audio_status='failed'` 로 안전 저장 및 재시도 제공 |
| **보안** | 모든 통신 HTTPS, JWT Bearer 인증, Supabase RLS 적용, 토큰 Secure Store 저장 |
| **확장성** | 감정 enum은 CHECK 제약으로 관리해 신규 감정 추가 용이 |
| **호환성** | iOS 15+, Android 8+ |
| **국제화** | 한국어(`ko`)/일본어(`ja`) UI 완전 지원, 신규 문자열은 `i18n/locales/ko.ts`, `i18n/locales/ja.ts` 에 반드시 동시 등록 |
| **현지화(L10n)** | 날짜/시간은 각 로케일 형식(`YYYY.MM.DD` / `YYYY年M月D日`), 이름 표기·성별 라벨은 현지 관용 표현 사용 |
| **접근성** | 음성 재생 실패·처리 중 상태를 시각적으로 구분 |
| **로깅/관측** | BE 비동기 오디오 처리 실패 시 `console.error` + `audio_status='failed'` 기록 |

---

## 산출물

| 산출물 | 설명 |
| --- | --- |
| **FE 빌드** | Expo EAS Build (iOS/Android) |
| **BE 배포 아티팩트** | Node.js 서버 (Dockerfile or 호스팅 플랫폼) |
| **DB 마이그레이션** | `004_add_emotion_to_messages.sql` |
| **API 문서** | Swagger UI (`/api-docs`) — `emotion` 필드 반영 |
| **FE 타입 업데이트** | `src/types/index.ts` `Message.emotion`, `Emotion` enum 추가 |
| **서비스 레이어 업데이트** | `src/services/messages.ts` `sendMessage({ text, emotion })` |
| **테스트** | BE Vitest: emotion 유효성 / prefix 조립 / stability 파라미터 검증 |

---

## 부록

### A. Emotion Enum 정의

```ts
export type Emotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'excited'
  | 'calm'
  | 'romantic';
```

### B. ElevenLabs 호출 예시 (eleven_v3 + stability)

```ts
const audioStream = await client.textToSpeech.convert(voiceId, {
  text: `[${emotion}] ${text}`,       // neutral은 prefix 생략
  modelId: 'eleven_v3',               // 변경
  voiceSettings: {
    stability: 0.4,                   // 0.3~0.5 범위 (감정 변동성 증가)
    similarityBoost: 0.8,
  },
});
```

### C. 변경 요약 (v1.0 → v1.1)

| 항목 | Before | After |
| --- | --- | --- |
| TTS 모델 | `eleven_multilingual_v2` | `eleven_v3` |
| 메시지 요청 바디 | `{ text }` | `{ text, emotion? }` |
| 메시지 응답 | emotion 없음 | `emotion: Emotion \| null` 추가 |
| TTS 입력 | 원문 그대로 | `"[<emotion>] <text>"` prefix |
| `voice_settings` | 미지정 (기본값) | `stability: 0.3~0.5` |
| DB | messages 테이블 | `emotion` 컬럼 + CHECK 제약 추가 |

### D. 위험 요소 및 대응

| 위험 | 대응 |
| --- | --- |
| `eleven_v3` 모델 응답 지연/실패 증가 | 비동기 파이프라인 유지, 실패 시 `retry` 제공 |
| 감정 prefix가 다국어 번역 후 발음에 영향 | 번역 **후** prefix 부착하도록 순서 고정 |
| 사용자가 임의 감정값 전송 | Zod enum으로 서버에서 차단 |
| stability 낮춤으로 인한 목소리 왜곡 | 0.3 하한 유지, QA 샘플링 통해 조정 |
| 한→일 번역에서 경어/반말 레벨 불일치 | Gemini 프롬프트에 수신자·관계 컨텍스트 전달, QA로 샘플 검수 |
| 한국어·일본어 고유명사(이름/지명) 오역 | 번역 프롬프트에 고유명사 보존 지시 포함 |
| 한일 시차(UTC+9 동일)로 운영은 단일 TZ이나, 법적 요구사항은 양국 상이 | PIPA/APPI 모두 만족하는 최소 공통 정책 수립 |

### E. 한일(ko ↔ ja) 특화 고려사항

- **로케일 자동 감지**: 기기 로케일이 `ko-*`/`ja-*`가 아닐 경우 기본값 `ko` 적용 + 설정에서 변경 가능
- **폰트**:
  - 한국어: Pretendard (현재 사용 중)
  - 일본어: Noto Sans JP 등 CJK 가변 폰트 추가 검토 (Pretendard JP도 옵션)
- **입력 UX**: 일본어 IME(히라가나/카타카나/한자 변환) 입력 중 `onSubmitEditing` 조기 발동 방지
- **국가/국적 선택지**: `대한민국(🇰🇷)`, `일본(🇯🇵)` 을 기본 상단 노출
- **번역 톤**:
  - 초기 대화: 기본적으로 정중체(존댓말 / 丁寧語) 사용
  - 감정 `angry`, `excited` 등 반말이 자연스러운 경우에도 기본 정중체 유지, 추후 relationship level 도입 시 재검토
- **매칭 선호도**: 언어 필터 기본값은 **상대 언어(교차 매칭 유도)** — 한국인은 일본어 사용자 우선, 일본인은 한국어 사용자 우선
- **신고/운영**: 신고 사유 및 운영 응답 템플릿은 한/일 양측 모두 작성

---

> 본 SRS는 현재 구현(FE/BE) 상태 분석을 기반으로 작성되었으며, 감정 기반 TTS 기능이 반영된 **v1.1** 기준이다.
