# 채팅 화면 3종 수정 구현 요약

## 생성/수정된 파일

| 파일 경로 | 작업 | 설명 |
|----------|------|------|
| `src/utils/chat.ts` | 수정 | `countRoundTrips` 시그니처/로직을 대칭형으로 변경 (userId 파라미터 제거). |
| `src/app/(main)/chat/[matchId].tsx` | 수정 | 호출부 시그니처 갱신, 자동 스크롤 effect 2종 추가, `handleSend`의 setTimeout 제거, `onContentSizeChange` 제거, `listBottomPad`에 `EXTRA_BUBBLE_GAP=16` 합산. |

## 주요 변경

### (a) 친밀도 동기화 (`src/utils/chat.ts`)

- 시그니처: `countRoundTrips(messages: Message[], userId: string | null)` → `countRoundTrips(messages: Message[])`
- 로직: 시간순 메시지 시퀀스를 순회하며 첫 발신자(firstSender)를 기준으로 `seenA/seenB` 토글. **양쪽 모두 한 번씩 발신**한 시점마다 count++ 후 토글 리셋. 결과는 `userId`와 무관하므로 양쪽 클라이언트(A, B)에서 **반드시 동일한 정수**가 나온다.
- 트레이스 예: `A,A,B,A,B,A` → 페어 1: A→B(완성), 페어 2: A→B(완성), 마지막 A는 미완성 → roundTrips = 2. 두 사용자 모두 동일한 messages 시퀀스를 보므로 동일한 2를 산출.

### (b) 자동 스크롤 (`src/app/(main)/chat/[matchId].tsx`)

- `flatListRef`에 더해 `prevLengthRef`, `prevFirstIdRef`, `initialScrolledRef` ref 추가.
- **초기 진입 스크롤**: `useEffect([loading, messages.length])` — `loading=false` 전환 시 messages가 있다면 `requestAnimationFrame` 안에서 `scrollToEnd({ animated: false })` 1회 보장. `initialScrolledRef`로 중복 방지.
- **신규 메시지 스크롤**: `useEffect([messages])` — `currLen > prevLen` 이면서 `currFirstId === prevFirstId` (즉, 끝에 추가된 경우)일 때만 `scrollToEnd({ animated: true })`. 첫 항목 id가 바뀌었다면 loadOlder로 prepend된 것이므로 스크롤 금지. 초기 스크롤 전에는 발화하지 않도록 `initialScrolledRef` 가드.
- `handleSend`의 `setTimeout(scrollToEnd, 100)` 제거 — send 후 messages 배열이 갱신되면 위 effect가 자동으로 처리.
- `FlatList`의 `onContentSizeChange={...scrollToEnd...}` 제거 — loadOlder 시점에 콘텐츠 크기가 커지면서 잘못 발화하던 문제를 원천 차단. 초기/신규 메시지 케이스는 위 effect가 모두 커버.
- FlatList는 inverted 미사용(oldest at top). `data.reverse()`로 정렬되어 있으므로 `scrollToEnd`로 처리.

### (c) 입력창 간격 (`src/app/(main)/chat/[matchId].tsx`)

- 모듈 상수 `EXTRA_BUBBLE_GAP = 16` 추가.
- `listBottomPad = 54 + bottomSafePad + kbHeight + EXTRA_BUBBLE_GAP` — 마지막 말풍선과 입력창 사이 16px 시각적 여백 확보.

## 영향 평가

- **타입/시그니처 변경**: `countRoundTrips`는 grep 결과 `[matchId].tsx` 한 곳에서만 호출. 호출부도 함께 수정했으므로 컴파일 오류 없음.
- **`IntimacyGauge`**: prop 시그니처 `roundTrips: number` 그대로 유지. 의미만 "왕복 횟수(대칭)"로 변화. 기존 i18n 키(`chat.intimacyUntilMain`/`UntilAll`/`AllUnlocked`) 그대로 사용 가능.
- **사진 공개 마일스톤**: `UNLOCK_MAIN_PHOTO_AT=5`, `UNLOCK_ALL_PHOTOS_AT=10` 동일. 의미가 "양쪽 모두 발신한 페어 5/10번"으로 해석됨 — 한쪽만 일방적으로 보내면 카운트 증가하지 않으므로 더 엄격한 기준이 됨.
- **자동 스크롤**: loadOlder 가드 적용으로 사용자가 위로 스크롤하여 과거 메시지를 볼 때 강제로 끝으로 끌려가지 않음. 신규 메시지(송수신) 시에만 부드럽게 끝으로 이동.
- **간격**: `listBottomPad`만 늘어나므로 인풋바 위치/키보드 동작에는 영향 없음. 마지막 말풍선 아래에 16px 여백만 추가됨.

## 미구현/TODO

- 없음. 설계서의 모든 체크리스트 항목 완료.

---

# 후속 개선 — W1 (useMemo) + W2 (스크롤 위치 인지형 자동 스크롤 + 새 메시지 배지)

## 생성/수정된 파일

| 파일 경로 | 작업 | 설명 |
|----------|------|------|
| `src/app/(main)/chat/[matchId].tsx` | 수정 | W1: `roundTrips`를 `useMemo`로 감쌈. W2: `onScroll` 기반 `isNearBottomRef` 추적, 자동 스크롤 가드, "새 메시지 N개 ↓" 플로팅 배지 추가. `prevLastIdRef` 도입으로 append 판정을 last id 변경 기준으로 정확화. |
| `src/i18n/locales/ko.ts` | 수정 | `chat.newMessagesBadge: "새 메시지 {{count}}개"` 추가. |
| `src/i18n/locales/en.ts` | 수정 | `chat.newMessagesBadge: "{{count}} new messages"` 추가. |

## 주요 변경

### W1. `countRoundTrips` 메모이제이션

- `const roundTrips = useMemo(() => countRoundTrips(messages), [messages])` 로 변경.
- `text` setState(키 입력)나 `kbHeight` 변경처럼 messages와 무관한 리렌더에서는 더 이상 O(n) 풀스캔 발생하지 않음.

### W2. 스크롤 위치 인지형 자동 스크롤

- 모듈 상수 `NEAR_BOTTOM_THRESHOLD = 120` 추가 (디자이너 권장값).
- `isNearBottomRef = useRef(true)` 추가 — 초기에는 true(초기 스크롤 케이스 보존). FlatList `onScroll`에서 `contentSize.height - layoutMeasurement.height - contentOffset.y < 120` 으로 갱신.
- FlatList에 `onScroll={handleScroll}` + `scrollEventThrottle={16}` 부착.
- 자동 스크롤 effect 갱신:
  - `prependedOlder` 판정은 기존대로 first id 변경으로 검사.
  - `appendedNew` 판정을 `currLastId !== prevLastIdRef.current`로 명시화 (length만 비교하면 prepend+append 동시 발생 시 잘못 매칭될 여지 차단).
  - append 분기:
    - `isMine = lastMessage?.sender_id === userId` → **본인이 보낸 메시지면 항상 `scrollToEnd({animated:true})`** (자기가 보낸 건 보이도록).
    - `isMine === false && isNearBottomRef.current === true` → 기존대로 `scrollToEnd({animated:true})`.
    - `isMine === false && isNearBottomRef.current === false` → 자동 스크롤 안 함. `setNewMessagesCount(c => c + 1)` 로 배지 카운트 누적.
- `handleScroll` 안에서 사용자가 다시 바닥 근처로 돌아오면(`nearBottom && newMessagesCount > 0`) 배지 자동 클리어.
- `handleNewMessagesBadgePress` → `scrollToEnd({animated:true})` + 배지 숨김.
- 초기 진입 스크롤(initialScrolledRef 가드)은 그대로. W2 영향 없음.

### 배지 디자인 (디자인 시스템 토큰 사용)

- 위치: `position: 'absolute'`, `alignSelf: 'center'`, `bottom = (키보드 높이 + safeBottom) + 54(입력바 높이) + bottomSafePad + 8` — 입력창 바로 위, 키보드 등장 시에도 같이 따라 올라감.
- 형태: `borderRadius: radii.pill` 알약, `LinearGradient(gradients.primary)` 배경, `shadows.glow` 부드러운 그림자.
- 콘텐츠: 텍스트(`fonts.medium`, 13pt, white) + Ionicons `arrow-down` 14pt.
- 접근성: `accessibilityRole="button"`, `accessibilityLabel`(보간 카운트 포함), `hitSlop={8}`.
- 인터랙션: pressed 시 `transform: scale(0.97)` 미세 피드백.

### i18n

- ko: `chat.newMessagesBadge: "새 메시지 {{count}}개"`
- en: `chat.newMessagesBadge: "{{count}} new messages"`
- 보간 변수 `{{count}}` 양쪽 일치.

## 영향 평가

- **타입 안전성**: `tsc --noEmit` 통과. `NativeScrollEvent`, `NativeSyntheticEvent` 타입 import 추가.
- **기존 동작 보존**: 초기 진입 스크롤(animated:false), loadOlder prepend 가드, 본인 송신 시 자동 스크롤 — 모두 유지.
- **새 동작**: 사용자가 위로 120px 이상 올라간 상태에서 상대 메시지 도착 시 → 화면이 튕기지 않고 입력창 위에 "새 메시지 N개 ↓" 배지가 떠오름. 탭 또는 사용자가 직접 바닥 근처로 스크롤하면 배지 사라짐.
- **성능**: `roundTrips` 메모이제이션으로 키 입력당 O(n) 메시지 풀스캔 제거. `onScroll` throttle 16ms로 스크롤 부하 최소.

## 미구현/TODO

- 없음. W1, W2, i18n 모두 적용 완료.
