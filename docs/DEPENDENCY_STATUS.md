# DEPENDENCY_STATUS.md

> 2026-04-17 Phase 1 #7 · `voicemate-FE` 의존성 현황 스냅샷.
> 전면 재조사는 Expo SDK 메이저 업그레이드(SDK 55 이상) 검토 시점에.

## 1. 본 이슈에서 적용한 safe 업데이트

| 패키지 | 이전 | 이후 | 비고 |
|--------|------|------|------|
| `@supabase/supabase-js` | 2.103.0 | 2.103.3 | patch (버그픽스) |
| `react-i18next` | 17.0.3 | 17.0.4 | patch |

나머지 패키지는 `wanted == current`여서 semver 범위 내 최신. major 업그레이드는 아래 3절에서 기록만 유지.

## 2. 런타임 의존성 (보류 목록)

| 패키지 | Current | Latest | 보류 사유 |
|--------|---------|--------|-----------|
| `expo` | 54.0.33 | 55.0.15 | SDK 55 전면 업그레이드 — TASK.md §🚫 10 |
| `expo-asset` | 12.0.12 | 55.0.15 | 〃 (SDK 통합 관리) |
| `expo-audio` | 1.1.1 | 55.0.13 | 〃 |
| `expo-auth-session` | 7.0.10 | 55.0.14 | 〃 |
| `expo-constants` | 18.0.13 | 55.0.14 | 〃 |
| `expo-crypto` | 15.0.8 | 55.0.14 | 〃 |
| `expo-file-system` | 19.0.21 | 55.0.16 | 〃 |
| `expo-image-picker` | 17.0.10 | 55.0.18 | 〃 |
| `expo-linking` | 8.0.11 | 55.0.13 | 〃 |
| `expo-router` | 6.0.23 | 55.0.12 | 〃 |
| `expo-secure-store` | 15.0.8 | 55.0.13 | 〃 |
| `expo-status-bar` | 3.0.9 | 55.0.5 | 〃 |
| `expo-web-browser` | 15.0.10 | 55.0.14 | 〃 |
| `react` | 19.1.0 | 19.2.5 | React 19 minor — SDK 54가 정한 버전 유지 |
| `react-dom` | 19.1.0 | 19.2.5 | 〃 |
| `react-native` | 0.81.5 | 0.85.1 | SDK 54 매핑 (0.81.x) 유지 |
| `react-native-gesture-handler` | 2.28.0 | 2.31.1 | SDK 54 권장 범위 유지 |
| `react-native-reanimated` | 4.1.7 | 4.3.0 | SDK 54 권장 범위 유지 |
| `react-native-safe-area-context` | 5.6.2 | 5.7.0 | 〃 |
| `react-native-screens` | 4.16.0 | 4.24.0 | 〃 |
| `react-native-svg` | 15.12.1 | 15.15.4 | 〃 |
| `zustand` | 4.5.7 | 5.0.12 | major — Phase 6에서 별도 제안 (API breaking) |

## 3. devDependencies (보류 목록)

| 패키지 | Current | Latest | 보류 사유 |
|--------|---------|--------|-----------|
| `eslint` | 9.39.4 | 10.2.0 | major — Phase 6 별도 제안 |
| `eslint-config-expo` | 9.2.0 | 55.0.0 | SDK 54 → 9.x 범위 고정 |
| `jest` | 29.7.0 | 30.3.0 | major — `jest-expo@54`가 29 기반 |
| `jest-expo` | 54.0.17 | 55.0.16 | SDK 54 유지 |
| `react-test-renderer` | 19.1.6 | 19.2.5 | React 19.1 범위 일치 유지 |
| `typescript` | 5.8.3 | 6.0.3 | major — Phase 6 제안 |

## 4. 취약성 스캔 (`npm audit`)

- 5 low severity vulnerabilities (transitive). 모두 transitive + non-prod 경로.
- 주요 경로 대부분 `jest-expo` → `@expo/cli` → legacy helper.
- 해결책이 `--force`가 필요한 breaking change로 분류되어 있으므로 **본 이슈에서는 보류**.
- Phase 6 또는 SDK 55 업그레이드 시점에 재평가.

## 5. 규칙 재확인

- TASK.md §🚫 10: Expo SDK 54 → 55 전면 업그레이드 금지. 본 문서의 보류 목록은 이 규칙의 합법적 기록.
- 개별 minor/patch 업데이트는 앞으로도 본 이슈와 동일한 경로(단건 이슈 + PR)로 처리.
