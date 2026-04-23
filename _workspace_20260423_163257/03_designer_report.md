# 채팅 화면 3종 수정 디자인 리뷰

검토 대상: `src/utils/chat.ts`, `src/app/(main)/chat/[matchId].tsx` (+ 의존 컴포넌트 `IntimacyGauge.tsx`, `ChatBubble.tsx`)
설계서: `_workspace/00_planner_design.md`
구현 요약: `_workspace/02_implementer_summary.md`

## 결과 요약

| 카테고리 | 통과 | 경고 | 위반 |
|---------|------|------|------|
| 디자인 시스템 토큰 | 5 | 0 | 0 |
| RN 컴포넌트 패턴 | 6 | 1 | 0 |
| i18n | 4 | 0 | 0 |
| 접근성 | 3 | 1 | 0 |
| 상태 UI 완성도 | 2 | 1 | 0 |
| 자동 스크롤 UX | 3 | 1 | 0 |
| 간격 / 시각 리듬 | 2 | 0 | 0 |

CRITICAL: 0건 / WARNING: 4건 / INFO: 2건

---

## CRITICAL — 즉시 수정 필요

없음. 설계서·구현 요약과 실제 코드가 일치하며, 사용자 경험을 차단하는 결함은 발견되지 않았다.

---

## WARNING — 일관성 / UX 개선 권장

### W1. `[matchId].tsx:188` 매 렌더마다 `countRoundTrips` 재계산
- **현재**: `const roundTrips = countRoundTrips(messages);` 가 컴포넌트 본문에서 직접 호출됨. 키 입력(`text` setState), 키보드 높이 변경(`kbHeight`) 등 **메시지와 무관한 리렌더에서도** 메시지 배열을 매번 풀스캔.
- **영향**: 메시지가 50~수백 개 누적된 시점에 입력란 한 글자마다 O(n) 순회. 체감 가능한 정도는 아니지만 디자인 시스템의 "성능/RN 특화" 체크리스트(`useMemo` 무거운 연산) 권장 사항 위반.
- **수정**:
  ```ts
  const roundTrips = useMemo(() => countRoundTrips(messages), [messages]);
  ```

### W2. 자동 스크롤 — "사용자가 위로 올린 상태"에서 새 메시지 수신 시 강제 스크롤
- **현재 (`[matchId].tsx:157~172`)**: loadOlder(=prepend)는 `prevFirstId !== currFirstId`로 정확히 가드되지만, **append(끝에 추가)인 경우엔 사용자의 현재 스크롤 위치와 무관하게 무조건 `scrollToEnd({ animated: true })` 발사**.
  - 시나리오: 사용자가 200번째 과거 메시지를 읽고 있는 중에 상대가 새 메시지를 보내면 → 화면이 갑자기 끝으로 튕긴다.
- **영향**: 카카오톡/iMessage/WhatsApp 표준은 "사용자가 거의 끝(예: 80~120px 이내)에 있을 때만 자동 스크롤, 그렇지 않으면 새 메시지 인디케이터(↓)만 표시". 현재 구현은 그 표준과 다르다.
- **설계서 8절은 이를 "후속 개선 영역"으로 명시한 가정이라 즉시 수정 의무는 없음**. 그러나 실제 채팅 앱 UX 표준과 어긋나므로 WARNING으로 분류.
- **권장 수정 (단계적)**:
  1. `FlatList`에 `onScroll` 핸들러를 달아 `isNearBottom`(`contentSize.height - layoutMeasurement.height - contentOffset.y < 120`) 상태를 추적.
  2. append 시 `if (isMine || isNearBottom) scrollToEnd({ animated: true })` 로 가드. 그렇지 않은 경우 화면 하단에 `Pressable("새 메시지 보기 ↓")` 토스트 표시.
  3. 토스트 탭 시 `scrollToEnd`. (i18n 키 신규 필요: `chat.newMessageBelow`)

### W3. `scrollToEnd` 신뢰성 — `inverted` 미사용 + `data.reverse()` 패턴
- **현재**: `useChat`이 newest-first API를 `reverse()`해 oldest-at-top 배열로 만들고, FlatList는 정방향(`inverted={false}`)에서 `scrollToEnd`로 마지막에 도달. animated:true / animated:false 분기 자체는 적절.
- **잠재 이슈**: 정방향 FlatList의 `scrollToEnd`는 콘텐츠 크기가 아직 측정되지 않은 첫 프레임에서 미동작할 수 있다. 현재는 `requestAnimationFrame` 1회로 이를 회피하는데, 가변 높이(말풍선 길이가 다름) + 이미지 로드 지연이 결합되면 1프레임 안에 끝까지 안 갈 수 있다.
- **권장**:
  - 단기: `requestAnimationFrame` 안에서 `setTimeout(..., 0)` 한 단계 더 보강하거나, `onLayout`에서 한 번 더 보정.
  - 중기: `inverted` FlatList 패턴으로 전환하면 `scrollToOffset({ offset: 0 })`가 항상 안정. (다만 `loadOlder` 트리거가 `onEndReached`가 되는 등 구조 변경 비용 큼 → 후속 영역.)
- **설계서 의도 대비**: 초기 진입 `animated:false` + 신규 메시지 `animated:true` 분기는 **iOS/Android 채팅 앱의 표준 분기와 일치** (점프 vs 부드러운 추적). 이 결정 자체는 PASS.

### W4. 입력바 hitSlop 부재 — 송신 버튼
- **현재 (`[matchId].tsx:255~272`)**: `sendShell`이 44×44pt이므로 최소 터치 영역(44pt) 자체는 충족. 그러나 `accessibilityLabel` 없음, `hitSlop` 없음 → 디자인 시스템 체크리스트의 "아이콘 전용 버튼에 accessibilityLabel" 위반.
- **수정**:
  ```tsx
  <Pressable
    onPress={handleSend}
    disabled={!text.trim() || sending}
    accessibilityRole="button"
    accessibilityLabel={t('chat.send')}  // 신규 i18n 키 (ko: "보내기", en: "Send")
    accessibilityState={{ disabled: !text.trim() || sending }}
    hitSlop={6}
    ...
  >
  ```
- 본 PR의 직접 수정 범위는 아니지만, 채팅 화면 변경 PR이므로 같이 정리해두면 좋다.

---

## INFO — 향후 개선

### I1. `EXTRA_BUBBLE_GAP = 16` — 모바일 채팅 표준과의 비교 검토
- **결론: 16px은 적정**.
- 비교:
  - iMessage: 약 12~14pt
  - 카카오톡: 약 14~16pt
  - WhatsApp: 약 8~10pt
  - Telegram: 약 12pt
- 16px은 약간 넉넉한 편이지만, VoiceMate 디자인이 따뜻한/감성적 톤(블러시 톤, 라운드 22 입력란)이라 시각적 호흡으로 적합. **현행 유지 권장.**
- 단, 디자인 시스템에 `spacing` 토큰이 있으면 `spacing.md` 같은 토큰을 만들어 16px 매직넘버를 대체할 여지 있음. 현재 `colors.ts`에 `radii`만 있고 `spacing`은 없음 → 토큰화는 후속 영역.

### I2. `MIN_BOTTOM_SAFE_PAD = 12` 모듈 상수 — 디자인 토큰화 후보
- 같은 패턴(`EXTRA_BUBBLE_GAP`, `MIN_BOTTOM_SAFE_PAD`)이 누적되면 spacing 스케일(`xs:4, sm:8, md:12, lg:16, xl:24`)을 `constants/colors.ts` 또는 신규 `constants/spacing.ts`에 정의해 일관 적용 권장.

---

## 통과 항목

### 디자인 시스템 토큰
- ✅ `colors.background`, `colors.card`, `colors.borderSoft` 등 토큰 사용. 직접 색상 리터럴은 `rgba(0,0,0,0.55)` (모달 백드롭) 1건뿐 — RN 백드롭 표준 패턴이라 허용 범위.
- ✅ `gradients.primary` 사용 (전송 버튼).
- ✅ `radii.xl` (모달), `radii.pill` (태그) 토큰 일관 적용.
- ✅ `fonts.bold`, `fonts.medium` 등 폰트 토큰 사용 — Pretendard 기반.
- ✅ `IntimacyGauge`의 마일스톤 색 `colors.primaryDark` 등 토큰 일관.

### RN 컴포넌트 패턴
- ✅ `useSafeAreaInsets` 사용으로 노치/홈바 회피 (`insets.bottom`).
- ✅ `Keyboard` API 직접 청취하여 키보드 높이 추적 — `KeyboardAvoidingView` 대신 직접 입력바 `bottom` 조정. 채팅 앱에서 일반적인 정밀 제어 패턴.
- ✅ `FlatList` + `keyExtractor: item.id` 명시.
- ✅ `Pressable` 일관 사용 (모달 닫기, 전송, 아바타).
- ✅ 로딩 중 `ActivityIndicator` (FlatList ListHeader).
- ✅ 모달 닫기 버튼 `hitSlop={12}` + `accessibilityRole`/`accessibilityLabel` 설정.

### i18n
- ✅ `chat.title`, `chat.typeMessage`, `chat.intimacy`, `chat.intimacyUntilMain`, `chat.intimacyUntilAll`, `chat.intimacyAllUnlocked`, `chat.swipeForMore` 모두 ko/en 양쪽 정의됨 (ko.ts:126~135, en.ts:126~135).
- ✅ 보간 변수 `{{count}}` 양쪽 일치.
- ✅ 친밀도 정의(대칭형)로 변경되었어도 표현 텍스트는 그대로 유효 — 문안 재검토 불필요.
- ✅ 새로 도입된 `EXTRA_BUBBLE_GAP`/`MIN_BOTTOM_SAFE_PAD`는 사용자 노출 텍스트가 아니므로 i18n 무관.

### 접근성
- ✅ 모달 close 버튼 `accessibilityLabel`.
- ✅ ChatBubble의 retry 버튼 `accessibilityLabel="retry audio"`.
- ✅ 본문 텍스트 색 대비 — `colors.text(#3A2340)` on `colors.background(#FFF4EE)` ≈ 11:1 (4.5:1 통과).

### 상태 UI 완성도
- ✅ 로딩 표시 (`ActivityIndicator`).
- ✅ Realtime 재연결 로직 + AppState 포어그라운드 복귀 시 `loadMessages` 재호출 (`useChat:131~137`) — 빈 화면 고착 방지.

### 자동 스크롤 UX (설계 의도 부합 항목)
- ✅ 초기 진입 `animated: false` — 점프(즉시) 동작이 자연스러움. 진입 시 부드럽게 스크롤하면 오히려 어지러운 인상.
- ✅ 신규 메시지 `animated: true` — 새 메시지 도착 시 부드러운 추적이 표준.
- ✅ `loadOlder` prepend 가드 — `prevFirstId !== currFirstId` 비교로 정확히 분기. 위로 스크롤해 과거 보고 있는 도중 prepend된 경우 스크롤 끌려가지 않음. **이 부분은 매우 잘 구현됨.**
- ⚠️ 단, append(끝 추가) 시에는 가드가 없음 → W2 참조.

### 간격 / 시각 리듬
- ✅ `listBottomPad = 54 + bottomSafePad + kbHeight + 16` — 마지막 말풍선이 입력바에 닿지 않음. 키보드 등장 시에도 동일 식이 적용되어 일관됨.
- ✅ `EXTRA_BUBBLE_GAP = 16` — I1 비교 분석상 표준 범위 안에서 약간 넉넉한 정도로 적정.

---

## 종합 의견

설계서가 명시한 3가지 목표(친밀도 동기화 / 자동 스크롤 / 입력창 간격)는 **모두 의도대로 구현**되었으며, 디자인 시스템·i18n·기본 접근성 측면에서 **CRITICAL 결함은 없다**. 특히 loadOlder prepend 가드와 초기/신규 메시지 animated 분기는 채팅 앱 UX 패턴을 정확히 따른다.

남은 4건의 WARNING은 모두 **이번 PR의 직접 범위 외 또는 후속 개선 가능 항목**이다:
- W1(`useMemo`): 1줄 수정으로 본 PR 내 정리 가능 — 권장.
- W2(스크롤 위치 인지형 자동 스크롤): 별도 PR로 분리 권장 (스크롤 추적 + 새 메시지 토스트 패턴).
- W3(scrollToEnd 신뢰성): 현재로 충분히 동작하나 후속 개선 여지.
- W4(send 버튼 a11y): 본 PR 범위가 채팅 화면이므로 같이 정리하면 좋음.

**진행 의견: PR 머지 가능. W1·W4 정도만 같은 PR에 추가 정리하면 디자인 품질 완성도 상승.**
