# 프로필 사진 블러/잠금 상태 일원화 설계

## 1. 목표

탐색 탭(Discover)과 매칭 목록(Matches)에서 프로필 사진의 블러 처리 규칙을 **"잠금 풀림(unlocked)" 단일 상태**로 일원화한다.

- **Discover(탐색 탭)**: 항상 `blur=true` (잠금 해제 대상 아님, 첫인상 음성 중심)
- **Matches(매칭 목록)**: `isUnlocked === true` → 원본 / `false` → 블러
- **Chat(채팅방)**: 기존 `photoRevealStage(roundTrips)` 로직 유지하되, 가능하면 같은 `isUnlocked` 의미와 정합

### 현재 관찰된 버그

| # | 화면 | 현재 동작 | 기대 동작 |
|---|------|----------|----------|
| 1 | Discover (`SwipeCard`) | 원본 노출 | 항상 블러 |
| 2 | Matches (`MatchItem`) | 무조건 블러 (`<Avatar ... blur />`) | 잠금 해제 시 원본 |

## 2. 진입점 / 종료점

- **진입**:
  - 탐색 탭 → `src/app/(main)/(tabs)/discover.tsx` → `SwipeCard`
  - 매칭 탭 → `src/app/(main)/(tabs)/matches.tsx` → `MatchItem`
- **종료**: 두 화면 모두 사진 블러 규칙이 동일한 "unlocked" 단일 진리원천에 의해 결정됨

## 3. 현재 구현 조사 결과

### 탐색 탭 (Discover)
- 화면 파일: `src/app/(main)/(tabs)/discover.tsx:93-98` — `<SwipeCard candidate={current} ... />` 렌더
- 카드 컴포넌트: `src/components/discover/SwipeCard.tsx:86-94`
  ```
  <View style={styles.cover}>
    {photo ? (
      <Image source={{ uri: photo }} style={styles.photo} />     ← blurRadius 없음
    ) : ( ... placeholder ... )}
  </View>
  ```
- **문제**: `Image`에 `blurRadius` prop이 전혀 걸려있지 않음

### 매칭 목록 (Matches)
- 화면 파일: `src/app/(main)/(tabs)/matches.tsx:21-33` — `<MatchItem item={item} ... />`
- 아이템 컴포넌트: `src/components/matches/MatchItem.tsx:25`
  ```
  <Avatar uri={partner?.photos[0]} size={54} ringed={hasUnread} blur />
  ```
- **문제**: `blur` prop이 상수 `true`로 하드코딩 → `MatchListItem`에는 잠금 상태 필드가 없어 판정 불가

### 블러 지원 기존 컴포넌트
- `src/components/ui/Avatar.tsx:14` — `blur?: boolean` prop 이미 존재 (`blurRadius = Math.max(8, size * 0.35)`)
- `src/components/ui/PhotoBackground.tsx` — 배경용 블러 전용, 개별 프로필 사진에는 부적합

### 잠금 해제 로직 (현 상태)
- `src/utils/chat.ts:8-42`
  - `countRoundTrips(messages)` — 양방향 메시지 페어 카운트
  - `UNLOCK_MAIN_PHOTO_AT = 5`, `UNLOCK_ALL_PHOTOS_AT = 10`
  - `photoRevealStage(roundTrips)` → `'blurred' | 'main' | 'all'`
- 사용처: `src/app/(main)/chat/[matchId].tsx:288-290`
  - 즉, **잠금 여부는 현재 클라이언트가 메시지 리스트로 직접 계산**. BE가 플래그를 내려주지 않음.
- `MatchListItem` 타입(`src/types/index.ts:115-126`)에는 `is_unlocked`/`round_trips` 같은 필드 없음

## 4. 화면 트리 (expo-router)

수정 대상은 기존 화면/컴포넌트. **신규 라우트 없음**.

- `src/app/(main)/(tabs)/discover.tsx` (수정 없음 — 내부 카드 컴포넌트만 변경)
- `src/app/(main)/(tabs)/matches.tsx` (수정 없음 — 아이템 컴포넌트만 변경)
- `src/components/discover/SwipeCard.tsx` (수정)
- `src/components/matches/MatchItem.tsx` (수정)
- (선택) `src/types/index.ts` — `MatchListItem`에 `is_unlocked` 필드 추가

## 5. 데이터 흐름

### 현재 (문제 상태)
```
Discover: BE /api/discover → DiscoverCandidate → SwipeCard → <Image />          (blur 없음)
Matches:  BE /api/matches  → MatchListItem    → MatchItem  → <Avatar blur />    (항상 blur)
Chat:     메시지 리스트     → countRoundTrips  → photoRevealStage (클라 계산)
```

### 목표 (일원화 후)
```
Discover: 상수 true → SwipeCard 내부 Image blurRadius 적용          (항상 blur)
Matches:  BE /api/matches → MatchListItem.is_unlocked → MatchItem → <Avatar blur={!isUnlocked} />
Chat:     (기존 유지) countRoundTrips ≥ UNLOCK_MAIN_PHOTO_AT이 곧 isUnlocked의 의미
```

### 단일 진리원천(SSOT) 결정

- **Discover**: `blur`는 **상수 `true`**. 플래그 불필요.
- **Matches**: `MatchListItem.is_unlocked: boolean` (BE 응답에 추가)
  - 계산 근거는 BE에서 `match_id` 기준 메시지 round_trip 수 ≥ `UNLOCK_MAIN_PHOTO_AT`
  - (폴백 대안) BE 추가가 어려우면, FE에서 `last_message`만으로 유추하기는 어려움 → 반드시 BE 필드 필요

### 가정 (TBD → Analyzer 확정)

- 가정 A: "unlocked"의 임계치는 FE 기존 값(UNLOCK_MAIN_PHOTO_AT=5) 그대로 BE로 이전
- 가정 B: "all photos unlocked" 단계(=10)는 본 작업 범위 **밖** (매칭 목록 썸네일에는 "main unlock" 한 단계만 필요). 채팅방 내부는 그대로.
- 가정 C: 매칭 목록 썸네일은 `partner.photos[0]` 한 장만 표시되므로 `main` vs `all` 구분 불필요 → `is_unlocked` 단일 bool로 충분

## 6. 컴포넌트 분해

### 재사용 vs 신설

| 목적 | 결정 | 근거 |
|------|------|------|
| 아바타 블러 처리 | **재사용** `Avatar` (`blur` prop 이미 존재) | `src/components/ui/Avatar.tsx:14` |
| 큰 카드 사진 블러 처리 | **재사용** RN `Image`의 `blurRadius` prop | `SwipeCard`의 `Image` 한 곳만 수정, 별도 컴포넌트 불필요 |
| `BlurredImage` 신설 | **불필요** | 두 화면 각각 Avatar/Image를 이미 쓰고 있고 중복 없음. 신설 시 오히려 배선만 늘어남 |

### 수정 세부

1. **`src/components/discover/SwipeCard.tsx`**
   - `<Image source={{ uri: photo }} style={styles.photo} />` → `blurRadius={24}` 추가 (탐색 탭은 항상 블러)
   - 선택: 잠금 오버레이 아이콘/라벨 표시 고려 (디자이너 단계에서 확정)

2. **`src/components/matches/MatchItem.tsx`**
   - `<Avatar ... blur />` → `<Avatar ... blur={!item.is_unlocked} />`
   - `is_unlocked`가 `undefined`일 경우 안전 폴백: `blur={!item.is_unlocked}` (undefined → falsy → blur=true)
   - 선택: 잠금 해제 시 마이크로 인터랙션(페이드인) — Designer 검토 후

3. **`src/types/index.ts`** (BE 스펙 확정 후)
   - `MatchListItem`에 `is_unlocked: boolean` 필드 추가

## 7. 상태 관리

| 상태 | 위치 | 이유 |
|------|------|------|
| Discover blur 여부 | 하드코딩 상수 `true` | 화면 특성상 변경 없음 |
| Matches 각 아이템 unlock 여부 | 서버 상태 (`MatchListItem.is_unlocked`) | 진리원천은 BE. 기존 `useMatches` 훅이 그대로 전달 |
| Chat reveal stage | 기존 `countRoundTrips` 유지 | 변경 범위 아님 |

→ 신규 store/훅/서비스 없음. 기존 `useMatches`는 수정 불필요 (BE 응답이 자동으로 타입 확장 수용).

## 8. 영향 파일

### 신규
- 없음

### 수정
- `src/components/discover/SwipeCard.tsx` — `<Image>`에 `blurRadius` 상수 추가
- `src/components/matches/MatchItem.tsx` — `blur={!item.is_unlocked}` 로 변경
- `src/types/index.ts` — `MatchListItem`에 `is_unlocked: boolean` 추가 (BE 스펙 확정 후)

### 검증만 필요 (변경 없음 예상)
- `src/app/(main)/(tabs)/discover.tsx`
- `src/app/(main)/(tabs)/matches.tsx`
- `src/hooks/useMatches.ts`
- `src/services/matches.ts`
- `src/components/ui/Avatar.tsx`

## 9. BE 연동 필요성 (Analyzer 확인 항목)

Analyzer가 다음을 BE 프로젝트(`C:\Users\sejin\Documents\voicemate_BE`)에서 확인해야 한다:

### API 스펙
- [ ] `GET /api/matches` 응답 DTO (`MatchListItem` 상당)에 `is_unlocked` / `isUnlocked` / `unlocked` / `round_trips` 같은 잠금 관련 필드가 **이미 있는지**
- [ ] 있다면 정확한 이름/타입. 없다면 신설 제안

### 서비스/DB 계층
- [ ] 매치의 message round-trip 계산 로직이 BE에 존재하는가 (예: `src/services/matches.ts` 또는 뷰/함수)
- [ ] `matches` 테이블에 `unlocked_at` 혹은 `round_trip_count` 같은 컬럼이 있는지
- [ ] `messages` 테이블로부터 round-trip을 집계하는 SQL 뷰(`v_match_round_trips` 등)가 있는지

### Zod/스키마
- [ ] `MatchListItem` 응답 스키마 정의 파일 경로 (e.g. `src/schemas/match.ts`)
- [ ] 새 필드 추가 시 영향 받는 컨슈머 (FE 타입, 테스트)

### 실시간
- [ ] 잠금이 해제되는 순간 Supabase 채널로 브로드캐스트되는지 (예: `match:{id}` 채널)
- [ ] 없다면 FE가 폴링/재조회해야 하는지 정책 결정 필요

## 10. DB 변경 추정 (Analyzer 최종 확정)

### 잠정 판단: **DB 스키마 변경은 필요 없을 가능성이 높음**

- 근거 1: 잠금 기준은 `countRoundTrips(messages)` — 이미 `messages` 테이블의 `sender_id`, `match_id`, `created_at`으로 **계산 가능한 파생값**
- 근거 2: 따라서 BE는 서빙 시점에 집계(쿼리)로 `is_unlocked`를 계산하여 응답에 붙이면 충분
  - 구현 옵션 A: SQL 서브쿼리로 round-trip 카운트 후 threshold 비교
  - 구현 옵션 B: `v_match_intimacy` 같은 materialized view
  - 구현 옵션 C: `matches.unlocked_at` timestamp 컬럼 신설 (잠금 해제 시각 기록) — **성능/감사 목적이면 고려 가치 있음**

### DB 변경이 **필요한 경우**
- 매칭 목록 쿼리가 N+1 쿼리로 성능 이슈 → `matches` 테이블에 denormalized `round_trip_count` 또는 `is_unlocked` 컬럼 + 메시지 삽입 트리거
- 감사/BI 목적으로 언락 시각 기록이 필요 → `unlocked_at timestamptz`

→ 최종 판단은 Analyzer가 BE 코드/DB 조사 후 확정.

## 11. 의사결정 / 가정

| # | 결정 | 비고 |
|---|------|------|
| 1 | Discover는 항상 블러, 데이터 플래그 무시 | 비즈니스 규칙. 변경 여지 있으면 후속 RFC |
| 2 | Matches 잠금 판정의 SSOT는 **BE `is_unlocked`** | 클라 계산은 메시지 리스트를 가져와야 하므로 목록 화면에선 비현실적 |
| 3 | `BlurredImage` 공통 컴포넌트 신설 **안함** | 현재 중복 없음 + Avatar가 이미 blur 지원 |
| 4 | 잠금 단계는 bool 단일 (main/all 구분 X) | 목록 썸네일은 사진 1장만 표시 |
| 5 | 임계치 `UNLOCK_MAIN_PHOTO_AT=5`를 BE로 이전 | Analyzer가 BE의 상수/설정 위치 확인 필요 |
| 6 (TBD) | 잠금 상태 실시간 갱신 (메시지 5회 도달 시 목록 자동 업데이트) | 본 작업 범위에 포함할지 결정 — **권고: 본 작업은 정적 값만, 실시간 갱신은 별도 티켓** |

## 12. 주의 / 충돌 지점

- **채팅방 내부(`ChatBubble`, `[matchId].tsx`)는 본 작업 범위 **아님****. `photoRevealStage`가 `main`/`all` 두 단계를 가지므로 목록의 bool과 의미가 다름. 차후 통합 리팩토링 시 Chat의 reveal 단계와 Match의 `is_unlocked` 관계를 재정의해야 함.
- **BE가 `is_unlocked` 필드를 추가하기 전까지** FE가 배포되면 `item.is_unlocked` 가 `undefined` → blur=true 폴백. 과거 동작(무조건 블러)과 동일하므로 회귀 없음. 하지만 "매칭 목록 잠금 해제" UX는 BE 배포 이후에야 활성화됨. → Analyzer/Implementer 작업 순서 중요.
- **Discover 카드 블러가 음성 중심 UX의 의도이면 유지**, 그러나 `blurRadius=24` 같은 강한 값으로 얼굴 인식 완전 차단. 디자이너가 수치/오버레이 확인 필요.
- **타입 호환성**: `MatchListItem.is_unlocked` 필드 추가 시 optional(`?`)로 추가해야 기존 로그/캐시 응답과 호환. BE가 항상 반환을 보장하면 required로 변경.

## 13. 후속 작업 제안

1. (Analyzer) BE 조사 후 `is_unlocked` 엔드포인트 확정 or 추가 설계
2. (Implementer) 위 수정 파일 3개 적용
3. (Designer) Discover 카드 블러 강도와 잠금 아이콘/라벨 필요 여부 검토
4. (Reviewer) 타입 optional/required 정책, 폴백 동작 확인
5. (QA) `tsc`, `eslint`, `jest` — Discover/Matches 스냅샷 및 Avatar 단위 테스트
6. (추후 티켓) Matches 실시간 잠금 해제 브로드캐스트, Chat reveal stage와 목록 unlock 의미 통합
