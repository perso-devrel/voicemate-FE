# Changelog

> `develop_loop` 브랜치를 기준으로, 2026-04-17 ~ 2026-04-18 동안 진행된 Ralph Loop 변경 이력.

## [Unreleased] — `develop_loop`

### Added

- **Docs 스위트** (22개 신규 문서) — 모두 `docs/`에 위치.
  - `STRUCTURE_BASELINE.md`, `DIAGNOSIS.md`, `TYPE_DEBT.md`, `LINT_WARNINGS.md`, `DEPENDENCY_STATUS.md`, `SECURITY_SWEEP.md`
  - `BE_DEPENDENCIES.md` (6 섹션: Realtime, 더빙, Match, Block/Report, 에러 포맷, 업로드 타임아웃)
  - `UX_STATES.md`, `I18N_REVIEW.md`, `A11Y_AUDIT.md`
  - `API_MAP.md`, `TYPE_SYNC.md`, `ERROR_MAP.md`, `REALTIME_TABLES.md`, `RLS_SUMMARY.md`
  - `QA_CHECKLIST.md`, `TROUBLESHOOTING.md`
- 루트 `README.md`.
- 테스트 인프라: `jest-expo`, `@testing-library/react-native`, `react-test-renderer`, `jest` devDependency + `jest.config.js` + `jest.setup.js` (`__DEV__` 전역).
- ESLint 인프라: `eslint@^9` + `eslint-config-expo@~9.2.0` + `eslint.config.js` (flat preset).
- 공용 유틸:
  - `src/utils/audioPlayerManager.ts` — 단일 active player 매니저(+ 6 테스트).
  - `src/utils/errors.ts` — `describeError`, `errorStatus`(+ 6 테스트).
- 공용 컴포넌트:
  - `src/components/ui/EmptyState.tsx` — icon + title + subtitle + CTA (+ 테스트).
- 회귀 테스트:
  - `src/utils/age.test.ts` (8 cases)
  - `src/constants/languages.test.ts` (9 cases)
  - `src/services/api.test.ts` (6 cases, ApiRequestError 계약)
  - `src/services/api.timeout.test.ts` (4 cases, fetch wrapper)
  - `src/components/ui/Button.test.tsx` (4 cases, 독립성 + a11y 타입 계약)
  - `src/i18n/parity.test.ts` (3 cases, ko/en 대칭)
- i18n 키: `matches.goToDiscover` 추가 (ko/en).

### Changed

- `src/components/ui/Button.tsx`
  - `isButtonDisabled(disabled, loading)` 순수 헬퍼 노출.
  - `accessibilityRole="button"` + `accessibilityLabel` + `accessibilityState` 기본 부여.
- `src/app/(main)/chat/[matchId].tsx`
  - 입력바 paddingBottom: `Math.max(insets.bottom, 12) + 8`로 Android edge-to-edge 방어.
  - 오디오 재생을 `createAudioPlayerManager`로 치환 — 리스너/플레이어 누수 3경로 차단.
- `src/app/(main)/(tabs)/matches.tsx` — 빈 상태를 공용 `EmptyState`로 교체 + Discover CTA.
- `src/app/(main)/setup/profile.tsx` — 언어 Picker invariant 주석.
- `package.json` / `package-lock.json` — devDep 추가 + safe patch 2건:
  - `@supabase/supabase-js` 2.103.0 → 2.103.3
  - `react-i18next` 17.0.3 → 17.0.4
- `docs/DIAGNOSIS.md` — ESLint 설치 상태, 테스트 러너 상태 반영.

### Security

- `.env` 커밋 이력 0건 확인(`docs/SECURITY_SWEEP.md`).
- `SERVICE_ROLE` 키 / 하드코딩 API 키 / ElevenLabs 직접 호출 0건.

### Deferred (Phase 6 Candidates)

- `any` 30건 축소 (`docs/TYPE_DEBT.md`).
- ESLint 경고 7건 해소 (`docs/LINT_WARNINGS.md`).
- BE 에러 문자열 → i18n 매핑 레이어 구현 (`docs/ERROR_MAP.md`).
- Realtime `CHANNEL_ERROR` 자동 백오프 재시도.
- 사진/음성 업로드 60초 타임아웃 래퍼 통합 (`docs/BE_DEPENDENCIES.md §6`).
- Preference `min_age ≤ max_age` 클라이언트 validation (`docs/TYPE_SYNC.md`).
- 미사용 i18n 키 4개 제거 (`docs/I18N_REVIEW.md`).

## 참고

- `PROGRESS.md` — iteration 단위 상세 로그.
- `TASK.md` — Ralph Loop 규칙 및 Phase 정의.
