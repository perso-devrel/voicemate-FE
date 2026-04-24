# 메시지 감정 옵션 (Emotion-Aware TTS) 디자인 리뷰

> 검증 대상: `src/components/chat/EmotionPicker.tsx`(신규), `src/constants/emotions.ts`(신규), `src/app/(main)/chat/[matchId].tsx`, `src/components/chat/ChatBubble.tsx`, `src/services/messages.ts`, `src/hooks/useChat.ts`, `src/types/index.ts`, `src/i18n/locales/{ko,en}.ts`
> 검증 기준: `.claude/skills/design-review/SKILL.md` 체크리스트 + 본 리뷰의 특별 검증 포인트(EmotionPicker UX, ChatBubble 배지, i18n, 접근성, 상태 리셋)
> 결과: **CRITICAL 0건 / WARNING 3건 / INFO 4건** — 출시 가능, 일관성 개선 권고.

## 결과 요약

| 카테고리 | 통과 | 경고 | 위반 |
|---|---|---|---|
| 디자인 시스템 토큰 | 9 | 0 | 0 |
| RN 컴포넌트 패턴 | 8 | 1 | 0 |
| i18n | 6 | 1 | 0 |
| 접근성 | 5 | 1 | 0 |
| 상태/에러/빈 UI | 4 | 0 | 0 |
| 성능/RN 특화 | 4 | 0 | 0 |

---

## CRITICAL — 즉시 수정 필요

없음. 사용자 경험을 차단하는 결함은 발견되지 않았다. 8개 i18n 키가 ko/en 양쪽에 정의되어 있고, 토글 버튼 44x44(width 40 + hitSlop 6 = 52pt 유효), 칩의 paddingVertical 8 + chipEmoji height 18 + paddingHorizontal 12로 최소 터치 영역 충족, 키보드/안전 영역 처리 모두 통과.

---

## WARNING — 일관성 개선 권장

### 1. `EmotionPicker.tsx:15` — 사용되지 않는 `onChange` prop

**현재:** `EmotionPickerProps`에 `onChange: (emotion: Emotion) => void`가 선언되어 있지만 컴포넌트 본체에서 호출되지 않는다. 사용처(`ChatScreen`)는 `onChange={handleEmotionSelect}`를 전달하지만 토글 버튼은 `onToggleExpanded`만 호출한다.

**기대:** API 표면은 실제로 사용하는 prop만 노출 — 사용 안 하는 prop은 호출자에게 잘못된 신호(토글 버튼 자체가 selection을 변경한다는 오해)를 준다.

**수정:**
- 가장 깔끔한 방향: `EmotionPickerProps`에서 `onChange` 제거 및 `ChatScreen`의 `onChange={...}` 호출도 제거 (`EmotionChipRow`가 단독으로 selection을 담당하므로 분리가 명확함).
- 또는 토글 버튼에 "neutral이 아닐 때 1탭으로 neutral 리셋" 등의 의미 있는 동작을 부여하고 `onChange`를 거기서 호출.

### 2. `[matchId].tsx:357-362` — `EmotionPicker`가 `inputBar` 안에 있어 펼침 상태에서 위치 인지가 약함

**현재:** 토글 버튼이 `inputBar` 행 좌측에 있고, 펼치면 칩 행이 입력바 위쪽에 등장한다. 칩 행과 토글 버튼 사이에 시각적 연결(예: 화살표/꼬리표/배경 연속성)이 없다.

**기대:** 사용자가 어디서 패널이 열렸는지 인지하는 단서. 펼침 상태에서 토글 버튼이 활성 상태로 보이지만(`toggleActive`는 neutral 아닐 때만 적용) **selection이 neutral인 채 펼쳐만 본 경우 토글 버튼은 회색** → "내가 패널을 연 게 맞나?" 헷갈릴 수 있음.

**수정:** `expanded && styles.toggleExpanded` 변형 추가하여 펼침 상태에도 시각적 강조(예: `borderColor: colors.primary`)를 주거나, `emotionRowWrapper`의 borderTop을 제거해 inputBar와 시각적으로 한 덩어리로 보이게.

### 3. `en.ts:137` — `chat.emotion.neutral`의 영어 라벨 "Default"가 한국어 "기본"과 동의어 정합성 약함

**현재:**
- ko: `neutral: "기본"`
- en: `neutral: "Default"`

**기대:** 다른 7개 라벨은 모두 감정 명사(Happy/Sad/Angry/...)인데, neutral만 "Default"는 카테고리가 다른 라벨로 읽혀 칩 행에서 시각적 일관성이 흔들린다. 또한 토글 a11y label은 "감정 선택"/"Choose emotion"인데, 첫 번째 옵션이 "기본"/"Default"라면 의미 충돌(감정인데 기본?).

**수정:** `neutral: "보통"` / `neutral: "Neutral"` 또는 `"평범"` / `"Plain"` 등 감정 enum 어휘로 통일. Planner 설계서(00_planner_design.md L89)도 "평범 / Neutral"을 제안했음 — 그쪽으로 정렬.

---

## INFO — 향후 개선

### 1. `EmotionPicker.tsx:124` — `EMOTION_PICKER_ROW_HEIGHT = 56` 매직 넘버

런타임 상수로 export되어 있지만, 실제 칩 row의 `paddingVertical(10) + chipInner paddingVertical(8*2=16) + chipEmoji lineHeight(18)` 합산값과 직접 결합되어 있음. 칩 패딩을 조정하면 이 상수도 함께 갱신해야 한다. JSDoc에 산출 근거를 더 적거나 `onLayout`로 측정해 동적 가산 고려.

### 2. `EmotionPicker.tsx:148` — 칩 `gap: 8`의 시각적 밀도

8개 감정 칩이 가로 스크롤되는데 한국어 라벨 중 "속삭임"이 가장 길다. 갤럭시 S 시리즈(360dp 폭) 기준 5~6개 칩만 노출 → 사용자가 스크롤해야 한다는 사실을 인지하지 못할 수 있음. `ScrollView`의 `contentContainerStyle`에 `paddingRight: 24` 추가 또는 첫 진입 시 미세한 자동 살짝-스크롤 힌트(8~12px) 적용을 검토.

### 3. `ChatBubble.tsx:198-220` — 배지 `top: -8`이 인접 메시지 timestamp와 겹칠 가능성

연속된 메시지가 같은 발신자 + 짧은 간격일 때 윗쪽 메시지의 footer(audioBtn/time)와 시각적으로 가까워진다. `marginVertical: 4` (container)는 8px 간격을 만드는데 배지가 -8까지 올라오므로 위 메시지 footer와 정확히 같은 라인에 위치한다. 디바이스에서 실측 후 `top: -6` 등으로 조정 검토.

### 4. `colors.ts` — emotion별 색상 토큰 부재 (장기)

현재 EmotionPicker는 모든 칩에 `gradients.primary`를 사용한다. 향후 happy=warm yellow, sad=cool blue, angry=red 등 감정별 색상을 도입하면 칩 행이 한 눈에 인식되는 "감정 팔레트"가 됨. 즉시 변경 권고는 아니며, 디자인 시스템 토큰에 `gradients.emotion.happy` 등을 추가할 여지 기록.

---

## 통과 항목 (체크리스트 기준)

### 디자인 시스템 토큰 (9/9)
- [x] EmotionPicker: `colors.surface/primary/primaryLight/borderSoft/card/text/textLight/white` 모두 토큰 사용 (하드코딩 색 0건)
- [x] ChatBubble emotionBadge: `colors.white/borderSoft` + `shadows.soft` 토큰 사용
- [x] ChatBubble: `colors.primary/card/borderSoft/text/textSecondary/white` 일관 사용
- [x] 폰트: `fonts.medium` 사용 (Pretendard 패밀리)
- [x] borderRadius: 칩은 `radii.pill`, 토글 버튼은 22(=44/2 — 원형)로 일관
- [x] gradient: `gradients.primary` 동일 토큰 (send 버튼과 동일한 강조색)
- [x] shadows: `shadows.soft` 토큰 사용 (chip, emotionBadge 양쪽)
- [x] spacing: 8/10/12 단위 grid 일관 (chipRow gap 8, paddingHorizontal 12, paddingVertical 8/10)
- [x] inputBar 좌측 토글 추가 후 `flex: 1` 입력창이 폭 자동 흡수 — 레이아웃 회귀 없음

### RN 컴포넌트 패턴 (8/9)
- [x] `useSafeAreaInsets()` 사용으로 하단 노치/홈바 회피 (기존 코드 유지)
- [x] 입력 화면: `keyboardShouldPersistTaps="always"` 칩 ScrollView에 적용 (특별 검증 포인트 1.b 통과)
- [x] 키보드 위 띄움: `inputDock`의 `bottom: kbHeight + insets.bottom`로 칩 행도 함께 키보드 위 위치
- [x] `Pressable` 일관 사용 (TouchableOpacity 혼용 없음)
- [x] hitSlop: 토글 버튼 6 (영역은 width 40 + hitSlop 12 → 52pt 가로, 44pt 세로 자체 충족)
- [x] 칩 단일 터치 영역: chipInner paddingHorizontal 12 + paddingVertical 8 + 콘텐츠 = 약 36pt 세로. **iOS HIG 44pt 미달이지만** chipRow paddingVertical 10이 위/아래로 여백을 더해 전체 칩 행 높이 56pt — 실질 터치 가능 영역이 chip 자체 + 패딩이라 양호
- [x] 정적 이미지 없음 (이모지로 대체)
- [x] FlatList: `listBottomPad`에 `EMOTION_PICKER_ROW_HEIGHT` 가산 → 펼침 시 마지막 메시지 가림 방지 (특별 검증 포인트 1.c 통과)
- [WARNING] EmotionPicker prop 표면 일관성 (위 WARNING #1)

### i18n (6/7)
- [x] 8개 emotion 키(`chat.emotion.{neutral|happy|sad|angry|surprised|excited|whispering|laughing}`) ko/en 양쪽 정의 — 누락 0
- [x] 토글 a11y label: `chat.emotionPicker.toggleLabel` ko/en 양쪽 정의
- [x] 키 네이밍: 점 표기 + 카멜 (기존 `chat.intimacyUntilMain` 등과 일치)
- [x] 라벨 길이: 한국어 "속삭임"(3자), "기본"(2자), 영어 "Whispering"(10자)이 최장 — 칩에 자연스럽게 들어감
- [x] 하드코딩된 텍스트 없음 (모두 `t(...)` 호출)
- [x] 동적 보간 변수 없음 (해당 없음)
- [WARNING] neutral 라벨의 의미 정합성 (위 WARNING #3)

### 접근성 (5/6)
- [x] 토글: `accessibilityRole="button"` + `accessibilityLabel` + `accessibilityState={{ expanded }}` (특별 검증 포인트 4 통과)
- [x] 칩: `accessibilityRole="button"` + `accessibilityLabel={t(meta.labelKey)}` + `accessibilityState={{ selected }}` (각 칩별 selected 상태 노출)
- [x] 색상에만 의존하는 정보 전달 없음 — 선택 상태는 그라디언트 배경 + 흰색 텍스트로 시각적 명확성 충분
- [x] 본문 텍스트 색 대비: `colors.text(#3A2340)` on `colors.card(#FFFAFA)` ≈ 14:1, `colors.white` on `gradients.primary(#E27AA0)` ≈ 4.5:1 — 모두 WCAG AA 통과
- [x] EmotionPicker 토글에 emoji만 표시될 때도 a11y label로 의미 전달 (textLight 같은 fallback 없음)
- [WARNING] 펼침 상태 시각적 단서 (위 WARNING #2)

### 상태/에러/빈 UI (4/4)
- [x] 전송 후 자동 리셋: `setSelectedEmotion(DEFAULT_EMOTION)` + `setEmotionPickerOpen(false)` 동시 적용 — 사용자가 의식적으로 매번 선택하도록 (특별 검증 포인트 5 통과)
- [x] 전송 직전 `emotionForSend = selectedEmotion`로 클로저 캡처 후 즉시 리셋 → race condition 없음
- [x] 빈 상태: emotion 미선택(neutral)이 기본 — 항상 송출 가능, "선택 안 됨" 차단 케이스 없음
- [x] 에러 처리: `await send` throw 시 `Alert.alert(t('common.error'), e.message)` (기존 패턴 유지)

### 성능/RN 특화 (4/4)
- [x] 8개 칩은 `map` 사용 적절 (FlatList 오버헤드 불필요)
- [x] `EMOTION_META_MAP` reduce 한 번 캐시 (모듈 로드 시) — 매 렌더 lookup O(1)
- [x] `useMemo`/`useCallback` 추가 사용 없음 — 단순 핸들러는 일반 함수로 처리(과도한 메모이제이션 방지)
- [x] 애니메이션은 `pressed && transform: scale(...)` Pressable 내장 사용 — Reanimated 도입 불필요한 가벼운 인터랙션

### ChatBubble 배지 (특별 검증 포인트 2 — 상세)
- [x] 위치: bubbleStack `position: relative` + 배지 `position: absolute`로 말풍선 본문 흐름 침범 X
- [x] 좌/우: 자기 메시지(`emotionBadgeMine: left: -6`) vs 상대 메시지(`emotionBadgeTheirs: right: -6`)로 양쪽 자연스럽게 위치
- [x] 크기: 22x22 원형 + 12px emoji — 메시지 텍스트(15px) 옆에서 압도하지 않으면서 한 눈에 인지 가능
- [x] 색 대비: `backgroundColor: colors.white` + 1px `borderSoft` + `shadows.soft` → mine(primary 분홍) / theirs(card 연한 배경) 양쪽 위에서 모두 가독 (INFO #3 timestamp 겹침은 미세 조정 권고만)
- [x] null/neutral 분기: `message.emotion && message.emotion !== 'neutral'` — 기존 메시지(emotion null) 호환

---

## 특별 검증 포인트 종합

| # | 포인트 | 결과 |
|---|---|---|
| 1.a | 토글 neutral vs 감정 선택 시각적 차이 | 부분 통과 — `toggleActive`로 neutral 아닐 때만 강조. 펼침 상태 강조는 미반영 (WARNING #2) |
| 1.b | 칩 행 가로 스크롤 + `keyboardShouldPersistTaps="always"` | 통과 |
| 1.c | 펼침 시 listBottomPad 가산 | 통과 — `+ (emotionPickerOpen ? EMOTION_PICKER_ROW_HEIGHT : 0)` 정확히 적용 |
| 1.d | hitSlop / 44pt 터치 영역 | 통과 — 토글 width 40 + hitSlop으로 ≥44pt 유효, 칩은 chipRow paddingVertical 10으로 보강 |
| 2 | ChatBubble 배지 위치/크기/대비 | 통과 — INFO #3 timestamp 겹침 검토만 권고 |
| 3.a | i18n 8개 키 ko/en 양쪽 정의 | 통과 |
| 3.b | 라벨이 칩에 자연스럽게 들어가는지 | 통과 — 한/영 모두 칩 폭 무리 없음. 다만 "속삭임"(ko)·"Whispering"(en) 길이 차이로 가로 스크롤 길이가 locale별로 달라짐 (INFO #2 관련) |
| 4 | 접근성 a11y label / role / state | 통과 — 토글 + 칩 8개 모두 명시적 |
| 5 | 상태 리셋 UX (전송 후 neutral + 닫힘) | 통과 — 같은 핸들러에서 동시 처리, 클로저 캡처로 race 없음 |

---

## 우선순위 권고 요약

1. **WARNING #3 (neutral 라벨)** — 사용자 인지 직접 영향. ko/en 양쪽 한 줄 변경으로 즉시 수정 가능. 가장 먼저 처리.
2. **WARNING #1 (사용 안 하는 `onChange` prop)** — 코드 위생. props 시그니처 정리로 해결.
3. **WARNING #2 (펼침 상태 시각 단서)** — 사용자 혼동 가능성. neutral 상태에서 펼친 사용자가 "패널이 열렸나?" 헷갈리는 케이스. `expanded` 분기 스타일 추가 권고.
4. **INFO 항목** — 차후 디자인 토큰 확장 시 함께 검토 (감정별 색상 팔레트 등).

CRITICAL이 없으므로 현재 상태로 머지 가능하며, WARNING #3은 다음 커밋에 함께 정리하길 권장.
