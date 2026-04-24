# 메시지 감정 옵션 (Emotion-Aware TTS) 설계

> 텍스트 메시지 전송 시 사용자가 감정 옵션을 선택하면, BE가 해당 감정 키워드를 ElevenLabs TTS prefix로 부착하여 감정이 반영된 음성으로 생성한다.

> 참조: `docs/voicemate-srs.md` FR-04-02 ~ FR-04-10. SRS에 emotion enum과 prefix 규약이 이미 정의되어 있으므로, FE는 그 계약에 맞춘 UI/타입/서비스만 책임진다.

## 1. 목표

채팅 화면에서 사용자는 텍스트 입력 후 전송 직전에 감정(neutral/happy/sad/angry/excited/calm/romantic) 중 하나를 선택할 수 있어야 한다. 선택된 감정은 메시지와 함께 BE로 전송되어 TTS 합성 시 감정이 반영된 목소리로 변환된다. 기본값은 `neutral`(감정 없음)이며, 평소 흐름과 충돌하지 않아야 한다.

## 2. 진입점 / 종료점

- **진입**: 채팅 화면(`/chat/[matchId]`)의 입력 바 — 입력창 좌측의 "감정" 토글 버튼 (이모지 + 라벨)
- **선택**: 토글을 누르면 입력 바 위쪽으로 감정 칩(chip) 행이 펼쳐짐. 칩 1개 선택 후 자동 닫힘
- **전송**: 평소처럼 send 버튼을 누르면 `text` + `emotion`이 함께 전송됨
- **완료**: 전송 후 감정은 `neutral`로 초기화 (메시지마다 매번 의식적으로 선택하도록)

## 3. 화면 트리 (expo-router)

신규 화면 없음. 기존 화면 수정 + 신규 컴포넌트 1개.

- `src/app/(main)/chat/[matchId].tsx` (수정) — 입력 바 영역에 EmotionPicker 통합
- `src/components/chat/EmotionPicker.tsx` (신규) — 감정 토글 + 칩 행 UI

## 4. 데이터 흐름

```
[사용자] 입력창에 텍스트 입력
   ↓
[사용자] 입력 바 좌측 "감정" 버튼 탭 → EmotionPicker 펼침
   ↓
[사용자] 칩 선택 → 로컬 state(selectedEmotion: Emotion) 업데이트, picker 자동 닫힘
   ↓
[사용자] send 버튼 탭
   ↓
ChatScreen.handleSend(text, emotion)
   ↓
useChat.send(text, emotion)
   ↓
messageService.sendMessage(matchId, text, emotion)
   ↓
[BE] POST /api/matches/{matchId}/messages  body: { text, emotion }
   ↓
[BE] Zod 검증 → INSERT (emotion 컬럼) → 201 Message(emotion 포함)
   ↓
[BE 비동기] processMessageAudio: TTS 입력 = "[<emotion>] <text>", stability 0.3~0.5
   ↓
[BE] messages UPDATE: audio_status='ready', audio_url 설정
   ↓
[Realtime UPDATE] → useChat → setMessages → ChatBubble 재렌더 (오디오 재생 가능)
```

## 5. 상태 관리

| 상태 | 위치 | 이유 |
| --- | --- | --- |
| `selectedEmotion: Emotion` | `ChatScreen` 컴포넌트 local `useState` | 단일 화면 내부, 전송 후 초기화. 부모가 입력창 텍스트와 함께 들고 있으면 send 호출 시 묶어서 전달하기 쉬움 |
| `pickerOpen: boolean` | `ChatScreen` 컴포넌트 local `useState` | 토글 상태. 외부 공유 불필요 |
| 전송 중 `sending` | 기존 그대로 | - |
| 메시지 목록 / Realtime 결과 | 기존 `useChat` | `Message.emotion` 필드 추가만 처리 |

> 가정: 감정 선택 상태는 매치별로 persist하지 않는다. 매번 "neutral"로 시작 — 사용자가 의도적으로 톤을 선택하도록 유도.

## 6. 영향 파일

### 신규
- `src/components/chat/EmotionPicker.tsx` — 감정 토글 버튼 + 펼쳐지는 칩 행 컴포넌트. props: `{ value: Emotion; onChange: (e: Emotion) => void; open: boolean; onToggle: () => void; }`
- `src/constants/emotions.ts` — `EMOTIONS` 배열(순서·메타데이터 한 곳에서 관리). 각 entry: `{ value: Emotion; emoji: string; labelKey: string; color?: string; }`. neutral/happy/sad/angry/excited/calm/romantic.

### 수정
- `src/types/index.ts`
  - `export type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'calm' | 'romantic';`
  - `Message` 인터페이스에 `emotion: Emotion | null` 추가
  - `SendMessageRequest`에 `emotion?: Emotion` 추가
- `src/services/messages.ts`
  - `sendMessage(matchId, text, emotion?)` 시그니처 확장. body는 `{ text, ...(emotion && emotion !== 'neutral' ? { emotion } : {}) }` 형태로 — neutral일 때는 omit하여 BE 기본값에 위임 (또는 항상 emotion 포함도 가능, BE가 default 'neutral' 처리하므로 동등). 결정: **항상 포함**하여 명시성을 확보. `{ text, emotion: emotion ?? 'neutral' }`
- `src/hooks/useChat.ts`
  - `send(text: string, emotion?: Emotion)` 시그니처 확장. 그대로 `messageService.sendMessage`에 전달
- `src/app/(main)/chat/[matchId].tsx`
  - `selectedEmotion`, `pickerOpen` state 추가
  - 입력 바 좌측에 `<EmotionPicker />` 마운트, 펼침 상태일 때 입력 바 위쪽으로 칩 행 표시
  - `handleSend`에서 `send(trimmed, selectedEmotion)` 호출 후 `setSelectedEmotion('neutral')`로 리셋
  - 입력창 placeholder 옆 또는 send 버튼 옆에 현재 선택된 감정의 작은 배지(이모지) 표시
- `src/components/chat/ChatBubble.tsx` (선택적, 가벼운 변경)
  - 자기 메시지 버블 footer에 emotion이 neutral이 아니면 작은 이모지 배지 표시 — "내가 화난 톤으로 보냈음"을 시각적으로 확인. **TBD**: 디자인 검토 시점에 결정. 1차 구현 범위에서 제외 가능.
- `src/i18n/locales/ko.ts`, `src/i18n/locales/en.ts`
  - `chat.emotion`: 토글 라벨 ("감정" / "Tone")
  - `chat.emotionPickerTitle`: 칩 행 위 작은 헤더 ("어떤 톤으로 보낼까요?" / "Send with what tone?")
  - `chat.emotions.neutral` ~ `chat.emotions.romantic`: 각 감정 라벨 (평범/기쁨/슬픔/화남/신남/차분/로맨틱 / Neutral/Happy/Sad/Angry/Excited/Calm/Romantic)

### 변경 없음 (확인만)
- `src/services/realtime.ts` — Realtime payload는 BE의 messages row를 그대로 전달하므로 Message 타입 확장만으로 OK
- `src/hooks/useChat.ts` retryAudio — BE가 저장된 emotion을 재사용하므로 FE 변경 불필요

## 7. BE 연동 필요성

> Analyzer 결과 대기 — 아래는 SRS 문서 기반 잠정 가정.

| 항목 | 잠정 사양 (SRS 기준) | Analyzer 확인 필요 |
| --- | --- | --- |
| `POST /api/matches/{matchId}/messages` body schema | `{ text: string, emotion?: 'neutral'\|'happy'\|'sad'\|'angry'\|'excited'\|'calm'\|'romantic' }`, default `neutral` | 실제 Zod 스키마 / 실제 라우트 코드 확인 |
| 응답 `Message` shape | `emotion: Emotion \| null` 추가됨 | 실제 응답에 포함되는지 |
| Realtime payload | INSERT/UPDATE 모두 `emotion` 포함 | Supabase select 컬럼 확인 |
| DB 마이그레이션 | `004_add_emotion_to_messages.sql` 적용 여부 | 적용 완료인지 / 컬럼 default 값 |
| TTS prefix 처리 | BE가 `"[<emotion>] <text>"` 조립, neutral은 prefix 생략 | FE는 raw text만 보내면 됨 (FE에서 prefix 부착 절대 금지) |
| `retry` 시 emotion 재사용 | BE가 row의 emotion을 읽어 재합성 | 추가 파라미터 불필요 확인 |

> **BE 수정 필요성 추정**: SRS는 "FR-04-02 ~ FR-04-10"으로 구체화되어 있으나 실제 구현 여부는 Analyzer 결과 대기. 미구현 시 Implementer가 BE 변경분 PR이 선행되어야 함.

## 8. 의사결정 / 가정

- **감정 enum**: SRS 정의 그대로 7종 (`neutral/happy/sad/angry/excited/calm/romantic`). FE 임의 변경 금지.
- **UI 패턴**: 입력 바 좌측 토글 버튼 → 입력 바 위쪽 펼침 칩 행. Bottom sheet 대신 in-place 패널을 선택한 이유:
  - 키보드를 닫지 않고 바로 선택 가능 (UX)
  - 단일 행에 7개 칩이 화면 폭 내 들어감
  - 모달 전환 비용 없음
- **칩 디자인**: `[이모지] 라벨` 형식, 선택 시 primary 색 배경. neutral도 항상 표시 (선택 해제 = neutral 재선택).
- **이모지 매핑** (가정, 디자인 검토에서 조정 가능):
  - neutral: 😐, happy: 😊, sad: 😢, angry: 😠, excited: 🤩, calm: 😌, romantic: 🥰
- **기본값**: `neutral`. 토글이 닫혀 있으면 토글 버튼은 일반 회색, 다른 감정 선택 시 해당 이모지 + 강조 색.
- **전송 후 리셋**: `neutral`로 자동 리셋. 같은 톤을 연달아 보낼 때 매번 다시 선택해야 한다는 부담은 있으나, 의도치 않은 톤 송출 방지가 더 중요. (TBD: 사용자 피드백 후 "마지막 선택 유지" 모드 검토)
- **i18n**: 라벨은 모두 i18n 키. 이모지는 키 없이 직접 사용 (locale 무관).
- **Message.emotion 시각화 in 버블**: 1차 구현 범위에서는 옵션. design-review에서 결정.
- **retryAudio**: FE는 변경 없음 — BE가 저장된 emotion 재사용.
- **Optimistic UI**: 현재 useChat.send는 응답 후 messages에 append. 그대로 유지 (감정 도입으로 인한 변경 없음).

## 9. 주의 / 충돌 지점

- **입력 바 레이아웃**: 현재 `inputBar`는 `[입력창][send 버튼]` 2-element flex row. 좌측에 토글을 추가하면 입력창 폭이 줄어든다. 토글은 아이콘 only 또는 매우 컴팩트하게 (44x44 이내) 디자인 필요. 입력창 `flex: 1`이 자동 흡수.
- **펼침 칩 행의 위치**: `inputBar`는 `position: 'absolute'`. 칩 행은 inputBar 위쪽에 띄워야 하므로 inputBar 컨테이너의 자식이거나 같은 absolute 컨테이너로 묶어 키보드/safeArea bottom 계산에 함께 포함되어야 한다. listBottomPad 계산도 칩 행 펼침 시 확장 필요.
- **키보드 가림 방지**: 칩 행은 입력 바 바로 위에 있어야 하며, `keyboardOpen`일 때 키보드 위에 떠 있어야 한다. 현재 inputBar의 `bottom: kbHeight + insets.bottom` 계산을 그대로 활용.
- **Backwards-compat**: 기존 메시지(`emotion: null`)와 신규 메시지가 섞여 있어도 ChatBubble은 emotion 미사용 분기에서는 동일 렌더. Realtime payload에 emotion이 없을 가능성도 있으므로 타입을 `Emotion | null | undefined` 모두 허용하도록 (또는 `?: Emotion | null`).
- **send 함수 시그니처 변경**: `useChat.send(text)` → `useChat.send(text, emotion?)`. 호출처는 ChatScreen 1곳뿐이므로 영향 작음.
- **테스트**: messages.ts 호출 형태가 바뀌므로 `services/api.test.ts` 영향 확인. messages 전송 테스트가 있다면 emotion 파라미터 추가 케이스 필요.
- **실시간 retryAudio API path**: `messages.ts`의 `retryAudio`가 `/api/matches/${messageId}/retry`로 되어 있는데 이는 SRS 표기와 동일하나 path가 `matches`로 시작하는 것이 의도적인지 Analyzer가 확인 필요 (이번 변경과 직접 관련은 없음, 발견된 잠재 이슈로 기록만).
