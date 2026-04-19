# SECURITY_SWEEP.md

> 2026-04-17 Phase 1 #6 · `voicemate-FE` 보안 1차 스윕 결과.
> 결과: **심각 이슈 발견 없음.** 후속 권고는 §5.

## 1. 기밀 파일 노출 점검 (git 추적)

| 검사 항목 | 결과 |
|-----------|------|
| `.env` / `.env.*` git 추적 | ✅ 미추적 (`.gitignore`로 차단) |
| `*.key`, `*.pem`, `credentials.json` | ✅ 없음 |
| `google-services.json`, `GoogleService-Info.plist` | ✅ 없음 |
| git 전체 히스토리에서 추가된 기밀 파일 | ✅ `.env.example` 외 없음 |

검증 명령:
```bash
git ls-files | grep -iE "\.(env|key|pem)|credentials\.json|google-services|GoogleService"
# → .env.example (유일, 비밀값 없음)

git log --all --diff-filter=A --name-only | grep -E "\.env$|\.key$|\.pem$"
# → 결과 없음
```

## 2. Supabase SERVICE_ROLE 노출 점검

- 소스 내 `service_role` / `SERVICE_ROLE` 하드코딩 **없음** (문서 언급만 존재).
- `.env.example` 및 현지 `.env` 파일에 `EXPO_PUBLIC_SUPABASE_ANON_KEY`만 존재.
- FE에서 Supabase 접근 경로는 `@supabase/supabase-js` anon key 기반 Realtime 구독 뿐. Storage/DB 직접 쓰기는 BE 경유.

**결론**: ✅ SERVICE_ROLE 키 FE 잔류 없음.

## 3. 외부 유료 API 키 하드코딩 점검

| 키 패턴 | 발견 | 비고 |
|---------|------|------|
| `sk_live`, `sk_test` (Stripe) | ❌ 없음 | |
| `AIza[0-9A-Za-z_-]{30,}` (Google API key) | ❌ 없음 | Google 로그인은 Web Client ID만 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`로 사용 |
| `xoxb-`, `xoxp-` (Slack) | ❌ 없음 | |
| `ghp_` (GitHub token) | ❌ 없음 | |
| `eyJ*…` (JWT 하드코딩) | ❌ 없음 | |
| ElevenLabs API 키 / 직접 호출 | ❌ 없음 | `elevenlabs_voice_id` 필드만 사용 — 값은 BE에서 채움 |
| perso.ai API 키 / 직접 호출 | ❌ 없음 | |

## 4. `EXPO_PUBLIC_*` 공개 안전성

| 키 | 용도 | 노출 안전성 |
|----|------|-------------|
| `EXPO_PUBLIC_API_URL` | BE REST 엔드포인트 | ✅ 공개 가능 |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ 공개 가능 |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ 공개 가능 (RLS에 의존) — RLS 점검은 Phase 4 #25 |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth client id | ✅ 공개 가능 (OAuth 공개 id) |

> ⚠️ `EXPO_PUBLIC_*` 접두사가 붙은 값은 Expo 번들에 리터럴로 박혀 디바이스에 배포된다는 점을 리뷰 시 항상 재확인한다.

## 5. 후속 권고 (분리 이슈로 운용)

1. **RLS 요약 문서화**: `EXPO_PUBLIC_SUPABASE_ANON_KEY`의 안전성은 BE의 RLS에 전적으로 의존. Phase 4 #25에서 `docs/RLS_SUMMARY.md` 작성 예정.
2. **민감 로그 제거 확인**: 현재 `console.log`는 1건(`src/services/realtime.ts:51`)만 존재하고 매치 ID 외 민감값 미포함. `__DEV__` 가드는 Phase 6 DX에서 추가.
3. **Git 히스토리 시크릿 스캔 자동화**: 현재 수동. 차기 Phase 6에서 `gitleaks` 또는 GitHub Secret Scanning 활성화 여부를 `docs/PHASE6_PROPOSALS.md`로 에스컬레이션.
4. **token 로깅 리그레션 방지**: `ApiRequestError` 구성 시점에서 Authorization 헤더가 로깅되지 않도록 Phase 6 에러 핸들링 리팩토링에서 테스트 추가.

## 6. 변경 이력

| 날짜 | 내용 | 담당 |
|------|------|------|
| 2026-04-17 | 1차 스윕 초기 등록 | Ralph Loop |
