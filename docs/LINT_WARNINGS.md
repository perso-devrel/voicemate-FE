# LINT_WARNINGS.md

> 2026-04-17 Phase 1 #3 · `eslint-config-expo` flat preset 도입 후 남은 경고.
> 0 errors / 7 warnings. 개별 수정은 Phase 6 리팩토링 트랙.

## 현황 (`npm run lint` 출력 요약)

| # | 파일 | 라인 | 규칙 | 요약 |
|---|------|------|------|------|
| 1 | `src/app/(auth)/login.tsx` | 30 | `react-hooks/exhaustive-deps` | `useEffect` 의존성 `handleGoogleLogin` 누락 |
| 2 | ~~`src/app/(main)/(tabs)/discover.tsx`~~ | ~~11~~ | ~~no-unused-vars~~ | ✅ 해결 (#67) |
| 3 | `src/app/_layout.tsx` | 14 | `react-hooks/exhaustive-deps` | `useEffect`에 `tryAutoLogin` 누락 |
| 4 | ~~`src/components/chat/AudioPlayer.tsx`~~ | ~~2~~ | ~~no-unused-vars~~ | ✅ 해결 (#67) |
| 5 | `src/hooks/useVoice.ts` | 64 | `react-hooks/exhaustive-deps` | `useCallback`에 `stopPolling` 누락 |
| 6 | `src/i18n/index.ts` | 21 | `import/no-named-as-default-member` | `i18n.use(...)` → `import { use } from 'i18next'` 권고 |
| 7 | ~~`src/services/api.ts`~~ | ~~140~~ | ~~no-require-imports~~ | ✅ 해결 (#67 — `registerOnSessionExpired` 시임 도입) |

## 처리 방침

- **본 이슈(Phase 1 #3 — GH #5, Lint 도입)는 설치/설정까지만 포함.** 경고 해소는 아래와 같이 쪼개서 Phase 6에서 진행.
- 각 경고는 ①의도된 코드일 가능성 ②회귀 리스크 ③테스트 커버리지를 함께 평가한 뒤 수정.

### 제안 Phase 6 이슈 단위
1. `react-hooks/exhaustive-deps` 3건 — 각 파일의 실제 의도(mount-only vs 동적 의존) 확인 후 필요 시 `useCallback` 재구성.
2. `no-unused-vars` 2건 — 단순 삭제.
3. `import/no-named-as-default-member` (i18n 초기화) — `i18n.use(initReactI18next)` 패턴은 i18next 문서에도 있어 의도적일 수 있음. 룰 단위 비활성화 또는 named import 전환.
4. `no-require-imports` (`src/services/api.ts:140`) — `require('react-native').Platform.OS` 같은 동적 import 회피 패턴일 수 있음. `import { Platform } from 'react-native'`로 정적화 가능한지 검토.

## 비고

- 린트 스크립트 exit code는 경고만 있을 때 0이므로 `develop_loop` 기준 CI는 그린 상태 유지.
- 이후 이터레이션에서 위 경고를 해소할 때마다 이 문서의 해당 행을 삭제하고 PR 본문에서 링크한다.
