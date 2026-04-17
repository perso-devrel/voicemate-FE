# RLS_SUMMARY.md

> 2026-04-18 Phase 4 #25 · Supabase RLS 정책 요약.
> 소스: `voicemate-BE-v2/supabase/migrations/*.sql` (읽기 전용).
> FE는 `EXPO_PUBLIC_SUPABASE_ANON_KEY`로 RLS 하에 Realtime/Storage만 접근한다.

## 1. 테이블별 RLS

### `profiles` (001 line 64–80)
- `SELECT`: `is_active = true` 인 모든 프로필. (Anonymous + authenticated 모두 접근 가능)
- `INSERT`: `auth.uid() = id` — 자기 자신만 생성.
- `UPDATE`: `auth.uid() = id` — 자기 자신만 수정.
- **FE 영향**: FE는 BE 경유만으로 접근하므로 직접적 영향 없음. 단, `EXPO_PUBLIC_SUPABASE_ANON_KEY`가 노출되더라도 읽기 범위가 `is_active=true` 프로필로 한정된다는 사실이 공개 키 안전성의 근거.

### `swipes` (001 line 83–89)
- `INSERT`: `auth.uid() = swiper_id`
- `SELECT`: `auth.uid() = swiper_id`
- **FE 영향**: FE는 BE API를 경유하므로 영향 없음. 공격자가 anon key로 DB를 건드려도 자신 스와이프만 볼 수 있음.

### `matches` (001 line 92–99)
- `SELECT`: `auth.uid() IN (user1_id, user2_id)`
- `INSERT`: `WITH CHECK (true)` — **Service role 전용** (BE 서비스가 mutual like 시 생성).
- **FE 영향**: FE가 직접 insert 불가 — 정상.

### `messages` (001 line 101–120)
- `SELECT`: 매치 참여자(`matches.user1_id` 또는 `user2_id`가 `auth.uid()`).
- `INSERT`: `auth.uid() = sender_id` AND 매치 참여자.
- **FE 영향 (중요)**: FE의 **Realtime 구독**도 이 정책을 거친다. `subscribeToMessages`가 `setRealtimeAuth(jwt)` 이후에 연결되는 것이 필수이며, 토큰이 만료되면 채널이 `CHANNEL_ERROR`로 종료된다 (`docs/BE_DEPENDENCIES.md §1`).

### `blocks` (002 line 14–27)
- `INSERT`: `auth.uid() = blocker_id`
- `SELECT`: `auth.uid() = blocker_id`
- `DELETE`: `auth.uid() = blocker_id`
- **FE 영향**: BE 경유.

### `reports` (002 line 40–47)
- `INSERT`: `auth.uid() = reporter_id`
- `SELECT`: `auth.uid() = reporter_id`
- **FE 영향**: BE 경유.

### `user_preferences` (002 line 60–63)
- `ALL`: `auth.uid() = user_id` (관리자는 `ALL` 단일 정책으로 묶임)
- **FE 영향**: BE 경유.

## 2. Storage RLS

- Storage 정책 자체는 BE의 Supabase 대시보드 설정. 본 요약에는 포함하지 않음.
- FE는 photos/voice clone을 BE `/api/profile/photos`, `/api/voice/clone`로만 업로드. Storage에 직접 접근하지 않음.
- 업로드 결과는 서명된 URL 또는 public URL로 반환됨 (BE 구현 세부). **FE는 URL을 받아 `<Image>`/`createAudioPlayer`로 직접 fetch** — 이 경로의 캐싱/CDN 설정은 BE 책임.

## 3. anon key 노출 안전성 근거

`EXPO_PUBLIC_SUPABASE_ANON_KEY`는 번들에 노출되지만:

- 쓰기 권한은 RLS `WITH CHECK`로 전부 `auth.uid()` 기반 제약.
- 읽기도 대부분 소유자 필드를 요구 (profiles는 활성 프로필만 공개, 매치/메시지/차단/신고는 소유자 전용).
- Realtime 구독은 JWT setAuth 이후에만 RLS 통과.

따라서 키 자체 노출은 감당 가능하며, 의심되는 RLS 우회가 확인되면 BE 측 정책을 수정해야 한다 (본 문서 업데이트 후 `BE_DEPENDENCIES.md`에 섹션 추가).

## 4. FE 액션 아이템

- ✅ Realtime 구독 경로에 `setRealtimeAuth` 선행 보장 완료.
- 🟡 401 시 자동 재로그인/refresh 후 재구독 — 이미 `AppState` 복귀 시 수행되지만 foreground 중간 실패는 미대응. Phase 6 개선 후보.
- 🟡 `anon key`가 로그/Sentry에 유출되지 않도록 민감 로그 점검 — 현재 `console.log`는 1건만 있고 토큰 미포함. Phase 6 로깅 구조화 시 재확인.

## 변경 이력

| 날짜 | 내용 | 담당 |
|------|------|------|
| 2026-04-18 | 초기 작성 (7개 테이블 요약) | Ralph Loop |
