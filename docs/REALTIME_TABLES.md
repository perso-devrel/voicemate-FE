# REALTIME_TABLES.md

> 2026-04-18 Phase 4 #24 · Supabase Realtime publication에 등록된 테이블 목록.
> `voicemate-BE-v2/supabase/migrations/**`에서 `ALTER PUBLICATION supabase_realtime ADD TABLE ...` 구문을 추출해 정리.

## 현재 publication 구성

| 테이블 | 마이그레이션 파일 | 사용 FE 경로 |
|--------|-----------------|--------------|
| `messages` | `001_initial_schema.sql:123` | `src/services/realtime.ts` — `channel('messages_<matchId>').on('postgres_changes', ..., { table: 'messages' })` |

> Realtime 대상은 `messages` 단 1개 테이블. 다른 테이블의 실시간 구독은 BE/FE 어디에서도 수행하지 않는다.

## 이벤트 사용 범위

### messages — INSERT

- 매치 상대가 보낸 메시지가 즉시 반영되도록 `postgres_changes` INSERT 이벤트를 수신한다.
- 필터: `match_id=eq.<matchId>`.

### messages — UPDATE

- 오디오 더빙 상태 변경(`audio_status: processing → ready/failed`) 반영.
- 필터: 동일.

## JWT/Auth 요구사항

- `supabase.realtime.setAuth(token)`이 반드시 `subscribe()` 이전에 await로 완료돼야 한다. FE 현재 구현은 `src/services/realtime.ts:20-21`에서 이를 만족.
- 토큰이 만료된 경우 `CHANNEL_ERROR` 상태로 채널이 끊긴다. 현재 FE는 `AppState` foreground 전환 시 재구독(`useChat.ts:101-106`). **상태 자체의 재시도 backoff는 미구현** → `docs/BE_DEPENDENCIES.md §1`의 방어 로직 섹션에서 추적.

## 제안 (BE 변경 없음)

- `matches` 테이블을 publication에 추가하면 "새 매치 생성 즉시 매치 탭 갱신"이 가능해지지만, 현재 FE는 `AppState` 복귀 시 fetch로 충분하다고 판단. 필요 시 `docs/BE_DEPENDENCIES.md`에 추가.
- `profiles`는 대량 구독 시 부하가 크므로 publication 추가 지양.

## 변경 이력

| 날짜 | 내용 | 담당 |
|------|------|------|
| 2026-04-18 | 최초 작성 | Ralph Loop |
