# STRUCTURE_BASELINE.md

> 2026-04-17 Phase 0에서 기록한 `voicemate-FE` 구조 기준점.
> 이후 이터레이션에서 구조 변경이 일어나면 이 파일을 비교 기준으로 사용한다.

## 런타임 / 툴링

| 항목 | 값 |
|------|-----|
| Node | v24.14.1 |
| npm | 11.12.1 |
| Expo CLI | 54.0.23 |
| TypeScript | 5.8.3 |
| Expo SDK | 54 |
| React | 19.1.0 |
| React Native | 0.81.5 |
| expo-router | ~6.0.23 |

## 스크립트 (`package.json`)

- `start`: `expo start`
- `android`: `expo run:android`
- `ios`: `expo run:ios`
- `web`: `expo start --web`
- `lint`: `eslint .`
- `typecheck`: `tsc --noEmit`

> 테스트 러너 스크립트(`test`) 미존재 — Phase 1 `#4` 이슈에서 Jest 스캐폴드 예정.

## 주요 런타임 의존성 (요약)

- 상태: `zustand@^4.5.0`
- 네트워크: fetch 기반 커스텀 `src/services/api.ts`
- 인증: `expo-secure-store`, `expo-auth-session`, `expo-web-browser`
- 실시간: `@supabase/supabase-js@^2.45.0`
- 미디어: `expo-audio`, `expo-image-picker`, `expo-file-system`
- i18n: `i18next@^26.0.5`, `react-i18next@^17.0.3`, `expo-localization`
- 라우팅: `expo-router@~6.0.23`

## 디렉터리 트리 (`src/`)

```
src/
├── app/                      # expo-router 파일 기반 라우트
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   └── (main)/
│       ├── _layout.tsx
│       ├── (tabs)/
│       │   ├── _layout.tsx
│       │   ├── discover.tsx
│       │   ├── matches.tsx
│       │   └── profile.tsx
│       ├── chat/[matchId].tsx
│       ├── settings/
│       │   ├── blocked.tsx
│       │   └── preferences.tsx
│       └── setup/
│           ├── profile.tsx
│           └── voice.tsx
├── components/
│   ├── chat/{AudioPlayer,ChatBubble}.tsx
│   ├── discover/SwipeCard.tsx
│   ├── matches/MatchItem.tsx
│   └── ui/{Avatar,Button,Input,LoadingScreen}.tsx
├── constants/                # 언어 상수 등
├── hooks/
│   ├── useChat.ts
│   ├── useDiscover.ts
│   ├── useMatches.ts
│   ├── usePreferences.ts
│   ├── useProfile.ts
│   └── useVoice.ts
├── i18n/                     # i18next 설정 + locales/{ko,en}.ts
├── services/
│   ├── api.ts
│   ├── auth.ts
│   ├── block.ts
│   ├── discover.ts
│   ├── matches.ts
│   ├── messages.ts
│   ├── preferences.ts
│   ├── profile.ts
│   ├── realtime.ts
│   ├── report.ts
│   └── voice.ts
├── stores/
│   └── authStore.ts
├── types/
└── utils/
    └── age.ts
```

## TypeScript 설정 (`tsconfig.json`)

- `extends`: `expo/tsconfig.base`
- `strict`: true
- `baseUrl`: `.`
- `paths`: `@/*` → `src/*`

## 환경 변수 (`.env.example`)

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

> ⚠️ `SERVICE_ROLE` 계열 키는 FE에 존재하지 않으며, 앞으로도 존재해선 안 된다.

## `.gitignore` 보호 항목 (요약)

`node_modules/`, `.expo/`, `dist/`, `web-build/`, `ios/`, `android/`, `.env`, `.env.local`, `.env.*.local`, IDE/OS 아티팩트, `*.tsbuildinfo`.

## 베이스라인 원칙

- `src/app/**` 파일 기반 라우팅 구조를 유지한다. 모노레포/패키지 분리 금지.
- `ios/`, `android/` 폴더는 생성·커밋하지 않는다 (`expo prebuild` 금지).
- 모든 신규 코드는 `@/*` alias로 import한다 (상대 경로 `../../../` 지양).
