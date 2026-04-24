# 메시지 감정 옵션 (Emotion-Aware TTS) FE 구현 요약

> 입력: `_workspace/01_analyzer_spec.md` (BE 사실 우선), `_workspace/00_planner_design.md` (UX 가이드)
> 작업일: 2026-04-23

## 결정 요약 (Planner ↔ Analyzer 차이 해결)

- **Emotion enum**: Planner가 SRS 추측으로 적은 7종(`neutral|happy|sad|angry|excited|calm|romantic`)이 아닌 **Analyzer가 BE 코드(`voicemate-BE-v2/src/schemas/message.ts`)에서 직접 추출한 8종을 채택**.
  - `neutral | happy | sad | angry | surprised | excited | whispering | laughing`
- BE는 이미 `emotion` 파라미터를 완전히 지원 → **FE 작업만으로 완결**.

## 생성/수정된 파일

| 파일 경로 | 작업 | 설명 |
|---|---|---|
| `src/types/index.ts` | 수정 | `Emotion` union(8종), `AudioStatus` 별칭, `Message.emotion: Emotion \| null`, `SendMessageRequest.emotion?` 추가 |
| `src/constants/emotions.ts` | 신규 | 8개 emotion 메타(emoji + i18n key), `EMOTION_OPTIONS` 배열, `getEmotionMeta()`, `DEFAULT_EMOTION` 상수 |
| `src/services/messages.ts` | 수정 | `sendMessage(matchId, text, emotion?)` 시그니처. neutral은 body에서 omit하여 BE null 정규화에 위임 |
| `src/hooks/useChat.ts` | 수정 | `send(text, emotion?)` 시그니처 확장. 그대로 service에 전달 |
| `src/components/chat/EmotionPicker.tsx` | 신규 | (1) 입력바 좌측 토글 컴포넌트 `EmotionPicker`, (2) 위쪽으로 펼치는 칩 행 `EmotionChipRow`, (3) `EMOTION_PICKER_ROW_HEIGHT` 상수 export |
| `src/app/(main)/chat/[matchId].tsx` | 수정 | `selectedEmotion` / `emotionPickerOpen` state 추가. inputBar를 `inputDock`으로 감싸 칩 행을 위쪽에 마운트. 전송 후 emotion `'neutral'` 리셋. `listBottomPad` 계산에 펼침 시 칩 행 높이 가산 |
| `src/components/chat/ChatBubble.tsx` | 수정 | `message.emotion`이 null/`neutral`이 아니면 말풍선 모서리에 작은 emoji 배지 (mine: 좌상단, theirs: 우상단) |
| `src/i18n/locales/ko.ts` | 수정 | `chat.emotion.{neutral|happy|sad|angry|surprised|excited|whispering|laughing}` 8개 한글 라벨 + `chat.emotionPicker.toggleLabel` |
| `src/i18n/locales/en.ts` | 수정 | 동일 키, 영문 라벨 + a11y 라벨 |

## API 연동 매핑

| 엔드포인트 | 서비스 함수 | 훅 | 호출처 |
|---|---|---|---|
| `POST /api/matches/:matchId/messages` (body: `{ text, emotion? }`) | `messageService.sendMessage(matchId, text, emotion?)` | `useChat.send(text, emotion?)` | `ChatScreen.handleSend` |
| `POST /api/matches/:messageId/retry` (감정 재선택 불필요 — BE가 저장된 emotion 재사용) | `messageService.retryAudio(messageId)` | `useChat.retryAudio` | `ChatBubble` 내 retry 버튼 |

Realtime 구독(`subscribeToMessages`)은 변경 없음. Supabase 행에 추가된 `emotion` 컬럼이 payload에 자동 포함되어 `Message` 타입 확장만으로 처리됨.

## UI 결정 사항

- **토글 위치**: 입력 바 좌측. 기본(neutral)일 땐 회색 outline + 아이콘(`happy-outline`), 다른 감정 선택 시 primary 강조 배경 + 선택된 emoji 표시.
- **칩 행**: 입력바 위쪽으로 in-place 펼침(bottom sheet 회피). 8개라서 화면 폭에 따라 가로 스크롤 가능하도록 `ScrollView horizontal` 사용. `keyboardShouldPersistTaps="always"`로 키보드 유지.
- **선택 시각화**: 선택된 칩은 primary gradient 배경 + 흰색 라벨, 비선택은 카드 배경 + 1px borderSoft.
- **전송 후 리셋**: `'neutral'`로 자동 리셋 + picker 닫힘. 매 메시지마다 의식적으로 톤 선택 (의도치 않은 톤 송출 방지).
- **레이아웃 보정**: `listBottomPad`에 `EMOTION_PICKER_ROW_HEIGHT(56)` 가산하여 펼침 시 마지막 메시지가 칩 행에 가려지지 않게 함.
- **버블 배지**: emoji 1글자 + 22px 원형 배경. 보낸 사람 기준으로 좌/우 모서리 위쪽에 살짝 걸치게(absolute) 배치. neutral/null이면 미표시.

## 비즈니스 규칙 준수 확인

- [x] failed 메시지 retry 시 emotion 재선택 UI 없음 (BE가 저장 emotion 재사용)
- [x] 송신 직후 `audio_status: 'processing'` 표시 → Realtime UPDATE로 ready 전이 (기존 로직 변경 없음)
- [x] `elevenlabs_voice_id` 없는 발신자의 `audio_status: 'pending'`은 BE 처리, FE는 ChatBubble에서 표시만
- [x] text 1000자 제한 유지 (`maxLength={1000}`)
- [x] emotion enum 외 값 차단을 TS union으로 강제

## 검증

- `npx tsc --noEmit` 통과 (EXIT=0).
- 기존 컴포넌트 패턴 준수: `colors`/`gradients`/`radii`/`shadows`/`fonts` 토큰 사용. Pretendard 폰트 패밀리 사용.
- i18n: 한/영 동일 키.

## 미구현/TODO

- 없음. 사양 범위 내 모든 항목 구현.
- (참고) 하위호환: 기존 메시지에 `emotion` 필드가 없을 가능성에 대비해 `Message.emotion: Emotion | null`로 정의했고, `ChatBubble`은 truthy 체크 후 표시하므로 안전.

---

# 후속 개선 (2026-04-23)

## 작업 범위

Reviewer/Designer 보고서 후속 처리 — D1(dead code 제거), D3(en 라벨 정렬).

## 수정된 파일

| 파일 경로 | 작업 | 설명 |
|---|---|---|
| `src/components/chat/EmotionPicker.tsx` | 수정 | `EmotionPickerProps`에서 미사용 `onChange` prop 제거. 함수 시그니처 destructuring에서도 제거. (selection은 `EmotionChipRow.onSelect`가 단독 담당) |
| `src/app/(main)/chat/[matchId].tsx` | 수정 | `<EmotionPicker>` 호출부에서 `onChange={handleEmotionSelect}` 라인 제거. `handleEmotionSelect`는 `<EmotionChipRow onSelect>`에서 여전히 사용되므로 유지 |
| `src/i18n/locales/en.ts` | 수정 | `chat.emotion.neutral` 라벨 `"Default"` → `"Neutral"` (다른 7개 감정 명사와 카테고리 통일) |

## 주요 결정 사항

- **D1 (dead code)**: `EmotionPicker`는 토글 버튼만 렌더링하며 selection 이벤트를 발생시키지 않는다. `onChange` prop은 정의되어 있었으나 컴포넌트 내부에서 호출되지 않아 dead code였음. props 시그니처에서 완전히 제거하여 호출부 오해(toggle 클릭 시 onChange가 불리리라는 기대) 방지.
- **D3 (en 라벨)**: 영어 UI에서 `neutral`만 형용/명사 카테고리가 어긋남(`Default` vs `Happy/Sad/Angry/...`). `Neutral`로 통일하여 일관성 확보. 한국어(`ko.ts`)는 본 작업 범위 외로 `"기본"` 그대로 유지.

## 검증

- `npx tsc --noEmit` 통과 (EXIT=0, 무출력).
- `handleEmotionSelect`는 `EmotionChipRow.onSelect`에서 여전히 사용되므로 미사용 변수 경고 없음.
- 한국어 locale은 변경 없음 (지시 사항 준수).
