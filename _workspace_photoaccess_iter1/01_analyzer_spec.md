# 매칭 목록 프로필 사진 잠금 해제(is_unlocked) BE API/DB 스펙

조사 대상 BE 경로 (이 PC 로컬):
- 최신: `C:\Users\EST-INFRA\voicemate-BE-v2\` (package.json mtime 2026-04-23)
- 구버전: `C:\Users\EST-INFRA\voicemate-BE\` (package.json mtime 2026-04-15)
- Planner가 가정한 `C:\Users\sejin\Documents\voicemate_BE`는 이 PC에 존재하지 않음 → 로컬 클론인 위 두 경로로 대체 확인

---

## DB 변경 필요 여부 (최종 판정)

[x] **필요 없음** — 기존 `messages(match_id, sender_id, created_at)`로 `is_unlocked`를 파생 계산 가능. `matches` 테이블에 `unlocked_at`/`round_trip_count`/`is_unlocked` 류의 컬럼은 **존재하지 않으며 추가하지 않아도 구현 가능**.

근거:
- `matches` 테이블 정의(`001_initial_schema.sql:32-39`) — 잠금 관련 컬럼 없음
- `002_blocks_reports_preferences_read.sql:70-71` — 이후 추가된 컬럼은 `unmatched_at`, `unmatched_by`뿐
- `003`, `004` — `bio_audio_url`, `messages.emotion` 컬럼만 추가 (잠금 무관)
- BE 전체 소스(`src/**`, `supabase/**`)에서 `unlock|round_trip|photo_reveal|reveal_stage` 키워드 **0건** (node_modules 제외)
- 집계 비용이 부담스러워질 경우를 대비한 denormalization/트리거 선택지는 Planner 섹션 10에 이미 정리됨. **현 규모에선 불필요**.

감사/실시간 브로드캐스트 목적이 명확히 요구될 때만 `matches.unlocked_at timestamptz`를 추가하는 것을 다음 티켓에서 재고 가능.

## BE API 변경 필요 여부 (최종 판정)

[x] **필요 — 응답 DTO에 `is_unlocked` 필드 추가 필요.**

근거:
- `GET /api/matches` 라우트(`voicemate-BE-v2/src/routes/match.ts:80-98`)의 응답 객체는 `{ match_id, created_at, partner, last_message, unread_count }` 다섯 필드만 포함. 잠금 상태 없음.
- `get_match_summaries` RPC(`002_blocks_reports_preferences_read.sql:82-110`)도 `last_message_*`, `unread_count`만 반환.
- 즉 FE가 잠금 여부를 목록 단계에서 알 길이 **현재 없음**. 메시지 리스트를 매치마다 불러오는 것은 N+1.

수정 파일 (BE):
1. `voicemate-BE-v2/src/routes/match.ts`
   - 조합 단계(라인 80~98)에서 각 `match.id`에 대한 라운드트립 수를 조인으로 가져와 `is_unlocked = round_trips >= UNLOCK_MAIN_PHOTO_AT(=5)` 로 계산 후 응답에 포함
2. `voicemate-BE-v2/supabase/migrations/005_match_round_trips.sql` (신규)
   - `get_match_summaries` RPC를 확장하거나 별도 RPC `get_match_round_trips(match_ids UUID[])` 추가
   - 라운드트립 정의: 동일 `match_id` 내 `sender_id`가 A→B→A→B…로 교대되는 페어 수 (FE `src/utils/chat.ts:8-28`의 `countRoundTrips`를 SQL로 포팅)
3. 상수 위치 제안: `voicemate-BE-v2/src/constants/chat.ts` 신설 또는 환경변수. FE의 `UNLOCK_MAIN_PHOTO_AT=5`(`src/utils/chat.ts:1`)와 반드시 동일 값 유지.

## FE에서 사용할 실제 필드명/타입

BE가 snake_case 직렬화를 사용하므로(`match_id`, `last_message`, `unread_count` 모두 snake) 일관성을 위해 동일 스타일 권장:

```ts
// src/types/index.ts 의 MatchListItem 확장
export interface MatchListItem {
  match_id: string;
  created_at: string;
  partner: MatchPartner | null;
  last_message: { ... } | null;
  unread_count: number;
  is_unlocked: boolean;        // 추가 (BE 배포 전까지는 optional로 두는 편이 안전)
  // 선택적으로 함께 받으면 UI/감사에 유용:
  // round_trip_count?: number; // 디버그/프로그레스 표시용 (BE가 같이 주면 채택)
  // unlocked_at?: string | null;
}
```

FE 호환성 전략: BE 배포 전 FE가 먼저 배포되는 경우를 고려해 **일시적으로 `is_unlocked?: boolean`** 로 두고, `MatchItem.tsx`에서 `blur={!item.is_unlocked}` 폴백이 `undefined → blur=true`로 동작하도록 유지 (Planner 11번/12번 결정과 일치).

---

# 엔드포인트 상세

## 엔드포인트 목록

| Method | Path              | 인증 | 설명                                                    | 파일                               |
|--------|-------------------|------|---------------------------------------------------------|------------------------------------|
| GET    | `/api/matches`    | ✅   | 내 매치 목록 (상대 프로필 + 마지막 메시지 + 미읽음 수)  | `src/routes/match.ts:27`           |
| DELETE | `/api/matches/:matchId` | ✅ | 언매치 (soft delete: `unmatched_at` 세팅)            | `src/routes/match.ts:104`          |

※ 둘 다 `router.use(authMiddleware)`로 보호됨.

## GET /api/matches (현재 구현)

**Request:**
- Headers: `Authorization: Bearer <jwt>`
- Query:
  - `limit` number int 1..100, optional, default 20
  - `before` ISO datetime string, optional (커서 페이지네이션, `created_at < before`)

**Response 200** (현재 shape — 잠금 필드 없음):
```json
[
  {
    "match_id": "uuid",
    "created_at": "2026-04-20T12:34:56.000Z",
    "partner": {
      "id": "uuid",
      "display_name": "Alice",
      "photos": ["https://.../a.jpg", "..."],
      "nationality": "KR",
      "language": "ko"
    },
    "last_message": {
      "id": "uuid",
      "original_text": "hi",
      "sender_id": "uuid",
      "created_at": "2026-04-20T13:00:00.000Z"
    },
    "unread_count": 3
  }
]
```
- 매치 없음이면 `[]` 반환 (`match.ts:52-54`).
- `partner`는 프로필이 없거나 비활성이면 `null` (`match.ts:87`).
- `last_message`는 메시지가 아직 없으면 `null` (`match.ts:88-95`).
- `unread_count`는 `viewer_id`가 아닌 상대 발신 && `read_at IS NULL` 집계 (`002_blocks_reports_preferences_read.sql:97-101`).

**응답 DTO 목표 shape (변경 요청):**
```json
[
  {
    "match_id": "uuid",
    "created_at": "...",
    "partner": { ... },
    "last_message": { ... } | null,
    "unread_count": 0,
    "is_unlocked": true
  }
]
```

**Error Responses (현재 코드):**
| 코드 | 조건                                  | 메시지                      |
|------|---------------------------------------|-----------------------------|
| 400  | Zod 스키마 위반 (limit 범위, before 포맷) | `validateQuery`가 처리 (`middleware/validate`) |
| 401  | 인증 실패                             | `authMiddleware`            |
| 500  | Supabase 쿼리 에러                    | `{ error: error.message }`  |

## DELETE /api/matches/:matchId

**Request:** Path param `matchId` UUID.

**Response 200:** `{ "status": "unmatched" }`

**Error Responses:**
| 코드 | 조건                                         | 메시지                        |
|------|----------------------------------------------|-------------------------------|
| 401  | 인증 실패                                    | `authMiddleware`              |
| 404  | 매치가 없거나 이미 unmatched                 | `{ error: 'Match not found' }`|
| 500  | Supabase 업데이트 에러                       | `{ error: error.message }`    |

---

# DB 스키마 관련 스냅샷

## `public.matches` (현재, `001_initial_schema.sql:32-39` + `002:70-71`)
```sql
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user1_id, user2_id),
  CHECK (user1_id < user2_id)
);
-- 002에서 추가:
ALTER TABLE matches ADD COLUMN unmatched_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE matches ADD COLUMN unmatched_by UUID REFERENCES profiles(id);
```
→ 잠금 관련 컬럼 없음. 변경 불필요 (상단 판정).

## `public.messages` (잠금 판정 데이터 원천)
관련 컬럼: `match_id`, `sender_id`, `created_at`.  
인덱스: `idx_messages_match ON messages(match_id, created_at)` → 라운드트립 집계에 충분.

## `get_match_summaries` RPC
현재 반환 컬럼: `match_id, last_message_id, last_message_text, last_message_sender_id, last_message_created_at, unread_count(BIGINT)`.  
→ `round_trip_count BIGINT`를 추가 컬럼으로 확장하거나, 별도 RPC로 제공. FE 성능 차원에선 **기존 RPC 확장이 선호됨**(단일 왕복).

### 제안 SQL 스케치 (FE utils/chat.ts 포팅)

```sql
-- 라운드트립: sender 교대 수 (FE countRoundTrips 로직 포팅)
-- A→B→A→B… 교대될 때 증가. 동일 sender 연속은 0.5라운드로 취급하여 floor(pairs / 2) 와 유사하게
-- 처리하거나, FE처럼 전환(transition) 횟수를 세는 방식을 택한다. FE 로직 재확인 후 등가 이식 필요.

CREATE OR REPLACE FUNCTION get_match_summaries_v2(
  match_ids UUID[], viewer_id UUID, unlock_threshold INT DEFAULT 5
) RETURNS TABLE (
  match_id UUID,
  last_message_id UUID,
  last_message_text TEXT,
  last_message_sender_id UUID,
  last_message_created_at TIMESTAMPTZ,
  unread_count BIGINT,
  round_trip_count INT,
  is_unlocked BOOLEAN
) AS $$
  ...
$$ LANGUAGE sql STABLE;
```

> 라운드트립 정의는 FE `src/utils/chat.ts:8-28`의 `countRoundTrips`를 SQL로 1:1 포팅해야 의미 일치. Implementer/Analyzer 재확인 필요 지점.

---

# 비즈니스 규칙

- **잠금 해제 임계치**: FE 상수 `UNLOCK_MAIN_PHOTO_AT=5` (`voicemate-FE/src/utils/chat.ts:1`). BE에는 **해당 상수 정의 없음** → 신설 필요. Single source of truth로 만들려면 BE 상수 파일 또는 DB 파라미터(`app.settings`)로 관리하고 FE와 동일 값 유지.
- **`UNLOCK_ALL_PHOTOS_AT=10`**: 본 작업 범위 밖 (Planner §11-4, §12). 목록 썸네일은 1장만 표시되므로 main unlock 한 단계만 필요.
- **현재 FE 잠금 계산 위치**: `countRoundTrips`는 채팅방(`app/(main)/chat/[matchId].tsx:288-290`)에서만 호출. 매칭 목록에선 계산 불가능했음.

# 실시간 브로드캐스트

- BE 전체에서 `realtime|channel|broadcast` 키워드 **0건** — 서버에서 명시적으로 브로드캐스트하는 코드 없음.
- 단 `001_initial_schema.sql:123` — `ALTER PUBLICATION supabase_realtime ADD TABLE messages;` → 메시지 INSERT는 Supabase Realtime으로 자동 퍼블리시됨.
- **잠금 해제 순간**의 별도 이벤트는 **없음**. FE는 다음 중 택1:
  - 채팅방에서 5번째 라운드트립 도달 시 클라이언트가 `queryClient.invalidateQueries(['matches'])` 호출 → 목록 새로고침 (권장, 추가 인프라 불필요)
  - 목록 진입 시 항상 refetch
  - (장기) BE가 `matches:{id}` 채널에 `unlocked` 이벤트 broadcast 추가

Planner §11-6 결정과 일치: **본 작업은 정적 값만, 실시간 갱신은 별도 티켓**.

---

# FE용 TypeScript 타입 정의

```ts
// src/types/index.ts (기존 MatchListItem 확장)

export interface MatchPartner {
  id: string;
  display_name: string;
  photos: string[];
  nationality: string;
  language: string;
}

export interface MatchListItem {
  match_id: string;
  created_at: string;
  partner: MatchPartner | null;
  last_message: {
    id: string;
    original_text: string;
    sender_id: string;
    created_at: string;
  } | null;
  unread_count: number;

  /**
   * 프로필 사진 잠금 해제 여부 (메인 사진).
   * BE가 `round_trip_count >= 5`일 때 true로 내려준다.
   * BE 배포 이전 호환을 위해 optional로 두고, 미존재 시 blur=true로 폴백.
   */
  is_unlocked?: boolean;
}
```

MatchItem 사용 예:
```tsx
<Avatar uri={partner?.photos[0]} size={54} ringed={hasUnread} blur={!item.is_unlocked} />
```
→ `item.is_unlocked === undefined` ⇒ `!undefined === true` ⇒ blur (기존 UX와 동일).

---

# FE 구현 시 주의사항

1. **타입 optional 정책**: BE 배포 타이밍이 FE보다 늦을 수 있음. 초기에는 `is_unlocked?: boolean`로 opt-in, BE 배포 후 `is_unlocked: boolean`로 승격.
2. **탐색 탭은 대상 아님**: `SwipeCard`는 API 플래그와 무관히 하드코딩 `blurRadius`로 처리. BE 응답은 건드릴 필요 없음.
3. **라운드트립 기준 동기화**: BE가 구현할 SQL `round_trip_count`가 FE `countRoundTrips`(`src/utils/chat.ts:8-28`)와 **정확히 같은 수**를 내야 채팅방의 `photoRevealStage`와 목록 `is_unlocked`가 어긋나지 않음. Implementer 단계에서 BE/FE 합동 검증 케이스(0, 4, 5, 9, 10 메시지) 필수.
4. **서비스 계층 무수정**: `src/services/matches.ts`의 `getMatches`는 타입만 확장되면 자동으로 `is_unlocked`를 포함한 객체를 반환. 리팩토링 없음.
5. **캐싱/실시간 갱신**: 채팅방에서 5라운드 도달 시 `queryClient.invalidateQueries(['matches'])` 한 줄 추가 권장 (후속 티켓 가능). 본 작업에선 최소한 목록 진입/포그라운드 복귀 시 refetch면 충분.
6. **MatchPartner 차이점**: v1 라우트는 `birth_date/interests/bio/bio_audio_url`을 포함하지만 v2는 `id/display_name/photos/nationality/language` 5개로 축소. FE `MatchPartner` 인터페이스는 v2에 정합 (`src/types/index.ts:101-107`). 본 작업과는 무관하지만 통합 리뷰 시 유의.

---

# Open Questions (Reviewer/Implementer 확인)

- [ ] 배포 중인 BE가 `voicemate-BE-v2` 맞는지 (이 PC 로컬이 아닌 원격 배포본 기준). 두 버전 모두 `is_unlocked` 없음은 동일하나 DTO 차이가 있음.
- [ ] BE 상수 관리 규칙 — `src/constants/`가 없다면 신설 위치 합의 필요.
- [ ] `get_match_summaries`를 확장할지, 신규 RPC를 만들지 — 둘 다 가능. 확장이 네트워크 1회 왕복 관점에서 유리.
