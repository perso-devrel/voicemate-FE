# 프로필 사진 블러/잠금 상태 일원화 구현 요약

## 생성/수정된 파일

| 파일 경로 | 작업 | 라인 | 설명 |
|----------|------|------|------|
| `src/types/index.ts` | 수정 | 126~127 | `MatchListItem`에 `is_unlocked?: boolean` optional 필드 추가 |
| `src/components/matches/MatchItem.tsx` | 수정 | 25 | `<Avatar ... blur />` → `<Avatar ... blur={!item.is_unlocked} />` |
| `src/components/discover/SwipeCard.tsx` | 수정 | 89 | `<Image>`에 `blurRadius={24}` 상수 추가 (항상 블러) |

## 변경 diff 요약

### 1) `src/types/index.ts`
```diff
 export interface MatchListItem {
   match_id: string;
   created_at: string;
   partner: MatchPartner | null;
   last_message: { ... } | null;
   unread_count: number;
+  // BE가 per-match로 라운드트립 집계하여 내려주는 값. 미정의 시 잠금 상태로 간주.
+  is_unlocked?: boolean;
 }
```

### 2) `src/components/matches/MatchItem.tsx`
```diff
-      <Avatar uri={partner?.photos[0]} size={54} ringed={hasUnread} blur />
+      <Avatar uri={partner?.photos[0]} size={54} ringed={hasUnread} blur={!item.is_unlocked} />
```

### 3) `src/components/discover/SwipeCard.tsx`
```diff
         {photo ? (
-          <Image source={{ uri: photo }} style={styles.photo} />
+          // Discover는 첫인상 음성 중심 UX — 사진은 항상 블러 (잠금 해제 대상 아님)
+          <Image source={{ uri: photo }} style={styles.photo} blurRadius={24} />
         ) : (
```

## BE 배포 전/후 예상 동작 표

| 화면 | 조건 | BE 응답의 `is_unlocked` | FE 동작 |
|------|------|------------------------|---------|
| Discover (`SwipeCard`) | - (플래그 무관) | 사용 안 함 | **항상 `blurRadius={24}` 블러** (기존 원본 노출 버그 수정) |
| Matches (`MatchItem`) | BE 미배포 | `undefined` | `!undefined === true` → `blur=true` (기존 "항상 블러" 동작과 동일 → 회귀 없음) |
| Matches (`MatchItem`) | BE 배포 후 라운드트립 < 5 | `false` | `!false === true` → `blur=true` (잠금) |
| Matches (`MatchItem`) | BE 배포 후 라운드트립 ≥ 5 | `true` | `!true === false` → `blur=false` (원본 노출, **잠금 해제**) |
| Chat 내부 | (본 작업 범위 밖) | - | 기존 `photoRevealStage(roundTrips)` 로직 그대로 유지 |

## 주요 결정사항

1. **Discover는 상수 블러**: `blurRadius={24}` 하드코딩. Planner §11-1 결정과 일치 (비즈니스 규칙: 첫인상 음성 중심 UX).
2. **`is_unlocked`는 optional**: BE 배포 타이밍 차이 대비. BE 배포 이후 required로 승격 가능 (Analyzer §FE용 타입 정의, Planner §12 주의사항과 일치).
3. **`BlurredImage` 공통 컴포넌트 신설 안 함**: 기존 `Avatar`의 `blur` prop과 RN `Image`의 `blurRadius`를 재사용. Planner §6 결정.
4. **블러 강도 선택**: `SwipeCard`는 `24`, `Avatar`(size=54)는 내부 계산값 `~19`. 둘 다 얼굴 식별 불가한 강도이나, 큰 사진일수록 더 강한 블러가 필요하므로 Planner §12 제안값 24 채택.

## 확인해본 TODO

### ✅ `Avatar`의 `blur` prop 실제 구현 확인
- `src/components/ui/Avatar.tsx:34` 코드: `blurRadius={blur ? Math.max(8, size * 0.35) : 0}`
- `blur` prop이 이미 지원되고 있으며, 동적 blurRadius 계산 로직 포함.
- ⇒ `MatchItem`에서 `<Avatar ... blur={!item.is_unlocked} />`로 기존 prop 재사용 가능 확인.

### ✅ 다른 곳의 블러 처리 영향 범위 확인
- `src/app/(main)/chat/[matchId].tsx:481` — `blurRadius={blurMainPhoto ? 40 : 0}`: 채팅방 내부 헤더 사진. **본 작업 범위 밖** (Planner §12 명시). 기존 `photoRevealStage(roundTrips)` 로직 유지.
- `src/components/chat/ChatBubble.tsx:97` — `<Avatar ... blur={blurAvatar} />`: 채팅방 말풍선 아바타. 범위 밖.
- `src/components/ui/PhotoBackground.tsx` — 배경 블러 전용. 범위 밖.

### ✅ `useMatches` / `services/matches.ts` 무수정 검증
- 서비스 계층은 BE 응답을 그대로 통과시키므로 타입만 확장되면 자동으로 `is_unlocked` 포함 객체 반환. 수정 불필요 (Analyzer §FE 구현 시 주의사항 §4 일치).

## 미구현/후속 작업 (본 작업 범위 밖)

- [ ] **BE 측**: `GET /api/matches` 응답에 `is_unlocked` 필드 추가 (Analyzer 스펙 참고).
- [ ] **BE 측**: `UNLOCK_MAIN_PHOTO_AT=5` 상수를 BE로 이전, FE `src/utils/chat.ts:1`과 값 동기화.
- [ ] **FE 후속 티켓**: 채팅방에서 5라운드 도달 시 `queryClient.invalidateQueries(['matches'])` 호출 (실시간 잠금 해제 UX).
- [ ] **Designer 검토**: Discover 블러 강도(24) 적정성 + 잠금 아이콘/라벨 필요 여부.
- [ ] **Reviewer 검토**: `is_unlocked` optional/required 정책 최종 승격 타이밍.
