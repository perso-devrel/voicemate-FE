# DIAGNOSIS.md

> 2026-04-17 Phase 1 #1 · `voicemate-FE` 진단 리포트
> 이후 Phase 1 이슈들의 베이스라인으로 사용한다.

## 1. 프로젝트 개요

| 항목 | 값 |
|------|-----|
| 이름 | `voicemate` |
| 버전 | 1.0.0 |
| 런타임 | Expo SDK 54, React 19.1.0, React Native 0.81.5 |
| 라우팅 | `expo-router` 6.x (파일 기반 `src/app/**`) |
| 상태 | `zustand` 4.5.x |
| 타입 | TypeScript 5.8.3 (strict, `@/*` alias) |

## 2. 디렉터리 구성

```
src/
├── app/          # 14개 라우트 파일
├── components/   # 8개 UI/도메인 컴포넌트
├── constants/    # 환경변수·언어 상수
├── hooks/        # 6개 도메인 훅
├── i18n/         # i18next + ko/en locales
├── services/     # 12개 API/Realtime 서비스
├── stores/       # zustand 스토어 (현재 auth 1개)
├── types/        # 공용 타입 정의
└── utils/        # 순수 유틸 (age 1개)
```

- TypeScript 소스 파일: **49개** (tsx: 22개, ts: 27개)
- 전체 라인: 약 **1,633 LOC**

## 3. npm 스크립트 (`package.json`)

| 스크립트 | 명령 | 상태 |
|---------|------|------|
| `start` | `expo start` | 정상 |
| `android` | `expo run:android` | 정상 (prebuild 필요 시 수동) |
| `ios` | `expo run:ios` | 정상 (Mac 환경 전용) |
| `web` | `expo start --web` | 정상 |
| `lint` | `eslint .` | ⚠️ ESLint 미설치 — 실행 시 실패 |
| `typecheck` | `tsc --noEmit` | ✅ 통과 |
| `test` | `jest` | ✅ 통과 (Phase 1 #7에서 도입) |

## 4. 타입체크 / 린트 베이스라인

### TypeScript
- 현재 `npm run typecheck` **에러 0건**.
- 단, `any` 사용이 다수 존재하여 타입 정합성 보강 여지 있음 (아래 5절).

### ESLint
- ~~ESLint 관련 패키지가 `package.json` dependencies에도 devDependencies에도 없음.~~
- Phase 1 #3에서 `eslint@^9` + `eslint-config-expo@~9.2.0` + flat config(`eslint.config.js`) 도입.
- 현 상태: **0 에러, 7 경고** — 경고는 `docs/LINT_WARNINGS.md`로 분리, Phase 6에서 순차 해소.

## 5. `any` 사용 현황

`: any` 또는 `as any` 패턴 정적 탐색 결과. 총 **30건 / 14개 파일**.

| 파일 | 건수 |
|------|------|
| `src/hooks/useProfile.ts` | 4 |
| `src/hooks/useChat.ts` | 3 |
| `src/hooks/useVoice.ts` | 3 |
| `src/app/(main)/setup/voice.tsx` | 3 |
| `src/hooks/useMatches.ts` | 2 |
| `src/hooks/useDiscover.ts` | 2 |
| `src/hooks/usePreferences.ts` | 2 |
| `src/app/(auth)/login.tsx` | 2 |
| `src/app/(main)/chat/[matchId].tsx` | 2 |
| `src/app/(main)/setup/profile.tsx` | 2 |
| `src/app/(main)/(tabs)/profile.tsx` | 2 |
| `src/services/api.ts` | 1 |
| `src/app/(main)/settings/blocked.tsx` | 1 |
| `src/app/(main)/settings/preferences.tsx` | 1 |

**관찰**:
- 훅/서비스 경계에서 catch된 error를 `any`로 캐스팅하는 패턴이 지배적.
- `ApiRequestError` (이미 정의됨)로 좁혀 쓸 수 있는 자리가 많아 Phase 6 리팩토링 후보.
- Phase 1 #2 완료 후 Phase 6에서 개별 축소 작업을 진행한다. 전수 기록은 Phase 1 #2의 `docs/TYPE_DEBT.md`에 위임.

## 6. TODO / FIXME / HACK / NEEDS_VERIFICATION

`src/**/*.{ts,tsx}` 전수 grep 결과 — **0건**.

> 현 시점에 명시적 기술 부채 주석이 없다. Phase 6에서 새 코드 작성 시 `// NEEDS_VERIFICATION` 마커로 BE 확인 필요 지점을 표시한다.

## 7. 로깅 (`console.*`)

- `src/services/realtime.ts:51` 단 1곳.
  ```ts
  if (__DEV__) {
    console.log(`[Realtime ${matchId}]`, status, err ?? '');
  }
  ```
- Realtime 채널 상태(`SUBSCRIBED`/`CHANNEL_ERROR`/`TIMED_OUT`) 디버깅용. Phase 2 #15 Issue 에서 문서화 완료.
- 이미 `__DEV__` 가드 있음 → 프로덕션 번들에 로그 없음.

## 8. 디렉터리·파일 명명 관찰

- 라우트 그룹: `(auth)`, `(main)`, `(tabs)` 정상. expo-router 관례 준수.
- 동적 라우트: `chat/[matchId].tsx`만 존재. 매치 상세·설정·프로필 편집은 정적 라우트.
- `@/*` path alias 일관적으로 사용 (상대 경로 `../../../` 미발견).
- `src/services/devData.ts`: 개발용 더미 응답 제공. **Phase 6에서 프로덕션 번들 분리 여부 검토 필요** (현재는 모듈 import 단순).

## 9. 환경 변수 (`EXPO_PUBLIC_*`)

| 키 | 용도 | 노출 안전성 |
|----|------|-----------|
| `EXPO_PUBLIC_API_URL` | BE REST 엔드포인트 | ✅ 공개 가능 |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ 공개 가능 |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (RLS 의존) | ✅ 공개 가능 (RLS 필수) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth client id | ✅ 공개 가능 |

- `SERVICE_ROLE` 계열 키 없음. Phase 1 #6 보안 스윕에서 재확인 예정.

## 10. 베이스라인 결론 및 Phase 1 권고 순서

1. **#2 TypeScript 타입 에러 수정** — 현재 0건이지만, `any` 현황을 `TYPE_DEBT.md`로 명문화.
2. **#3 Lint 에러 수정** — ESLint 설치 + 최소 룰 세트 도입. 이후부터 `npm run lint`가 CI 프리커밋에 쓰일 수 있다.
3. **#4 테스트 인프라** — Jest + RNTL 스캐폴드.
4. **#5 유닛 테스트 보강** — `src/utils/age.ts`, `isLanguageCode`, `ApiRequestError`를 우선.
5. **#6 보안 스윕** — 본 문서의 9절을 기반으로 git 히스토리까지 재확인.
6. **#7 의존성 점검** — `npm outdated` 결과를 `docs/DEPENDENCY_STATUS.md`로 기록.

## 11. 리스크 요약

| 리스크 | 수준 | 대응 |
|--------|------|------|
| ESLint 미설치 — `lint` 스크립트가 환경에 의존 | 중 | #3에서 devDependency로 고정 |
| `any` 30건 — 런타임 에러를 타입이 잡지 못함 | 중 | #2/Phase 6에서 점진 제거 |
| Realtime 콘솔 로그 1건 (`__DEV__` 가드 없음) | 저 | Phase 2 #8 또는 Phase 6 DX에서 처리 |
| 테스트 인프라 부재 | 중 | #4 스캐폴드 후 #5 커버리지 |
| BE 스키마 정합성 문서화 부재 | 중 | Phase 4 전 단계 |
