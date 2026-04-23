# 채팅 화면 3종 수정 QA 실행 리포트

**검증 대상 파일 (이번 변경)**
- `src/utils/chat.ts`
- `src/app/(main)/chat/[matchId].tsx`

**작업 디렉토리:** `C:\Users\EST-INFRA\voicemate-FE`
**검증 시각:** 2026-04-23

## 실행 결과 요약

| 검증 | 결과 | 비고 |
|------|------|------|
| typecheck (`npm run typecheck`) | PASS | 종료 코드 0, 오류 0건 |
| lint (`npm run lint`) | PASS (warning 5건) | 0 errors / 5 warnings — 모두 기존 이슈 |
| test (`npm test -- --testPathPattern="chat\|message\|intimacy"`) | 미작성 | 매칭 테스트 0건 (전체 11개 테스트 파일 존재, 그중 패턴 매칭 0) |

## 신규 회귀 (이번 변경에 의한 오류)

**없음.**

상세 검증 내용:

- **`src/utils/chat.ts`**
  - `countRoundTrips(messages: Message[]): number` 시그니처 변경 — `Message[]` 임포트(`import type { Message } from '@/types';`)가 정상 유지됨.
  - 함수 본체 내 사용 변수(`count`, `seenA`, `seenB`, `firstSender`)는 모두 사용/할당됨 (no-unused-vars 위반 없음).
  - `firstSender: string | null`로 명시 좁히기 처리되어 `m.sender_id` 비교 시 타입 에러 없음.
  - `UNLOCK_MAIN_PHOTO_AT`, `UNLOCK_ALL_PHOTOS_AT`, `photoRevealStage`, `PhotoRevealStage` export 시그니처 동일 — 호출부(`[matchId].tsx`) 영향 없음.

- **`src/app/(main)/chat/[matchId].tsx`**
  - `countRoundTrips(messages)` 단일 인자 호출로 변경 — 함수 시그니처와 일치 (typecheck PASS).
  - `useEffect` 신규 2개 추가:
    - `[loading, messages.length]` 의존성 — `loading`/`messages` 모두 컴포넌트 스코프 변수. exhaustive-deps 위반 없음 (실제 사용 변수는 `loading`, `messages.length`, `flatListRef`, `initialScrolledRef` — ref는 dep 불필요).
    - `[messages]` 의존성 — `messages`가 사용 변수이며 ref는 의존성 불필요.
  - `prevLengthRef`, `prevFirstIdRef`, `initialScrolledRef` ref 추가 — `useRef` import는 기존 파일 라인 1에 이미 존재.
  - `EXTRA_BUBBLE_GAP = 16` 모듈 상수 추가 후 `listBottomPad`에서 사용 — 미사용 변수 아님.
  - `handleSend`에서 `setTimeout` 제거됨 — 사용 안 하던 import 잔존 없음 확인 (typecheck/lint 통과).
  - `FlatList`의 `onContentSizeChange` 제거 — 외부 참조 없음.
  - `Message` 타입은 `renderMessage` 시그니처에서 계속 사용되어 import 유지.

## 기존 이슈 (변경 외 영역의 기존 경고 — 수정 안 함)

ESLint warning 5건, 모두 이번 변경 파일과 무관:

| 파일 | 라인 | 규칙 | 메시지 |
|------|------|------|--------|
| `src/app/(main)/(tabs)/profile.tsx` | 20:10 | `@typescript-eslint/no-unused-vars` | `'Button' is defined but never used` |
| `src/app/(main)/(tabs)/profile.tsx` | 24:10 | `@typescript-eslint/no-unused-vars` | `'useAuthStore' is defined but never used` |
| `src/app/_layout.tsx` | 46:6 | `react-hooks/exhaustive-deps` | missing dependency `'tryAutoLogin'` |
| `src/hooks/useVoice.ts` | 64:6 | `react-hooks/exhaustive-deps` | missing dependency `'stopPolling'` |
| `src/i18n/index.ts` | 21:1 | `import/no-named-as-default-member` | `i18n` also has a named export `use` |

→ 모두 `_workspace/02_implementer_summary.md`에 명시된 변경 파일이 아니므로 **본 QA 범위 외**. 별도 정리 작업으로 분리 권장.

## 사용자 개입 필요

**없음.** 자동 수정이 필요한 신규 회귀 항목 없음.

## 통과 항목

- `npm run typecheck` — TypeScript 컴파일 오류 0건 (`tsc --noEmit` 종료 코드 0).
- `npm run lint` — ESLint error 0건 (warning만 5건이며 모두 기존 이슈).
- `countRoundTrips` 시그니처 변경에 따른 호출부 정합성 확인 — `[matchId].tsx` line 188에서 단일 인자 호출, 컴파일 정상.
- `EXTRA_BUBBLE_GAP` 상수 정의 및 `listBottomPad` 합산 — 미사용 변수 없음.
- 신규 effect 2종 (`[loading, messages.length]`, `[messages]`) — exhaustive-deps lint 위반 없음.
- expo-router 라우트 컨벤션 — 변경 없음 (`useLocalSearchParams<{matchId: string; ...}>()` 기존 시그니처 유지).
- 신규 의존성 추가 없음 — `package.json` 변경 불필요.

## 추가 노트 (런타임 정합성)

- `IntimacyGauge` 컴포넌트(`src/components/chat/IntimacyGauge.tsx`)는 별도 신규 파일이지만 본 QA 작업 트리거 파일 목록(`02_implementer_summary.md` 기준)에는 포함되지 않음. 호출부 `<IntimacyGauge roundTrips={roundTrips} />`는 number prop 전달로 정합성 OK.
- 테스트 매칭 0건은 jest 종료 코드 1을 반환하나, `qa-runtime` 스킬 기준 "테스트 미작성"으로 분류 (실패 아님).
- 회귀 가능성 추가 점검 권장(수동):
  - 채팅 입장 시 초기 스크롤 1회만 발화하는지 (initialScrolledRef 가드).
  - `loadOlder` 호출로 prepend 발생 시 자동 스크롤이 발화하지 않는지 (currFirstId 변경 감지 가드).
  - 메시지 송신 직후 자동 스크롤이 effect로 트리거되는지 (`setTimeout` 제거 후).

---

# 후속 재검증 (W1+W2 적용 후)

**검증 시각:** 2026-04-23 (후속 패스)

**이번 변경 파일 (W1+W2 후속 적용)**
- `src/app/(main)/chat/[matchId].tsx` — `useMemo` 적용 + 스크롤 위치 추적 + 새 메시지 배지
- `src/i18n/locales/ko.ts` — `chat.newMessagesBadge` 키 추가
- `src/i18n/locales/en.ts` — `chat.newMessagesBadge` 키 추가

## 실행 결과 요약 (재검증)

| 검증 | 결과 | 비고 |
|------|------|------|
| typecheck (`npm run typecheck`) | PASS | 종료 코드 0, 오류 0건 |
| lint (`npm run lint`) | PASS (warning 5건) | 0 errors / 5 warnings — 모두 기존 이슈 (이전 패스와 동일 목록) |

## 신규 회귀 (이번 후속 변경에 의한 오류)

**없음.**

상세 검증 내용:

- **`src/app/(main)/chat/[matchId].tsx`**
  - `useMemo` import 추가 (line 1: `import { useEffect, useMemo, useRef, useState } from 'react';`) — 사용처 line 229 `const roundTrips = useMemo(() => countRoundTrips(messages), [messages]);` 정합성 OK. exhaustive-deps 위반 없음 (`messages`만 의존성).
  - 신규 type import `NativeScrollEvent`, `NativeSyntheticEvent` (line 17-18) — `handleScroll` 시그니처(line 200)에서 사용. 미사용 import 없음.
  - 신규 import `gradients`, `radii`, `shadows` (line 29 `@/constants/colors`) 및 `fonts` (line 30) — 모두 신규 `newMessagesBadge*` 스타일 정의 및 `LinearGradient` 호출부(line 296, 337)에서 사용. 미사용 import 없음.
  - 신규 state `newMessagesCount` (line 122) — setter `setNewMessagesCount` 호출 4곳 (line 188, 190, 206, 212), 읽기 4곳 (line 205, 280, 284, 302). 사용 변수.
  - 신규 ref 2개: `prevLastIdRef` (line 128), `isNearBottomRef` (line 132) — useRef는 의존성 배열에 포함 불필요. effect 본문(line 183, 186, 197) 및 `handleScroll`(line 204)에서 사용.
  - 신규 모듈 상수 `NEAR_BOTTOM_THRESHOLD = 120` (line 50) — `handleScroll`(line 203)에서 사용. 미사용 변수 아님.
  - 신규 useEffect (line 173-198, 의존성 `[messages, userId]`) — exhaustive-deps OK. 본문에서 사용하는 외부 변수: `messages`, `userId` (모두 의존성 명시). ref/setter는 안정적 참조이므로 dep 불필요.
  - 신규 `handleScroll`, `handleNewMessagesBadgePress` 함수 (line 200-213) — JSX(line 269 `onScroll={handleScroll}`, line 282 `onPress={handleNewMessagesBadgePress}`)에서 사용.
  - 조건부 `<Pressable>` 배지 렌더링(line 280-307) — `t('chat.newMessagesBadge', { count })` interpolation 호출. accessibilityRole/accessibilityLabel/hitSlop 모두 RN 표준 prop으로 type 정합성 OK.

- **`src/i18n/locales/ko.ts`** (line 135)
  - `newMessagesBadge: "새 메시지 {{count}}개"` 키 추가 — 기존 `chat` 객체의 마지막 직전에 위치. 객체 리터럴 syntax/콤마 정상.

- **`src/i18n/locales/en.ts`** (line 135)
  - `newMessagesBadge: '{{count}} new messages'` 키 추가 — `chat` 객체 내, 동일 위치. 키 일치.
  - 두 파일의 키 집합 일치 → i18next missingKey 경고 없음.

## 기존 이슈 (변경 외 영역의 기존 경고 — 수정 안 함)

이전 보고서와 동일한 5건. 변동 없음.

| 파일 | 라인 | 규칙 | 메시지 |
|------|------|------|--------|
| `src/app/(main)/(tabs)/profile.tsx` | 20:10 | `@typescript-eslint/no-unused-vars` | `'Button' is defined but never used` |
| `src/app/(main)/(tabs)/profile.tsx` | 24:10 | `@typescript-eslint/no-unused-vars` | `'useAuthStore' is defined but never used` |
| `src/app/_layout.tsx` | 46:6 | `react-hooks/exhaustive-deps` | missing dependency `'tryAutoLogin'` |
| `src/hooks/useVoice.ts` | 64:6 | `react-hooks/exhaustive-deps` | missing dependency `'stopPolling'` |
| `src/i18n/index.ts` | 21:1 | `import/no-named-as-default-member` | `i18n` also has a named export `use` |

→ 이전 패스와 동일. 본 변경과 무관.

## 사용자 개입 필요

**없음.** 자동 수정이 필요한 신규 회귀 항목 없음.

## 통과 항목 (후속)

- `npm run typecheck` — 종료 코드 0, TypeScript 오류 0건.
- `npm run lint` — ESLint error 0건 (warning 5건 모두 기존 이슈).
- W1 (`useMemo` 적용) — `roundTrips` 메모이제이션이 `messages` 변경 시에만 재계산되도록 정확히 적용. 호출부 `IntimacyGauge`/`photoRevealStage`에 그대로 number 전달.
- W2 (스크롤 위치 추적 + 새 메시지 배지) — 다음 가드가 모두 일관되게 적용됨:
  - `isNearBottomRef`: `handleScroll`에서 `NEAR_BOTTOM_THRESHOLD` 기준으로 갱신.
  - 자동 스크롤은 (a) 본인이 보낸 메시지(`isMine`) 또는 (b) 사용자가 하단 근처일 때만 발화 — 그 외에는 배지 카운트 증가.
  - 배지 탭/하단 근접 시 카운트 0으로 초기화 (line 205-207, 212).
- i18n — `chat.newMessagesBadge` 키가 ko/en 양쪽에 동일 키로 추가됨. interpolation 변수 `count` 양 언어 일치.
- 신규 의존성 추가 없음 — `package.json` 변경 불필요.
- expo-router 컨벤션 — 라우트 파라미터/파일 위치 변경 없음.

## 추가 노트 (런타임 정합성 — 후속)

- 배지 위치 계산(line 289-291): `bottom: (keyboardOpen ? kbHeight + insets.bottom : 0) + 54 + bottomSafePad + 8` — `inputBar`의 `bottom`과 동일 베이스(`kbHeight + insets.bottom`)에 input 높이(54)와 추가 여백(8)을 더해 입력바 바로 위에 노출. 시각적 회귀 가능성 낮음.
- `LinearGradient`의 `colors` prop은 `[...gradients.primary]` 형태로 readonly 튜플을 mutable array로 spread해 ts2769 회피. 기존 패턴(line 337)과 일관.
- `accessibilityLabel`이 카운트를 포함한 문자열로 동적 생성됨 — 스크린리더에서 "새 메시지 N개" / "{N} new messages" 정상 발화.
- 회귀 가능성 추가 점검 권장(수동):
  - 사용자가 위로 스크롤한 상태에서 상대 메시지 수신 시 배지 노출 + 카운트 증가 확인.
  - 배지 탭 시 `scrollToEnd({ animated: true })` 후 카운트 0으로 초기화 확인.
  - 본인이 메시지를 보낼 때는 항상 자동 스크롤(배지 미노출) 확인.
  - 하단 근접(120px 이내) 상태에서 새 메시지 도착 시 배지 미노출 + 자동 스크롤 확인.
  - 키보드 표시/숨김 전환 시 배지 위치가 입력바와 함께 부드럽게 이동하는지 확인.
