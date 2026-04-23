# 채팅 화면 3종 수정 설계 (친밀도 동기화 / 자동 스크롤 / 입력창 간격)

## 1. 목표

사용자가 채팅 화면에서 다음 3가지가 정확히 동작해야 한다:
1. **친밀도 동기화**: 두 사용자(A, B)의 친밀도 게이지가 항상 동일한 값으로 표시된다.
2. **자동 스크롤**: 채팅방 진입/송신/수신 시 마지막 메시지가 자동으로 보인다.
3. **입력창 간격**: 마지막 말풍선과 입력창 사이에 시각적 여백이 충분히 확보된다.

## 2. 진입점 / 종료점

- 진입: 매치 목록 → 채팅방 (`/chat/[matchId]`)
- 종료: 화면 뒤로 가기 (변경 없음, 동작만 보정)

## 3. 화면 트리 (expo-router)

- `src/app/(main)/chat/[matchId].tsx` (수정)
- `src/components/chat/IntimacyGauge.tsx` (필요 시 prop 시그니처 유지/조정)
- `src/components/chat/ChatBubble.tsx` (마진 보정 - 마지막 항목 한정)
- `src/utils/chat.ts` (`countRoundTrips` 로직 변경 - 핵심)

## 4. 데이터 흐름

```
[Supabase messages 테이블]
   ↓ (Realtime INSERT/UPDATE 이벤트, 양쪽 클라이언트가 동일 채널 구독)
[services/realtime.ts subscribeToMessages]
   ↓
[hooks/useChat.ts] messages 상태 갱신
   ↓
[ChatScreen]
   ├─ countRoundTrips(messages, userId) → roundTrips
   ├─ <IntimacyGauge roundTrips={roundTrips} />
   └─ <FlatList ref={flatListRef} ... onContentSizeChange → scrollToEnd>
```

**친밀도 결정 위치 결론**: **FE 자체 계산 (대칭형 로직으로 변경)**

이유:
- 현재 BE에는 `intimacy_score` 컬럼이나 별도 엔드포인트가 없음 (BE 코드 직접 확인 불가했지만, FE의 `types/index.ts` `Match`/`MatchListItem`에 친밀도 필드 부재 + `messages.ts` 서비스에 친밀도 API 부재로 강하게 추정).
- 친밀도는 **메시지 시퀀스에서 결정론적으로 도출 가능**한 값(round-trip 수)이므로, BE를 추가하지 않아도 양쪽 클라이언트가 같은 메시지 배열만 보면 동일한 값이 나오도록 함수를 수정하면 동기화 보장.
- 양쪽이 동일한 `messages` 시퀀스를 Supabase Realtime으로 받기 때문에, `countRoundTrips`만 **userId에 비대칭적이지 않게** 다시 정의하면 양쪽 화면이 같은 값을 보인다.

## 5. 상태 관리

| 상태 | 위치 | 이유 |
|------|------|------|
| messages | `useChat` 훅 (이미 존재) | 변경 없음 |
| roundTrips | `ChatScreen` 내 `countRoundTrips` 호출 결과 | 파생값, 별도 상태 불필요 |
| flatListRef | `ChatScreen` `useRef` (이미 존재) | 변경 없음 |
| kbHeight / insets | 기존 그대로 | 변경 없음 |

## 6. 영향 파일

### 신규
- 없음

### 수정
1. **`src/utils/chat.ts`** — `countRoundTrips` 시그니처 및 로직 변경
   - 변경 전: `countRoundTrips(messages, userId)` — 내가 보낸 후 상대가 답장한 횟수만 카운트 (한쪽만 증가)
   - 변경 후: `countRoundTrips(messages)` — userId 무관, "두 사용자가 모두 한 번 이상 발신한 페어"의 수를 카운트 (대칭)
   - 정확한 정의: 시간순으로 messages를 순회하며 `senderA`와 `senderB`가 둘 다 한 번씩 등장할 때마다 1 증가, 카운트 후 양쪽 토글 리셋. 결과는 sender_id에 의존하지 않으므로 양쪽 클라이언트에서 동일.

2. **`src/app/(main)/chat/[matchId].tsx`** — 호출부 + 자동 스크롤 + 간격
   - `countRoundTrips(messages, userId ?? null)` → `countRoundTrips(messages)` 로 호출 변경
   - **자동 스크롤 강화**:
     - 채팅방 진입 직후(첫 메시지 로드 완료 시점) `scrollToEnd({ animated: false })` 1회 보장 — 현재 `onContentSizeChange`로만 처리하지만 `loading`이 false로 바뀌는 첫 프레임에 ref가 늦게 세팅되는 케이스 대비 `useEffect([loading])`에서 명시적 호출 추가
     - 새 메시지 수신(`messages.length` 증가) 시 `scrollToEnd({ animated: true })` — 별도 `useEffect([messages.length])` 추가. 단, **이전 메시지 prepend(loadOlder)는 제외**해야 함 → `prevLengthRef`와 `prevFirstIdRef`로 "끝에 추가됨"인지 판별
     - 송신 후 setTimeout 100ms는 유지하되, 위 effect로 일원화 가능 (중복 시 effect 한 번이면 충분 — 정리)
   - **입력창 간격 확장**:
     - `messageList` 컨테이너의 마지막 항목 아래쪽 패딩이 `listBottomPad = 54 + bottomSafePad + kbHeight` 인데, 54는 입력창 높이 보전용이라 실제 시각적 여백이 거의 0. 마지막 말풍선과 입력창 사이에 +12~16px 추가 여백을 주려면 `listBottomPad` 식에 상수 `EXTRA_BUBBLE_GAP = 16` 합산.

3. **`src/components/chat/ChatBubble.tsx`** — (옵션) 마지막 메시지 marginBottom
   - 위 `listBottomPad` 조정으로 충분하므로 이 파일은 **수정 없음**으로 결정. 만약 시각적으로 부족하면 `container.marginVertical: 4` → `6` 미세 조정만 검토.

4. **`src/components/chat/IntimacyGauge.tsx`** — 시그니처 유지 (`roundTrips: number`)
   - 변경 없음. 단, 호출부에서 새 함수가 동일 의미의 정수를 넘기면 그대로 동작.

## 7. BE 연동 필요성

- **친밀도**: BE 엔드포인트 추가 불필요. messages 테이블이 이미 양쪽에 동일하게 보이고, FE 함수만 대칭으로 만들면 자동 동기화.
- **자동 스크롤**: BE 무관 (FE 단독).
- **간격**: BE 무관 (FE 단독).

→ Analyzer 호출 불필요. 본 작업은 FE 단독 수정으로 종결.

## 8. 의사결정 / 가정

- **결정**: 친밀도 = "양쪽이 모두 한 번씩 메시지를 주고받은 횟수" (대칭). 누가 먼저 시작했는지 무관.
- **결정**: 친밀도는 FE에서 계산. BE에 별도 컬럼/엔드포인트를 만들지 않음 (지금 시점의 minimal 변경).
- **가정**: BE에 친밀도 관련 필드/엔드포인트가 없다 — `src/types/index.ts`, `src/services/messages.ts`, `src/services/matches.ts`에 어떤 흔적도 없음으로 추정. 만약 BE에 이미 컬럼이 있다면 후속 작업에서 BE 값을 신뢰하는 구조로 전환 가능.
- **가정**: 자동 스크롤은 "사용자가 위로 스크롤해 과거 메시지를 보고 있을 때"는 강제로 끌어내리지 않는 동작이 이상적이지만, 본 요청은 "송수신 시 자동 스크롤"이므로 단순 `scrollToEnd`로 처리 (스크롤 위치 추적은 후속 개선 영역).
- **가정**: `EXTRA_BUBBLE_GAP = 16`은 디자인 토큰화하지 않고 화면 내부 상수로 둠 (1회 사용).

## 9. 주의 / 충돌 지점

- **`countRoundTrips` 시그니처 변경**: `userId` 파라미터를 제거하면 호출부(`[matchId].tsx` 152행)도 함께 수정 필요. 다른 곳에서 호출되지 않는지 grep 확인 필요 — 현재까지 grep 결과 채팅 화면 1곳만 사용.
- **`onContentSizeChange` + `useEffect([messages.length])` 중복 호출**: 동일 프레임에 두 번 `scrollToEnd`가 호출될 수 있으나 `animated: false`라 시각적 부작용 없음. 단, 송신 직후의 `setTimeout(scrollToEnd, 100)`은 effect와 중복되므로 **제거**가 깔끔.
- **loadOlder(이전 메시지 prepend) 시 자동 스크롤 금지**: `messages.length` 증가만 보고 `scrollToEnd`를 부르면 위로 스크롤한 사용자가 다시 끝으로 튕긴다. → `prevFirstId`(이전 messages[0].id)가 변하지 않은 경우(=끝에 추가된 경우)에만 스크롤하도록 가드.
- **친밀도 의미 변경에 따른 UX 영향**: 기존 정의에서 5/10이던 마일스톤이 새 정의에서 동일 메시지 수에 대해 다르게 트리거될 수 있음. 해석상 "양쪽이 모두 보낸 페어 수"이므로 사용자가 적극적으로 답장해야 빨리 올라감 — 사진 공개 마일스톤(`UNLOCK_MAIN_PHOTO_AT=5`, `UNLOCK_ALL_PHOTOS_AT=10`)은 그대로 두고 의미만 "왕복 5번/10번"으로 해석.
- **i18n 키**: `chat.intimacyUntilMain`/`chat.intimacyUntilAll`/`chat.intimacyAllUnlocked`은 그대로 사용 가능 (count 의미가 바뀌지만 표현은 동일).
- **테스트**: `src/utils/chat.ts`에 대한 jest 테스트 파일이 있다면 함께 갱신 필요 — 현재 `src/utils/__tests__/` 미존재 추정, qa-runtime 단계에서 확인.

## 10. 구현 체크리스트 (Implementer 인계용)

- [ ] `src/utils/chat.ts`: `countRoundTrips`를 sender_id 비대칭이 아닌 대칭 정의로 재작성
- [ ] `src/app/(main)/chat/[matchId].tsx`: `countRoundTrips` 호출 시그니처 변경
- [ ] `src/app/(main)/chat/[matchId].tsx`: `useEffect`로 messages.length 증가(끝에 추가) 감지 → `scrollToEnd({ animated: true })`. loadOlder 케이스 가드.
- [ ] `src/app/(main)/chat/[matchId].tsx`: `loading` false 전환 시점에 1회 `scrollToEnd({ animated: false })` 보장 (initial)
- [ ] `src/app/(main)/chat/[matchId].tsx`: `handleSend`의 `setTimeout(scrollToEnd, 100)` 제거 (effect로 일원화)
- [ ] `src/app/(main)/chat/[matchId].tsx`: `listBottomPad` 식에 `EXTRA_BUBBLE_GAP = 16` 합산
- [ ] (검증) Realtime 구독 양쪽 클라이언트 모두 동일 messages 수신 → 동일 roundTrips 표시 확인
