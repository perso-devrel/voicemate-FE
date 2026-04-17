# VoiceMate FE

음성 클론 기반 크로스 언어 소개팅 앱의 Expo (React Native + TypeScript) 프론트엔드.

## 핵심 기술 스택

| 항목 | 버전 |
|------|------|
| Expo SDK | 54 |
| React Native | 0.81.5 |
| React | 19.1.0 |
| TypeScript | 5.8.3 |
| 라우팅 | `expo-router` 6.x (`src/app/**`) |
| 상태 | `zustand` 4.5 |
| i18n | `i18next` + `react-i18next` |
| 실시간 | `@supabase/supabase-js` Realtime |

## 디렉터리 구조

```
src/
├── app/          # expo-router 파일 기반 라우트
├── components/   # UI / 도메인 컴포넌트
├── constants/    # colors, config, languages
├── hooks/        # 도메인 훅
├── i18n/         # i18next + locales/ko,en
├── services/     # REST + Realtime 서비스
├── stores/       # zustand 스토어
├── types/        # 공용 타입
└── utils/        # 순수 유틸 + 테스트
```

상세 베이스라인은 [`docs/STRUCTURE_BASELINE.md`](docs/STRUCTURE_BASELINE.md) 참고.

## 설치

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` 플래그는 `@testing-library/react-native` / React 19 peer 범위 제약으로 필요.

## 환경 변수

`.env.example`를 복사해 `.env`를 만든다.

```bash
cp .env.example .env
```

| 키 | 용도 |
|----|------|
| `EXPO_PUBLIC_API_URL` | BE REST 엔드포인트 (예: `http://localhost:3000`) |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (RLS 의존) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth Web Client ID |

> ⚠️ `SERVICE_ROLE` 계열 키는 FE에 넣지 않는다. 자세한 내용은 [`docs/SECURITY_SWEEP.md`](docs/SECURITY_SWEEP.md).

## 실행

### BE와 동시 실행

1. BE 먼저 기동:
   ```bash
   cd ../voicemate-BE-v2
   npm run dev   # 기본 포트 3000
   ```
2. FE 기동 (이 레포):
   ```bash
   npm run start
   ```
3. Expo Dev Tools에서 QR 스캔.

### 기기/에뮬레이터 네트워크

- **실기기 (LAN)**: `.env`의 `EXPO_PUBLIC_API_URL`을 PC의 LAN IP로 설정 (예: `http://192.168.0.10:3000`).
- **Android 에뮬레이터**: `http://10.0.2.2:3000` (에뮬레이터 → 호스트 매핑).
- **iOS 시뮬레이터**: `http://localhost:3000` 사용 가능.
- Expo Go 앱을 쓸 경우 같은 Wi-Fi 대역 확인.

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run start` | Expo Dev Server |
| `npm run android` | Android run (prebuild 필요 시 주의) |
| `npm run ios` | iOS run (Mac 전용) |
| `npm run web` | web target |
| `npm run lint` | ESLint (`eslint-config-expo` flat preset) |
| `npm run typecheck` | TypeScript strict |
| `npm test` | Jest + babel-preset-expo |

## 디버깅

- Metro 콘솔에서 `[Realtime <matchId>] SUBSCRIBED | CHANNEL_ERROR | TIMED_OUT` 로그 확인 — `__DEV__`에서만 출력.
- 공용 에러 헬퍼: [`src/utils/errors.ts`](src/utils/errors.ts).
- UX 상태 가이드: [`docs/UX_STATES.md`](docs/UX_STATES.md).
- Troubleshooting: [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

## 테스트

```bash
npm test
```

현재 9 suite / 53+ cases. 신규 코드는 순수 함수 단위 테스트 우선 (`src/utils/`).

## BE 연동 참조

| 문서 | 내용 |
|------|------|
| [`docs/API_MAP.md`](docs/API_MAP.md) | FE 서비스 ↔ BE 라우트 매핑 |
| [`docs/TYPE_SYNC.md`](docs/TYPE_SYNC.md) | BE Zod ↔ FE 타입 정합성 |
| [`docs/ERROR_MAP.md`](docs/ERROR_MAP.md) | BE 에러 문자열 → i18n 계획 |
| [`docs/REALTIME_TABLES.md`](docs/REALTIME_TABLES.md) | Supabase publication 대상 |
| [`docs/RLS_SUMMARY.md`](docs/RLS_SUMMARY.md) | 테이블별 RLS 정책 요약 |
| [`docs/BE_DEPENDENCIES.md`](docs/BE_DEPENDENCIES.md) | BE 변경 제안 전체 목록 |

## 수동 QA / 릴리즈

- [`docs/QA_CHECKLIST.md`](docs/QA_CHECKLIST.md): 기기별 수동 QA 체크리스트.
- [`CHANGELOG.md`](CHANGELOG.md): 주요 변경점.

## 기여

- 모든 변경은 `develop_loop` 브랜치 → PR → `main` 경로. 상세는 [`TASK.md`](TASK.md).
- 코딩 스타일: `@/*` alias 사용, i18n 키는 ko/en 대칭 유지([`src/i18n/parity.test.ts`](src/i18n/parity.test.ts)가 강제).
