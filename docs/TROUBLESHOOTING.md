# TROUBLESHOOTING.md

> 2026-04-18 Phase 5 #28 · 흔한 에러 / 증상별 원인 분석 + 조치.

## 네트워크

### `Network timeout. Please check your connection.`
- **출처**: `src/services/api.ts` `fetchWithTimeout` (AbortError → `ApiRequestError(0, ...)`).
- **원인**: BE 응답 지연 또는 연결 끊김. 15초 이내에 응답 없음.
- **조치**:
  1. BE가 기동 중인지 확인: `curl http://<host>:3000/health` (또는 임의 health 엔드포인트)
  2. `EXPO_PUBLIC_API_URL`이 실기기에서 접근 가능한 주소인지 (LAN IP vs `10.0.2.2` vs `localhost`)
  3. 방화벽/VPN 차단 여부
  4. 업로드 경로는 60초까지 대기하지만, `src/services/profile.ts`·`voice.ts`의 `FileSystem.uploadAsync`는 별도 timeout 없음 → 무한 대기 가능 (`docs/BE_DEPENDENCIES.md §6`)

### `Network error. Please check your connection.`
- **출처**: 위 래퍼의 generic fallback.
- **원인**: DNS/TCP 실패. offline.
- **조치**: 기기 Wi-Fi/LTE 상태 확인.

## Supabase Realtime

### Metro 콘솔: `[Realtime <matchId>] CHANNEL_ERROR`
- **원인 후보**:
  1. JWT가 만료됐거나 setAuth 전에 subscribe 됨 (현 구현은 `setRealtimeAuth` → `subscribe` 순서 보장, `src/services/realtime.ts:20-23`)
  2. `messages` publication 누락 (`docs/REALTIME_TABLES.md` 확인)
  3. `messages` RLS 정책 위반 — match 참여자가 아닌 경우 (`docs/RLS_SUMMARY.md §messages`)
- **조치**: FE 수정으로 1번은 이미 방어. 2/3번은 BE 팀에 escalate (`docs/BE_DEPENDENCIES.md §1`).

### Metro 콘솔: `[Realtime] TIMED_OUT`
- **원인**: Supabase Realtime 게이트웨이 연결 실패. 네트워크 품질 / 서비스 장애.
- **조치**: 자동 재시도 없음(Phase 6 개선 후보) → 앱을 백그라운드→포어그라운드 재진입으로 재구독 트리거.

## ElevenLabs / 음성

### `Voice clone creation failed` (500)
- **원인**: BE → ElevenLabs 호출 실패 (쿼터 초과 / 권한 이슈 / 오디오 품질 미달).
- **조치**: `setup/voice.tsx`의 `reRecord`로 재시도. 지속되면 BE 로그 확인.

### `This may take a moment...` 이후 `failed` 상태
- **원인**: 더빙 비동기 워커 실패. BE `audio_status`가 `failed`로 전이.
- **조치**: 메시지 옆 재시도 버튼(`useChat.ts:67` `retryAudio`) 노출 — 상태가 `failed`일 때만 활성화돼야 한다 (`Audio is not in failed state` 400 방어).

### dubbing_write 권한
- BE 서비스 계정에 ElevenLabs `dubbing_write` scope가 필요. FE는 직접 호출 금지.
- 관련 결함은 BE 이슈로 리포트.

## Auth

### `Invalid or expired token` (401)
- **원인**: 액세스 토큰 만료. 평소에는 `api.ts`의 refresh 플로우로 자동 복구.
- **조치**: refresh도 실패하면 `useAuthStore.logout()`이 호출돼 로그인 화면으로. 사용자는 다시 로그인.

### 로그인 이후 Redirect 루프
- **원인**: `_layout.tsx`의 `tryAutoLogin`과 `login.tsx`의 `Redirect` 충돌.
- **조치**: `useAuthStore`의 `isAuthenticated` / `hasProfile`가 동일 상태 기준으로 업데이트되는지 확인. 캐시 남아 있으면 `SecureStore`에서 토큰 삭제 후 재시도.

## 업로드

### `File Too Large` (photos: 5MB / voice: 10MB)
- **원인**: 파일 크기 제한 초과.
- **조치**: 더 작은 파일 선택 / 녹음 시간 단축. 제한은 BE 측에서도 enforce.

### 업로드 무한 스피너
- **원인**: `FileSystem.uploadAsync`에 타임아웃 없음 (`docs/BE_DEPENDENCIES.md §6`).
- **조치**: 앱 강제 종료 후 재시도. Phase 6에서 `AbortController` 래핑 예정.

## 빌드 / 실행

### `npm install` `peer dep` 에러
- **원인**: React 19 / `@testing-library/react-native` peer 제약.
- **조치**: `npm install --legacy-peer-deps` (README 참조).

### `expo start` 후 Metro가 느림
- **원인**: 캐시 꼬임.
- **조치**: `npm run start -- --clear` 또는 `rm -rf node_modules/.cache .expo`.

### Android에서 `http://` URL이 거절됨
- **원인**: cleartext HTTP 차단 (Android 9+ 기본).
- **조치**: DEV 빌드는 Expo가 자동 허용. 프로덕션에선 HTTPS 사용 필수.

## 테스트

### `Cannot find module 'jest/package.json'`
- **원인**: `jest-expo`만 설치되고 `jest`가 없음.
- **조치**: `npm install --save-dev jest@^29 --legacy-peer-deps`.

### `Cannot use import statement outside a module` (expo-modules-core)
- **원인**: `jest-expo` preset 이 `transformIgnorePatterns`를 덮어씀.
- **조치**: 본 프로젝트는 preset 대신 `babel-preset-expo` transform 사용 (`jest.config.js`).

## 변경 이력

| 날짜 | 내용 | 담당 |
|------|------|------|
| 2026-04-18 | 초기 작성 | Ralph Loop |
