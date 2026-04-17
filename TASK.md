# TASK.md — Ralph Loop Overnight Task

## 🎯 목표
`voicemate-FE` (Expo / React Native / TypeScript) 프로젝트의 전체 QA + 알려진 버그 해결 + 자율 개선을 하루 밤 동안 반복 루프로 수행한다.
아침에 사용자가 `develop_loop` 브랜치를 열어 리뷰 후 `main`에 머지한다.

**이 프로젝트는 음성 클론 기반 크로스 언어 소개팅 앱의 Expo 프론트엔드**로, 주요 도메인은:
- 인증(Google OAuth + 이메일)
- 프로필/음성 등록
- 스와이프 매칭
- Supabase Realtime 기반 1:1 채팅 + ElevenLabs 음성 더빙 (BE가 수행)
- 매칭 선호·차단/신고 설정

---

## 📁 작업 환경
- **로컬 경로**: `C:\Users\EST-INFRA\voicemate-FE`
- **원격 저장소**: https://github.com/perso-devrel/voicemate-FE
- **BE 저장소(참조 전용, 수정 금지)**: `C:\Users\EST-INFRA\voicemate-BE-v2`
- **베이스 브랜치**: `main`
- **루프 작업 브랜치**: `develop_loop` (모든 PR의 머지 타겟)
- **저장소 구조**: 기존 구조 유지 (Expo Router 규약 `src/app/**` 그대로). 새로운 모노레포·패키지 분리 금지.

---

## 🧱 기술 스택 (수정 시 기억할 것)
- **런타임**: Expo SDK 54, React Native 0.81, React 19
- **라우팅**: `expo-router` (file-based, `src/app/**`)
- **상태**: `zustand` (`src/stores/*`)
- **타입**: TypeScript 5.8, `tsconfig.json`의 path alias `@/*` → `src/*`
- **i18n**: `i18next` + `react-i18next` (`src/i18n/locales/{ko,en}.ts`)
- **네트워크**: fetch 기반 커스텀 클라이언트(`src/services/api.ts`), 인증은 `expo-secure-store` + 자체 `Authorization: Bearer` + 401 시 refresh
- **실시간**: `@supabase/supabase-js` Realtime postgres_changes (`src/services/realtime.ts`)
- **파일/미디어**: `expo-audio`, `expo-image-picker`, `expo-file-system`
- **UI 프리미티브**: `src/components/ui/{Button,Input,LoadingScreen}`, `src/components/chat/*`
- **BE 연동**: REST JSON API. 스펙·DB 스키마는 BE 레포의 `src/routes/**`·`supabase/migrations/**` 참고

---

## 🚫 절대 금지 사항 (Critical Rules)

1. **ElevenLabs API 실호출 금지** — 크레딧 소진 방지. FE에서는 어차피 직접 호출 없음(전부 BE 경유). 혹시 새 코드에서 직접 호출이 생기지 않도록 리뷰 시 확인.
2. **Supabase `SERVICE_ROLE` 키 FE 노출 금지.** FE는 `EXPO_PUBLIC_SUPABASE_ANON_KEY`만 사용. 혹시 서비스 키가 `.env`·코드에 들어있으면 즉시 별도 이슈로 분리.
3. **BE(`voicemate-BE-v2`) 코드 수정 금지.** 불일치 발견 시 FE 측에서 방어 로직만 넣고, BE 수정이 필요하면 `docs/BE_DEPENDENCIES.md`에 제안만 남김.
4. **`main` / `develop` 브랜치에 직접 커밋·머지 금지.** 모든 변경은 이슈 브랜치 → `develop_loop` PR 머지 경로만 사용.
5. **force push 금지.** (`--force`, `--force-with-lease` 모두 금지)
6. **`.env`, `credentials.json`, `*.key`, `*.pem`, `google-services.json`, `GoogleService-Info.plist` 커밋 금지.** 이미 `.gitignore`에 없다면 먼저 추가.
7. **원격 삭제성 명령 금지.** `git push --delete`, `git branch -D` 로 원격 브랜치 파괴 금지.
8. **외부 서비스 가입·결제 금지.**
9. **Expo bare workflow 전환 금지.** `expo prebuild` 실행 금지. `android/`, `ios/` 네이티브 폴더 생성/커밋 금지.
10. **의존성 메이저 버전 업그레이드 금지.** Expo SDK 54 → 55, React 19 → 20 등 전면 업데이트 금지. 필요하면 제안만.
11. **실제 회원가입/프로필 데이터를 테스트에 사용하지 말 것.** 개발 계정으로만.

---

## 🔁 Git 워크플로우 (반드시 준수)

### 최초 1회 (Phase 0)
```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b develop_loop
git push -u origin develop_loop
```

### 각 이슈마다 반복
1. **GitHub 이슈 생성** (`gh issue create`) — 템플릿은 아래 참고
2. **이슈 브랜치 생성** (`develop_loop` 기반):
   ```bash
   git checkout develop_loop
   git pull origin develop_loop
   git checkout -b feature/issue-{번호}-{짧은-설명}
   ```
3. **구현 + 테스트 + 커밋** — 커밋 메시지는 Conventional Commits
4. **푸시**: `git push -u origin feature/issue-{번호}-{설명}`
5. **PR 생성**: `gh pr create --base develop_loop --head feature/issue-{번호}-{설명}` — 템플릿 참고
6. **자체 검증**: 린트/타입체크가 통과해야 머지 (`npm run lint`, `npm run typecheck`). 테스트 스크립트가 추가되면 `npm test`도.
7. **머지**: `gh pr merge --squash --delete-branch`
8. **PROGRESS.md 업데이트** (아래 형식)

### 브랜치 네이밍 규칙
- `feature/issue-12-realtime-auth-race`
- `fix/issue-18-typecheck-error`
- `chore/issue-5-update-readme`
- `docs/issue-22-be-api-map`

### 커밋 메시지 규칙 (Conventional Commits)
```
<type>(<scope>): <subject>

<body>

Refs: #<issue-number>
```
- `type`: feat / fix / chore / docs / refactor / test / perf
- `scope`: auth / profile / chat / match / preferences / ui / i18n / api / realtime / infra
- 예: `fix(realtime): await setAuth before subscribing to messages channel`

### PR 템플릿
```markdown
## 개요
- 이슈: #<번호>
- 요약: <한 줄>

## 변경 내용
- …
- …

## 검증
- [ ] `npm run lint` 통과
- [ ] `npm run typecheck` 통과
- [ ] `npm test` 통과 (테스트 스크립트가 존재할 때)
- [ ] 수동 확인 (해당 시 기기/에뮬레이터 동작)

## 리스크 / 팔로업
- …
```

### 이슈 템플릿
```markdown
## 배경
<왜 필요한지 — 사용자/개발자 관점>

## 범위
<무엇을 한다 / 무엇은 안 한다>

## 완료 조건
- [ ] …
- [ ] …

## 참고
<관련 파일/링크. BE 연관 시 `voicemate-BE-v2`의 파일 경로도>
```

---

## 📋 작업 계획 (Phase별 이슈 목록)

> 각 Phase는 순서대로 진행. Phase 내 이슈는 병렬 가능하지만 **한 루프 iteration에 하나씩** 처리한다 (충돌 최소화).

### Phase 0 — 환경 준비 (최초 1회, 이슈 불필요)
- `main` 최신화 → `develop_loop` 생성 & push
- `gh auth status` 확인, GitHub CLI 로그인 안 됐으면 PROGRESS.md에 기록하고 해당 부분만 수동 안내
- Node/npm/Expo CLI 버전 확인 → `PROGRESS.md`에 환경 스냅샷 기록
- 기존 프로젝트 구조 파악: `README.md`, `package.json`, `tsconfig.json`, `src/app/` 트리, `src/services/*`, `src/stores/*`, `src/hooks/*`, `src/i18n/locales/*`을 `docs/STRUCTURE_BASELINE.md`로 기록 (이후 비교 기준)

### Phase 1 — 코드베이스 QA (1~7)
- **#1 진단 리포트**: 프로젝트 구조·의존성·스크립트 목록·알려진 TODO/FIXME 집계 → `docs/DIAGNOSIS.md`
- **#2 TypeScript 타입 에러 수정**: `npm run typecheck` 에러 0으로. `any` 사용 현황 표만 `docs/TYPE_DEBT.md`로 기록 (개별 수정은 Phase 6에서)
- **#3 Lint 에러 수정**: `npm run lint` 에러 0으로. 설정이 빈약하면 최소 ESLint/Prettier 룰 제안 (실제 룰 추가는 별도 이슈로 쪼갬)
- **#4 테스트 인프라 점검**: 현재 테스트 러너가 설치돼 있지 않음. Jest + React Native Testing Library 최소 구성 스캐폴드 추가 → 샘플 테스트 1개(`src/utils/age.test.ts` 등 순수 함수) 통과
- **#5 핵심 순수 함수 유닛 테스트 보강**: `src/utils/age.ts`, `src/constants/languages.ts`의 `isLanguageCode`, `src/services/api.ts`의 `ApiRequestError` 포매팅 등 외부 의존 없는 함수 우선
- **#6 보안 1차 스윕**: `.env` 노출, 하드코딩된 API 키, `EXPO_PUBLIC_*`로 공개되면 안 되는 값(서비스 키 등) 정적 탐색 → 발견 시 이슈로 분리 권고
- **#7 의존성 점검**: `npm outdated`로 현황만 수집 → `docs/DEPENDENCY_STATUS.md`. **메이저 업뎃은 기록만**, minor/patch 중 Expo SDK 54 호환이 확실한 것만 업뎃 후 `typecheck`+`lint` 재확인

> 🚨 Phase 1에서 ElevenLabs/외부 유료 API **직접 호출 코드**가 FE에서 발견되면 **그 자리에서 수정 금지, 즉시 이슈로 분리**하고 이후 이터레이션에서 mock으로 교체.

### Phase 2 — 알려진 버그 수정 (8~14)
- **#8 실시간 채팅 이벤트 미수신 재점검**: 증상 — 상대방이 보낸 메시지가 즉시 반영되지 않고 탭 이동 후에야 나타남. `src/services/realtime.ts`의 `subscribeToMessages` / `setRealtimeAuth` 흐름이 실제로 JWT를 채널 수립 전에 적용하는지 확인. Metro 콘솔에 `[Realtime <matchId>] SUBSCRIBED | CHANNEL_ERROR | TIMED_OUT` 상태 로그가 찍히는지 확인 후 원인별 수정. RLS/publication 문제라면 BE 제안으로 `docs/BE_DEPENDENCIES.md`에 기록만 하고 FE 측 방어 로직(폴백 폴링) 검토.
- **#9 채팅 입력바 내비게이션바에 가려짐(Android edge-to-edge) 재검증**: 기기에 따라 `insets.bottom`이 0으로 잡히는 케이스 확인. `SafeAreaProvider` 루트 래핑 정상 여부, `KeyboardAvoidingView` Android `behavior="height"` 동작 회귀 검증.
- **#10 로그인 화면의 "Google로 계속하기" 버튼 흐림 회귀 테스트**: `disabled` opacity가 다른 버튼 로딩 시 전파되지 않는지 확인.
- **#11 이메일 로그인 무한 로딩 방어 재검증**: `src/services/api.ts`의 `fetchWithTimeout`이 모든 경로(`GET/POST/PUT/PATCH/DELETE/upload`)에 적용됐는지 확인. 업로드는 `UPLOAD_TIMEOUT_MS` 60초 적용 여부.
- **#12 선호 언어 저장 회귀 테스트**: `src/app/(main)/settings/preferences.tsx`에서 Picker로 다중 선택 → 저장 후 재진입 시 복원되는지. 레거시 한글 값(`'한국어'`)이 들어있으면 `isLanguageCode` 필터로 자동 드롭되는지.
- **#13 프로필 언어 Picker 회귀 테스트**: `src/app/(main)/setup/profile.tsx`에서 미선택 시 Alert이 뜨고, 선택 후 저장 시 ISO 코드로 전송되는지.
- **#14 오디오 재생 리스너 누수 방지**: `src/app/(main)/chat/[matchId].tsx`의 `handlePlayAudio`에서 `createAudioPlayer`로 만든 player가 모든 경로에서 `remove()` 되는지. 에러 경로/중단 경로 포함.

### Phase 3 — UX / i18n / 접근성 보강 (15~20)
- **#15 i18n 키 커버리지 감사**: 하드코딩 한글 문자열을 grep → 이슈로 분리. `src/i18n/locales/ko.ts`, `en.ts` 양쪽이 동일 키 집합인지 대칭 검증 스크립트를 `scripts/check-i18n-parity.ts`로 추가.
- **#16 에러 상태 UI 일관화**: 각 화면의 Alert vs 인라인 에러 vs Toast 중 하나로 패턴 통일. 공용 `useErrorHandler` 훅 제안.
- **#17 로딩 상태 일관화**: `LoadingScreen`, `ActivityIndicator`, 버튼 `loading` prop 사용처를 카탈로그화 → 가이드 `docs/UX_STATES.md`.
- **#18 빈 상태(Empty State) 보강**: 매칭/채팅/프로필 사진 없는 경우의 플레이스홀더 메시지 + CTA.
- **#19 접근성(a11y)**: `Pressable`에 `accessibilityLabel` 누락 지점, `Image`에 `accessible`/`alt` 누락 점검.
- **#20 번역 품질**: `ko.ts`, `en.ts`의 자연스러움 검수 (기계적 번역 티 나는 문구 다듬기). 번역 자체가 애매하면 `docs/I18N_REVIEW.md`에 제안만.

### Phase 4 — BE 통합 정합성 검증 (21~25)
> BE 코드는 수정 금지. FE 타입·경로만 정합시킴. 불일치 시 `docs/BE_DEPENDENCIES.md`에 기록.

- **#21 API 엔드포인트 인벤토리**: `voicemate-BE-v2/src/routes/**.ts`를 스캔해 `docs/API_MAP.md` 생성. FE의 `src/services/*`가 호출하는 경로와 실제 BE 경로 대조.
- **#22 요청/응답 타입 싱크**: BE Zod 스키마(`voicemate-BE-v2/src/schemas/*`)와 FE `src/types/index.ts` 대조. 누락/불일치 → 이슈화.
- **#23 에러 코드 매핑**: BE가 반환하는 `{ error: string }` 문자열 집합을 수집 → FE에서 i18n 키 매핑 레이어 제안 (`src/services/api.ts`의 `ApiRequestError` → 사용자 메시지).
- **#24 Supabase Realtime publication 문서화**: BE 마이그레이션의 `ALTER PUBLICATION supabase_realtime ADD TABLE ...` 목록을 추출 → `docs/REALTIME_TABLES.md`.
- **#25 RLS 정책 요약**: FE가 직접 조회하지 않지만 Realtime·Storage 경로에 영향을 주는 RLS 정책을 요약 → `docs/RLS_SUMMARY.md`.

### Phase 5 — 문서화 & 마무리 (26~29)
- **#26 루트 `README.md` 보강**: 설치/실행/환경변수/디버깅 가이드. 현재 BE + FE 동시 실행 절차. 기기 네트워크 설정(LAN IP, 에뮬레이터 `10.0.2.2`).
- **#27 `docs/QA_CHECKLIST.md`**: 사용자가 수동 QA 할 때 쓸 체크리스트 (로그인·프로필 생성·음성 등록·매칭·채팅·실시간 송수신·차단/신고 플로우).
- **#28 `docs/TROUBLESHOOTING.md`**: 흔한 에러(네트워크 타임아웃, Realtime `CHANNEL_ERROR`, ElevenLabs dubbing_write 권한 등) 원인 + 조치.
- **#29 `CHANGELOG.md` 갱신**: `develop_loop`에 포함된 주요 변경점 정리.

---

### Phase 6 — 자율 개선 모드 (Autonomous Improvement) ♾️

> **Phase 5까지 모두 머지되면 자동으로 Phase 6로 진입한다.**
> Ralph가 스스로 개선 거리를 찾아서 이슈화 → 구현 → 머지를 반복한다.
> 단, 아래 **허용 범위(allowlist)**와 **금지 범위(denylist)**를 엄격히 준수한다.

#### 6-0. 진입 조건
- Phase 5까지 이슈 전부 머지 완료
- `develop_loop` 기준 열린 PR 0건
- `git status` clean

#### 6-1. 개선 이슈 생성 절차
매 iteration 시작 시 Ralph는 다음 단계를 수행:

1. **현재 코드베이스 스캔**: 최근 머지된 PR, 타입체크/린트 결과, `// TODO`·`// FIXME`·`// NEEDS_VERIFICATION` 주석, `PROGRESS.md`의 리스크/팔로업 항목을 모두 읽는다.
2. **개선 후보 3개 브레인스토밍**: 아래 **허용 범위** 안에서만. 각 후보에 대해 아래 3개 점수 매기기 (1~5, 5가 높음):
   - **가치(Value)**: 사용자/개발자에게 얼마나 도움이 되나
   - **리스크(Risk)**: 기존 동작을 깨뜨릴 가능성
   - **복구성(Reversibility)**: 잘못됐을 때 되돌리기 쉬운가
3. **선택 규칙**: `(Value + Reversibility) - Risk` 가 가장 높은 것 1개 선택. 동점이면 변경 라인 수가 적은 것.
4. **이슈 생성**: 제목에 `[phase-6]` 프리픽스. 본문에 3개 점수와 선택 이유 명시.
5. **구현**: 평소 워크플로우 그대로 (브랜치 → 커밋 → PR → 머지).
6. **사후 검증**: 머지 후 `typecheck`·`lint`가 깨지지 않는지 확인. 깨지면 즉시 revert PR 생성 후 머지.

#### 6-2. ✅ 허용 범위 (Allowlist)

**버그 & 안정성**
- 런타임 에러 핸들링 강화 (네트워크/Realtime/오디오 재생 실패)
- 에러 메시지 개선 (사용자 friendly + 디버깅 정보 포함)
- edge case 방어 (null/undefined, 빈 배열, 토큰 만료, 권한 거부)
- 레이스 컨디션 해결 (특히 구독/인증/리스너 cleanup)

**테스트 & 품질**
- 순수 함수 유닛 테스트 커버리지 보강
- 훅 테스트 추가 (모킹 기반)
- flaky 테스트 안정화

**DX (개발자 경험)**
- 로깅 구조화 (`__DEV__` 가드, 레벨/태그)
- 디버그 모드 토글
- 에러 스택트레이스 개선
- Metro 캐시/리빌드 꿀팁 문서화

**퍼포먼스**
- `FlatList` 렌더링 최적화 (`keyExtractor`, `getItemLayout`, `memo`)
- 이미지 lazy loading
- 불필요한 리렌더 제거 (zustand selector 분리, `memo`)
- 번들 분석 스크립트 추가

**UX 폴리시**
- 로딩/빈/에러 상태 UI 보강
- 키보드/스크롤 상호작용 매끄럽게
- 토스트/피드백 메시지 일관성
- 다크모드 대응 검토(이미 있는 경우 누락 지점만)

**접근성 (a11y)**
- `accessibilityLabel`, `accessibilityRole`
- 키보드 네비게이션 (포커스 순서)
- 색 대비 개선
- 스크린 리더 (VoiceOver/TalkBack) 흐름

**보안 하드닝**
- Storage/SecureStore 키 네이밍 일관화
- input sanitization (특히 채팅 메시지)
- 의존성 취약점 패치 (minor/patch 버전만)
- 민감 로그 제거 (`console.log`에 토큰·이메일 들어있는지)

**문서 & 주석**
- JSDoc/TSDoc 추가 (공개 훅·서비스 함수)
- 복잡한 로직 설명 주석
- 사용 예제 추가
- 아키텍처 결정 기록(ADR) 작성

**리팩토링**
- 중복 코드 제거 (DRY)
- 타입 좁히기 (`any` → 구체 타입)
- 파일 분리 (길어진 파일 쪼개기; 500줄 넘으면 우선)
- 네이밍 일관성

**국제화 보강**
- 하드코딩 문자열을 i18n 키로 추출
- `ko`/`en` 키 대칭성 유지
- (신규 언어 추가는 사용자 판단 필요 → 제안만)

#### 6-3. ❌ 금지 범위 (Denylist) — 위반 시 즉시 revert + blocked 처리

- **새 외부 유료 서비스 연동** (Sentry 유료, 결제 SDK 등)
- **ElevenLabs·perso.ai 직접 API 호출** (BE 경유 원칙 위반 + 크레딧 리스크)
- **프레임워크/런타임 교체** (Expo → Bare RN, Zustand → Redux 등)
- **라우터 교체** (expo-router 유지)
- **의존성 메이저 버전 업그레이드** (Expo SDK 54→55, React 19→20, RN 0.81→0.82 등)
- **브랜딩/디자인 시스템 근본 변경** (색상 팔레트, 폰트 전면 교체)
- **Public 컴포넌트 API breaking change** (기존 props 시그니처 깨기)
- **라이선스/법무 영향이 있는 변경**
- **CI/CD 인프라 전면 재구성**
- **새 언어/런타임 도입** (Python 스크립트 등)
- **BE 코드 수정** (`voicemate-BE-v2` 쪽은 제안만)
- **Expo bare workflow 전환 (`expo prebuild`)**

> 판단이 애매하면 **"사용자에게 물어봐야 할 일"로 간주하고 실행하지 않는다.** 대신 `docs/PHASE6_PROPOSALS.md` 파일에 "다음 번 사람이 판단할 제안" 목록으로 append하고 다음 후보로 넘어간다.

#### 6-4. Phase 6 품질 바
- 모든 PR은 테스트 포함 (순수 문서/주석 PR 제외)
- 각 PR 변경 라인 수 **200줄 이하** 권장 (Phase 1~5보다 타이트하게)
- 한 iteration = 한 개선 (복합 개선 금지, 쪼개기)

#### 6-5. Phase 6에서의 DONE 재정의

Phase 6는 기본적으로 **끝이 없다**. 다만 아래 조건 중 하나 만족 시 DONE:
- **개선 후보를 3번 연속 브레인스토밍해도 허용 범위에 맞는 것이 나오지 않음**
- Phase 6에서도 **5회 연속 iteration 동안 PR 머지 0건** (정체)
- `docs/PHASE6_PROPOSALS.md`에 누적 제안 10건 이상 쌓임 (사용자 판단이 필요한 일이 충분히 많음 → 일단 사람한테 공 넘김)
- 그 외 공통 DONE 조건(복구 불가 장애 등)

---

## ✅ 완료 조건 (DONE)

> **시간/횟수 하드 리밋은 두지 않는다.** 할 일이 남아 있는 한 계속 진행.
> 다만 "진짜로 막혀서 공회전 중인 상태"는 감지하여 안전하게 종료해야 한다.

다음 중 **먼저 만족되는 것**이 있으면 `DONE` 출력 후 루프 종료:

1. **Phase 6의 종료 조건 충족** (정상 종료 — Phase 1~5는 이미 완료된 상태)
2. **무의미한 진전 감지** — 연속 5회 iteration 동안 **머지된 PR이 0건**이면 정체 상태로 간주. `PROGRESS.md` 최상단에 `⚠️ STALLED:` 로 원인(파악한 범위에서) + 남은 작업 목록 기록 후 DONE.
3. **이슈 단위 반복 실패** — 동일 이슈에서 3회 연속 실패한 경우, 해당 이슈에 `blocked` 라벨 + 상세 코멘트 달고 **다음 이슈로 넘어감** (DONE 아님). 단, `blocked` 이슈가 누적 5개 이상이면 그 시점에서 DONE.
4. **복구 불가 장애 3회 연속 발생** (ex: `git push` 인증 실패, `gh` CLI 호출 실패, 디스크 풀, 네트워크 단절) — 원인 + 해결 가이드를 `PROGRESS.md` 최상단에 `🚨 EMERGENCY STOP:` 으로 명시 후 DONE.
5. **Phase 이탈 감지** — Phase 1~5에서 모든 이슈가 생성되었고 남은 이슈가 전부 `blocked` 상태라면 Phase 6 진입 불가 → DONE.

DONE 출력 직전 반드시:
- [ ] 현재 체크아웃 브랜치가 `develop_loop` 인지 확인
- [ ] 미커밋 변경 없음 (`git status` clean)
- [ ] `git push origin develop_loop` 마지막 실행
- [ ] `PROGRESS.md` 최종 상태 업데이트 (정상 종료인지 STALLED인지 EMERGENCY인지 명시)
- [ ] `develop_loop` 기준 열린 PR 없음 확인 (`gh pr list --base develop_loop --state open`)

---

## 📝 PROGRESS.md 포맷 (매 이슈 완료 시 append)

```markdown
## 2026-04-17 23:45 · Issue #3 · Lint 에러 수정
- 브랜치: feature/issue-3-lint-fixes
- PR: #42 (merged)
- 변경 파일: 12개
- 요약: ESLint 에러 47 → 0. Prettier로 포맷 통일.
- 다음: #4 테스트 인프라 점검
- 리스크: 없음

---
```

최상단에는 항상 현재 루프 상태 요약을 유지:
```markdown
# 📌 현재 상태 (마지막 업데이트: 2026-04-18 04:12)
- 진행 중 Phase: 3
- 완료 이슈: #1~#17 (17개)
- 진행 중 이슈: #18
- 블로커: 없음
```

---

## 🧪 각 루프 iteration에서의 행동 규범

1. **한 iteration당 이슈 1개만 처리** — 여러 이슈 동시 작업 금지 (충돌 방지)
2. **이슈 선택 기준**: Phase 번호 낮은 것 → 의존성 적은 것 → 번호 낮은 것
3. **이슈 시작 전**: `git status` 로 clean 상태 확인, 아니면 현재 작업 먼저 커밋/푸시
4. **이슈 중 오류 발생 시**: 스택 트레이스 + 원인 + 시도한 수정을 `PROGRESS.md`에 기록 후 재시도. 3회 이상 실패 시 해당 이슈에 `blocked` 라벨 + 상세 코멘트 달고 다음 이슈로 넘어감
5. **명확히 모르는 외부 사실(BE 스키마, Supabase 정책 등)**: 추측으로 구현 금지. `// NEEDS_VERIFICATION` 마커 + `docs/BE_DEPENDENCIES.md` 등에 항목 추가 후 다음으로
6. **테스트 없는 코드 머지 금지** (순수 스캐폴드/문서 PR 예외. 단 테스트 인프라가 준비된 이후부터)
7. **각 PR은 300줄 이하 변경 권장** (Phase 6는 200줄). 넘어가면 이슈 쪼개기
8. **기기·에뮬레이터 실행이 필요한 검증**은 Ralph가 직접 할 수 없음 → 해당 이슈에 `needs-manual-qa` 라벨 달고 `docs/QA_CHECKLIST.md`에 항목 추가

---

## 🔐 비상 종료 시나리오

다음 상황이면 즉시 `DONE` 출력하고 `PROGRESS.md` 최상단에 `🚨 EMERGENCY STOP:` 기록:

- `git push` 가 인증 실패로 3회 연속 실패
- `origin/main` 브랜치가 사라짐/변경됨
- `.env` 또는 민감 파일이 실수로 스테이징된 채 커밋 직전
- 루트 `package.json` 이나 `.git/` 가 손상됨
- `node_modules` 삭제로 복구 불가 상태

---

## 🤝 사용자와의 인터페이스

사용자(devrel)가 아침에 확인하는 것:
1. `develop_loop` 브랜치 위 `PROGRESS.md` 최상단 요약
2. 머지된 PR 리스트 (`gh pr list --base develop_loop --state merged`)
3. `docs/BE_DEPENDENCIES.md` (BE 수정 제안 목록)
4. `docs/QA_CHECKLIST.md` (수동 QA 가이드 — 특히 실기기 2대 필요한 실시간 채팅)
5. `docs/PHASE6_PROPOSALS.md` (사람 판단이 필요한 제안 목록, 있는 경우)

사용자는 그 후 `develop_loop` → `main` 머지 여부를 직접 판단한다.
