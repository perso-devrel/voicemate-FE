# BE_DEPENDENCIES.md

> `voicemate-FE`가 BE(`voicemate-BE-v2`)에 요구하는 계약/상태/설정.
> TASK.md §🚫 3 에 의해 BE 코드는 수정하지 않고 본 문서로 제안만 남긴다.

## 작성 원칙
- 한 항목 = (요구 내용 / FE 증거 파일 / BE 확인 포인트 / 현재 가정 / 위반 시 증상).
- FE 우회책(폴백 폴링, UI 안내 등)이 있으면 함께 기록한다.

---

## 1. Supabase Realtime — `messages` 테이블 변경 스트림

**요구 내용**
- `messages` 테이블의 INSERT/UPDATE 이벤트가 `supabase_realtime` publication에 포함돼 있어야 한다.
- 클라이언트가 보낸 JWT(`supabase.realtime.setAuth(token)`)로 `messages` 행에 접근 권한이 있어야 한다 (`match_id=eq.<matchId>` 필터 통과).

**FE 증거**
- `src/services/realtime.ts:23-53` — `supabase.channel('messages_<matchId>').on('postgres_changes', {...}).subscribe()`
- `src/hooks/useChat.ts:77-113` — `AppState`가 `active`로 복귀할 때마다 재구독.

**BE 확인 포인트 (`voicemate-BE-v2`)**
- `supabase/migrations/**` 내 `ALTER PUBLICATION supabase_realtime ADD TABLE messages;` 존재.
- `messages` 테이블 RLS 정책에 `auth.uid() IN (match.user_a, match.user_b)` 조건이 SELECT/INSERT/UPDATE에 적용됐는지.

**현재 가정**
- BE는 위 두 조건을 만족한다. Phase 4 #24에서 publication 목록, #25에서 RLS 정책을 문서화한다.

**위반 시 증상 / FE 방어 로직**
- 채널 상태가 `CHANNEL_ERROR` 또는 `TIMED_OUT`으로 고정되고 상대 메시지가 보이지 않음.
- 현재 FE는 foreground 복귀 시에만 재구독. **CHANNEL_ERROR 상태에서 자동 backoff 재시도 없음** → 별도 이슈로 추적(향후 개선 후보).
- 대안 폴백: `getMessages(matchId, 50)` 30초 간격 폴링. Realtime이 여전히 구독 중일 때는 중복 배너 메시지가 나오지 않도록 `id` 기반 set 유지 (`useChat.ts:85-88`에서 이미 처리).

---

## 2. ElevenLabs 음성 더빙 (`messages.audio_url`, `audio_status`)

**요구 내용**
- 메시지 전송 시 BE가 비동기로 음성 더빙을 트리거하고, 성공/실패를 `audio_status` 필드로 FE에 전달 (`processing` / `ready` / `failed`).
- 완료된 오디오의 `audio_url`은 일정 시간(예: 24h) 이상 유효해야 한다.

**FE 증거**
- `src/components/chat/ChatBubble.tsx`, `src/components/chat/AudioPlayer.tsx`
- `src/hooks/useChat.ts:67-74` — `retryAudio`가 `audio_status: 'processing'`으로 낙관적 업데이트.

**BE 확인 포인트**
- ElevenLabs API 호출은 **BE 측 큐(Queue) / Worker**에서 수행. FE는 직접 호출 금지(TASK.md §🚫 1).
- `dubbing_write` 권한 범위가 BE 서비스 계정 JWT에 있어야 한다.

**현재 가정**
- `audio_status` 라이프사이클이 `processing → ready/failed`로 1회 전이 후 고정.

**위반 시 증상**
- 오디오 재생 실패 시 Alert만 노출. 현재 FE는 상태를 그대로 재시도 가능 (UI에서 retry 버튼 필요 여부는 Phase 3 UX 이슈에서 검토).

---

## 3. Match 엔드포인트 응답 타입

**요구 내용**
- `/matches` 응답 행에 `last_message`(nullable) / `unread_count` 포함 여부가 FE UI에 영향을 준다.

**FE 증거**
- `src/services/matches.ts`, `src/hooks/useMatches.ts`

**BE 확인 포인트**
- Phase 4 #22에서 BE Zod 스키마와 FE 타입 대조 예정.

---

## 4. 차단/신고 엔드포인트

**요구 내용**
- `POST /block`, `POST /report` 응답이 성공/실패를 JSON으로 명확히 구분해야 한다.
- 차단된 사용자는 이후 `/discover` 결과에서 제외돼야 한다 (서버 필터링).

**FE 증거**
- `src/services/block.ts`, `src/services/report.ts`, `src/app/(main)/settings/blocked.tsx`.

**BE 확인 포인트**
- Phase 4 #21 API 인벤토리에서 경로 확인.

---

## 5. 에러 응답 포맷

**요구 내용**
- 4xx/5xx 응답은 `{ error: string }` 형식이어야 한다 (FE `ApiRequestError.errorMessage`로 직접 surface됨).

**FE 증거**
- `src/services/api.ts:11-19` (`ApiRequestError` 클래스)
- Phase 4 #23에서 에러 문자열 집합을 수집해 i18n 매핑 레이어 제안 예정.

---

## 변경 이력

| 날짜 | 내용 | 담당 |
|------|------|------|
| 2026-04-17 | 초기 생성 (Realtime·더빙·Match·Block/Report·에러 포맷 5개 섹션) | Ralph Loop |
