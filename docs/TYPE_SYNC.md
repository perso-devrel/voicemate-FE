# TYPE_SYNC.md

> 2026-04-18 Phase 4 #22 · BE Zod 스키마와 FE `src/types/index.ts` 대조.
> BE는 읽기 전용이므로 불일치 해소는 FE 쪽에서만(주로 client-side validation 보강).

## 범례

- ✅ 동일
- 🟡 형태는 일치하나 클라이언트 검증이 약함 (BE 거절 시점에만 실패)
- 🔴 타입/형태 불일치 — 즉시 수정 대상

## 1. Profile (`/api/profile/me`)

| 필드 | BE Zod (`profileUpsertSchema`) | FE (`ProfileUpsertRequest`) | 상태 |
|------|-------------------------------|-----------------------------|------|
| `display_name` | string · min 1, max 50 | `string` | 🟡 max 50 클라이언트 미검증 — `<Input maxLength={50}>`로 이미 묶여 있으므로 실질 OK |
| `birth_date` | string · `YYYY-MM-DD` regex | `string` | 🟡 regex 미검증 — `maxLength={10}` 입력 제한만 있음 |
| `gender` | enum | `'male' \| 'female' \| 'other'` | ✅ |
| `nationality` | string · min 2, max 5 | `string` | 🟡 `maxLength={5}` 있음. min 2 클라이언트 미검증 |
| `language` | string · min 2, max 5 | `string` | ✅ (Picker로 SUPPORTED LanguageCode만 입력) |
| `bio` | string · max 500, nullable | `string \| null \| undefined` | 🟡 `maxLength={500}` 있음 |
| `interests` | array · max 10, each max 30 | `string[] \| undefined` | ✅ (addInterest에서 10/30 cap 존재) |

**Profile 응답 (`Profile` 타입)**:
- BE가 반환하는 full profile은 BE 서비스 레이어에서 구성됨. FE `Profile` 인터페이스는 supabase `profiles` 테이블 + `elevenlabs_voice_id` / `voice_sample_url` / `voice_clone_status` 필드를 포함.
- 현재 FE 인터페이스는 테이블 컬럼명과 일치한다고 가정 — 실제 응답 shape을 기기 QA에서 logging으로 1회 확인 권고 (`needs-manual-qa`).

## 2. Preference (`/api/preferences`)

| 필드 | BE Zod (`preferenceSchema`) | FE (`PreferenceUpdateRequest`) | 상태 |
|------|----------------------------|-------------------------------|------|
| `min_age` | int · 18–100, default 18 | `number?` | 🟡 클라이언트는 범위 검증 없음. BE 400 surface. |
| `max_age` | int · 18–100, default 100 | `number?` | 🟡 〃 |
| 교차 검증 | `min_age ≤ max_age` | — | 🟡 FE 수정 전에 저장 시 400 가능. UX 개선 후보. |
| `preferred_genders` | array<enum>, default all | `('male' \| 'female' \| 'other')[]?` | ✅ |
| `preferred_languages` | array<string 2–5> | `string[]?` | ✅ (Chip 기반 ISO 코드) |

## 3. Message

### Request (`sendMessageSchema`)
| 필드 | BE | FE (`SendMessageRequest`) | 상태 |
|------|----|---------------------------|------|
| `text` | string · 1–1000 trimmed | `string` | ✅ (채팅 입력바 `maxLength={1000}`) |

### Query (`messageQuerySchema`)
| 필드 | BE | FE 호출 | 상태 |
|------|----|---------|------|
| `limit` | int · 1–100, default 50 | FE는 항상 50 하드코딩 (`useChat.ts:20`) | ✅ |
| `before` | datetime | FE가 ISO string 전달 (`useChat.ts:37`) | ✅ |

## 4. Swipe

### Body (`swipeBodySchema`)
| 필드 | BE | FE (`SwipeRequest`) | 상태 |
|------|----|---------------------|------|
| `swiped_id` | UUID | `string` | ✅ |
| `direction` | `like | pass` | `'like' \| 'pass'` | ✅ |

### Query (`discoverQuerySchema`)
| 필드 | BE | FE 호출 | 상태 |
|------|----|---------|------|
| `limit` | int · 1–50, default 10 | `getCandidates(limit)` 기본 10 | ✅ |

## 5. Block (`blockSchema`)

| 필드 | BE | FE (`BlockRequest`) | 상태 |
|------|----|---------------------|------|
| `blocked_id` | UUID | `string` | ✅ |

## 6. Report (`reportSchema`)

| 필드 | BE | FE (`ReportRequest`) | 상태 |
|------|----|---------------------|------|
| `reported_id` | UUID | `string` | ✅ |
| `reason` | enum | `ReportReason` | ✅ |
| `description` | string · max 500 | `string?` | 🟡 클라이언트 max 검증 없음 |

## 7. 응답 shape 샘플 확인 필요 (`needs-manual-qa`)

BE 서비스 레이어에서 구성되는 응답(FE에서 Zod 미정의 경로) — 실제 JSON을 1회 확인 권장:
- `GET /api/matches` → `MatchListItem[]` (RPC 기반, `unread_count` 존재 확인)
- `GET /api/discover` → `DiscoverCandidate[]` (필드 완전성)
- `POST /api/voice/clone` → `VoiceCloneResponse` (status가 즉시 'ready'가 아닐 가능성)

위 3개는 device QA 1회 로깅으로 shape 확정 가능. 확인 후 본 문서의 해당 행을 ✅로 갱신.

## Phase 6 후속 제안

1. **Preference min ≤ max 클라이언트 검증** — 저장 전 Alert으로 UX 개선.
2. **프로필 birth_date YYYY-MM-DD 포맷 힌트** — 자동 마스킹 또는 `YYYY-MM-DD` 포맷 검사.
3. **Report description maxLength={500}** — UI 입력 제한.
4. 위 3개는 각각 PR 단위로 쪼갤 수 있으며, Phase 6 리팩토링 트랙에서 우선순위 지정.
