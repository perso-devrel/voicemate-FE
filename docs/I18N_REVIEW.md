# I18N_REVIEW.md

> 2026-04-18 Phase 3 #20 · `ko.ts` / `en.ts` 자연스러움 검수.
> **본 문서는 제안 모음**이며, 실제 번역 교체는 별도 이슈(Phase 6)에서 단건씩 수행한다.

## 범례

| 상태 | 의미 |
|------|------|
| 🟢 OK | 현재 문구가 자연스럽다. 변경 불필요 |
| 🟡 minor | 다듬을 여지는 있으나 치명적이지 않음 |
| 🔴 review | 원문 제공자/네이티브 검수 필요 |

## 네임스페이스별 검수

### `common`
- 🟢 전반적으로 표준 표현.

### `auth`
- 🟢 `toggleToLogin` / `toggleToSignup`: 두 언어 모두 관용적.
- 🟡 `enterEmailAndPassword` (ko: "이메일과 비밀번호를 입력해주세요"):
  영어 "Please enter email and password"는 article이 빠진 명령형 — 자연스러우나 "Please enter your email and password"가 더 매끄러움. 변경 제안.

### `discover`
- 🟢 `match: "매치!"` / `'Match!'` — 표준 데이팅 앱 어휘.
- 🟡 `noMoreProfiles`:
  - ko: "더 이상 프로필이 없습니다" → "지금은 더 볼 프로필이 없어요" 더 친근.
  - en: "No more profiles" → "No more profiles for now" 제안.

### `matches`
- 🟢 `noMatches` / `startSwiping` / `startConversation`: 의도 명확.
- 🟡 `goToDiscover` (이번 PR 추가):
  - ko: "지금 둘러보기" — 좋음.
  - en: "Start discovering" — OK. 대안 "Discover profiles" 고려.

### `profile`
- 🟢 사진/로그아웃 Alert 문구가 iOS HIG + Android Material 패턴에 부합.
- 🟡 `registerVoicePrompt` (ko: "나의 목소리를 등록하세요!"):
  - "나만의 목소리를 등록해보세요"가 자연스러움.
- 🟡 `photoSizeLimit` — 영어 "Photo must be under 5MB." 간결하지만 "Photos must be under 5 MB." (단위 공백) 더 표준.

### `chat`
- 🟢 매우 짧은 세 키, 모두 OK.

### `setupProfile`
- 🟢 대부분 자연스러움.
- 🟡 `bioPlaceholder`:
  - ko: "자신에 대해 소개해주세요" — OK.
  - en: "Tell about yourself" → "Tell us about yourself" 권장 (주어 생략이 부자연스러움).

### `setupVoice`
- 🟢 스크립트 내용(ko/en 둘 다)은 매우 자연스럽게 작성됨. 변경 불필요.
- 🟡 `recordingGuide` (en: "For a natural voice clone, we recommend at least 30 seconds; minimum is 10 seconds."):
  문법은 정확하나 반 문장 두 개의 세미콜론 연결이 공식적으로 느껴짐. "We recommend at least 30 seconds of audio for a natural voice clone (minimum 10 seconds)." 제안.

### `preferences`
- 🟢 직관적.
- 🔴 `languagePlaceholder` / `languageLengthError`:
  현재 UI는 Chip 기반 multi-select이므로 사용자가 language code를 **직접 입력하지 않는다**. 이 두 키는 **사용되지 않을 가능성**이 큼. Phase 6에서 grep 결과를 근거로 제거 여부 결정.

### `blocked`
- 🟢 직관적.

### `audioPlayer`
- 🟡 `stop: "정지"` — 일반 오디오 UX에서는 "일시정지"가 더 적합할 수 있음 (재생 위치 유지 여부에 따라). 현 구현은 `player.remove()` 계열이 아니라 단순 재생 토글이면 "일시정지" 권장.

### `tabs`
- 🟢 탭 라벨 짧고 명확.

## 사용하지 않는(의심) 키

`t('...')` 호출 확인 결과 아래 4키는 소스 어디에도 참조되지 않는다 (grep `src/**/*.{ts,tsx}`에서 0건):

| 키 | 처리 방향 |
|----|-----------|
| `preferences.languagePlaceholder` | ✅ 제거 완료 (Phase 6 #59) |
| `preferences.languageLengthError` | ✅ 제거 완료 (Phase 6 #59) |
| `preferences.addLanguage` | ✅ 제거 완료 (Phase 6 #59) |
| `setupProfile.languagePlaceholder` | ✅ 제거 완료 (Phase 6 #59) |

> 제거 후 `parity.test.ts` 통과 확인. 향후 신규 키 추가 시에도 ko/en 대칭을 유지할 것.

## 변경 이력

| 날짜 | 내용 | 담당 |
|------|------|------|
| 2026-04-18 | 1차 검수 문서화 | Ralph Loop |
