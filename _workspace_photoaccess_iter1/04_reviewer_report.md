# Per-match `is_unlocked` 블러 처리 — FE↔BE 통합 정합성 리포트

작업 범위: `MatchListItem.is_unlocked?: boolean` 추가 + `MatchItem.tsx`에서 블러 조건 바인딩 + `SwipeCard.tsx` 상수 블러.
검증 일자: 2026-04-24.
대상 BE: `C:\Users\EST-INFRA\voicemate-BE-v2\src\routes\match.ts` (사용자가 지정한 `C:\Users\sejin\Documents\voicemate_BE` 경로는 이 PC에 존재하지 않아 Analyzer가 사용한 로컬 클론 v2로 대체 검증).

---

## 결과 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| 1. 타입 정합성 (`MatchListItem.is_unlocked?: boolean`) | 통과 | snake_case 일치, optional 선언 일치 |
| 2. BE 응답 파싱 경로 (Zod unknown drop 가능성) | 통과 | FE 서비스 계층은 Zod 파싱 없음. `api.get<MatchListItem[]>` 제네릭 캐스팅만 수행 → 미지의 필드가 자동 drop되지 않음 |
| 3. BE 미배포 상태 — `undefined → blur=true` | 통과 | `!undefined === true` 흐름이 `MatchItem.tsx:25` + `Avatar.tsx:34`에서 올바르게 동작 |
| 4. BE 배포 후 `true` / `false` 분기 | 통과 | `!true === false` / `!false === true` 모두 올바름 |
| 5. 필드명 snake_case 일치 (`is_unlocked`) | 통과 | Analyzer spec L52, Implementer L7, 타입 L127 전부 `is_unlocked`로 일치 |
| 6. 라운드트립 임계치 문서 동기화 (`UNLOCK_MAIN_PHOTO_AT=5`) | 통과 (문서) / 미검증 (BE 구현) | FE 상수는 `src/utils/chat.ts:33` `5`, BE 상수 미존재는 Analyzer spec §비즈니스 규칙/Implementer 미구현 §에 명시됨. **BE 구현 시점에 반드시 5로 맞춰야 함** |
| 7. Discover 상수 블러 결정 문서화 | 통과 | Analyzer L202-203, Implementer L45·L53, SwipeCard 인라인 주석 L88까지 3중 문서화 |
| 8. 엔드포인트 커버리지 (`GET /api/matches`) | 통과 | `services/matches.ts:11`에서 호출. `useMatches.ts`가 실제 소비 |
| 9. BE 응답 shape ↔ FE 타입 (나머지 필드) | 통과 | `match_id, created_at, partner, last_message, unread_count` 모두 shape 일치 (match.ts:84-97 vs types L115-127) |
| 10. React Query 캐시 무효화(`invalidateQueries(['matches'])`) 후속 | 미구현 (범위 밖) | FE는 react-query 미사용. `useMatches`는 plain useState. 잠금 해제 순간 실시간 반영은 후속 티켓 |

---

## 발견된 문제

### [INFO] BE 배포 이전 FE 단독 배포 시 회귀 없음 — 통과

- 현재 BE 응답에 `is_unlocked` 필드 없음(`voicemate-BE-v2/src/routes/match.ts:84-97`).
- FE는 JSON을 그대로 받아 `MatchListItem`으로 캐스팅. 서비스 계층은 Zod parse를 쓰지 않으므로(`services/matches.ts` 전문 확인 — `z.object`/`parse` 호출 0건) 없는 필드는 자연스럽게 `undefined`가 된다.
- `MatchItem.tsx:25`: `<Avatar ... blur={!item.is_unlocked} />` → `!undefined === true` → `Avatar.tsx:34`의 `blur ? Math.max(8, size * 0.35) : 0` 분기에서 `blurRadius ≈ 19`.
- 결과: 기존 "하드코딩 `blur`"와 동일한 시각 결과 → **회귀 없음**.

### [INFO] BE 배포 후 동작 — 문서/코드 일치

- BE가 `is_unlocked: true`를 내려보낼 때 `!true === false` → `Avatar`에 `blur={false}` → `blurRadius={0}`. 원본 사진 노출.
- BE가 `is_unlocked: false`를 내려보낼 때 `!false === true` → 블러 유지. 잠금 표현 일치.
- 이 분기는 Implementer L47-48 예상 동작 표와 완전 일치.

### [WARNING] BE 상수(`UNLOCK_MAIN_PHOTO_AT`) 미존재 — 티켓 필요

- FE: `src/utils/chat.ts:33` `export const UNLOCK_MAIN_PHOTO_AT = 5;`
- BE: `voicemate-BE-v2` 전체에 `UNLOCK_MAIN_PHOTO_AT` 또는 등가 상수 **부재** (Analyzer spec §비즈니스 규칙에서 이미 0건 확인).
- 영향: BE가 후속 구현 시 임계치를 5가 아닌 다른 값(예: 4, 6)으로 하드코딩하면 채팅방의 `photoRevealStage`와 매칭 목록의 `is_unlocked`가 어긋나서 "채팅방에선 사진이 보이는데 목록에선 블러" 또는 그 반대의 UX 균열이 발생.
- 본 티켓 범위 밖이지만, Implementer §미구현/후속 작업 2번째 bullet에 명시되어 있어 **리스크 인지는 완료**. BE 구현 시점에 필수 체크 항목으로 승격 권고.
- 수정 방법: BE에서 `src/constants/chat.ts`를 신설하여 `export const UNLOCK_MAIN_PHOTO_AT = 5;`로 동일 값 선언. 가능하면 환경변수 또는 `public.app_settings` 테이블 행으로 single source of truth화.

### [WARNING] 라운드트립 계산 로직의 SQL 포팅 검증 필요

- FE `countRoundTrips`(`src/utils/chat.ts:8-31`)는 "A와 B가 각각 한 번씩 보낼 때마다 1 카운트, 쌍 완성 후 리셋"하는 방식. 동일 sender 연속 발신은 1 라운드로 합산.
- Analyzer spec L176-177: "라운드트립 정의는 `countRoundTrips`를 SQL로 1:1 포팅해야 의미 일치 — Implementer/Analyzer 재확인 필요 지점".
- FE는 현재 `messages` 전체를 순회하며 계산하지만, BE 쪽 SQL 포팅에서 `window function`으로 이식할 때 엣지 케이스(첫 메시지의 sender 여부, 동일 sender 연속 5회 후 타 sender 1회 등)가 동일한 카운트를 내는지 **합동 테스트 필요**.
- 테스트 케이스 제안(Analyzer §FE 구현 시 주의사항 3번에 이미 열거): 0, 4, 5, 9, 10 메시지 시나리오 + 동일 sender 연속 케이스.
- 본 FE 작업 단독으론 문제 없음. BE 구현 PR에서 반드시 검증.

### [INFO] Discover 상수 블러 — 혼선 방지 주석 양호

- `SwipeCard.tsx:88` 인라인 주석: "Discover는 첫인상 음성 중심 UX — 사진은 항상 블러 (잠금 해제 대상 아님)".
- Planner §11-1 + Analyzer L202 + Implementer L53 + SwipeCard 본문 주석까지 **4중 문서화**. 향후 "Discover에도 잠금 해제 연동" 요구가 들어올 때 의사결정 경로가 명확함.
- 향후 요구 시 변경 포인트는 단 한 줄(`blurRadius={24}` → 조건부). 리스크 낮음.

### [INFO] `is_unlocked` optional 정책 승격 타이밍

- 현재: `is_unlocked?: boolean` (types L127).
- BE가 응답에 이 필드를 추가·배포한 직후 FE에서 `?`를 제거하여 required로 승격 가능. 단, API 버전 혼재 환경(구 BE + 신 FE 조합)이 가능하다면 optional 유지가 안전.
- Planner §12 / Implementer §확인한 TODO §3과 일치.

### [INFO] 캐시 무효화 메커니즘 부재

- `src/hooks/useMatches.ts`는 `useState` 기반 수동 관리. react-query/SWR 미사용 확인(`src` 전체 grep 0건).
- 결과: 사용자가 채팅방에서 5번째 라운드트립에 도달해도 매칭 목록으로 돌아올 때까지 `loadMatches()`가 재호출되지 않으면 상태 반영 안 됨. 단 사용자는 보통 목록 탭 재진입 시 `loadMatches`를 호출하므로 실무상 큰 문제는 아님.
- Analyzer §실시간 브로드캐스트 + Planner §11-6 결정과 일치: "본 작업은 정적 값만, 실시간 갱신은 별도 티켓".
- 권고: 후속 티켓에서 `useMatches` 내부에 포커스 기반 refetch(`useFocusEffect`)를 추가하거나, 채팅 `send` 후 `countRoundTrips(messages) === UNLOCK_MAIN_PHOTO_AT` 순간에 매칭 목록 캐시 키 무효화 훅을 끼워 넣는 방식.

---

## 통과 항목 (체크리스트)

- [x] 응답 shape과 FE 타입 필드명·타입 일치 (match_id, created_at, partner, last_message, unread_count)
- [x] 배열 반환 일치 (BE `res.json([])` / `res.json(results)` vs FE `Promise<MatchListItem[]>`)
- [x] 필수/선택(nullable) 필드 구분 일치: `partner: MatchPartner | null`, `last_message: {...} | null`, `is_unlocked?: boolean`
- [x] 페이지네이션 파라미터 일치: FE `limit`, `before` (services/matches.ts:9-10) ↔ BE Zod schema `matchListQuerySchema` (match.ts:8-11)
- [x] 인증 흐름: `api.get`이 `Authorization: Bearer` 자동 첨부, 401 시 refresh 재시도 (api.ts:124-138). BE `authMiddleware` 일치
- [x] 엔드포인트 커버리지: `GET /api/matches`, `DELETE /api/matches/:matchId` 두 라우트 모두 `services/matches.ts`에서 커버
- [x] snake_case ↔ snake_case 필드명 일관성 (Discover/Profile 등 타 도메인과도 일관)
- [x] FE 단독 선 배포 시나리오에서 런타임 에러 0건 (undefined 폴백 흐름 정상)

---

## 핵심 지적 (요약)

- **CRITICAL: 0건**
- **WARNING: 2건**
  1. BE에 `UNLOCK_MAIN_PHOTO_AT` 상수 부재 — 후속 BE 구현 PR에서 `5`로 반드시 고정 필요.
  2. `countRoundTrips`의 SQL 포팅 시 엣지 케이스 합동 테스트 필수 (동일 sender 연속·첫 sender 결정 등).
- **INFO: 4건** — 회귀 없음 확인, 분기 동작 정확, 4중 문서화, optional 승격 타이밍, 캐시 무효화 후속 티켓.

본 FE 변경만으로는 기능 회귀가 없고, BE 후속 구현을 위한 인터페이스 계약(snake_case `is_unlocked: boolean`)이 분명하게 준비되어 있음. 통과.
