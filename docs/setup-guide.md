# VoiceMate 개발 환경 설정 가이드

## 1. 환경 변수 설정

### FE

- `EXPO_PUBLIC_API_URL`: 모바일 Expo Go로 테스트할 때는 반드시 `localhost` 대신 **PC의 로컬 IP**를 사용해야 한다. (예: `http://192.168.0.10:3000`)
- PC IP 확인: `ipconfig` (Windows) 또는 `ifconfig` (Mac)

## 2. Google OAuth 설정 (BE 팀원과 함께)

Google 로그인이 동작하려면 Google Cloud Console에서 리디렉션 URI를 등록해야 한다.

### 2-1. Expo 로그인

```bash
npx expo login
# Expo 계정이 없으면 https://expo.dev 에서 생성
npx expo whoami
# → 유저네임 확인 (예: sejin123)
```

### 2-2. Google Cloud Console 설정

1. https://console.cloud.google.com → 프로젝트 선택
2. **APIs & Services → Credentials** → 사용 중인 OAuth 2.0 Client ID 클릭
3. **승인된 리디렉션 URI** 에 추가:

```
https://auth.expo.io/@{expo-username}/voicemate
```

> `{expo-username}`은 `npx expo whoami`로 확인한 값.
> `voicemate`는 `app.json`의 `expo.slug` 값.

4. 저장

### 2-3. 확인

FE 앱에서 "Continue with Google" 버튼 → Google 로그인 창이 뜨고 → 에러 없이 로그인 성공되면 완료.

---

## 3. 실행

터미널 2개를 열고 각각 실행:

```bash
# 터미널 1: BE 서버
cd voicemate_BE
npm run dev
```

```bash
# 터미널 2: FE Expo 개발 서버
cd voicemate_FE
npx expo start -c
```

- `-c` 옵션은 캐시 초기화 (첫 실행 또는 문제 발생 시 사용)
- QR 코드가 나오면 Expo Go 앱으로 스캔

---

## 4. 테스트 순서

PC와 모바일이 **같은 Wi-Fi**에 연결되어 있어야 한다.

| 순서 | 항목          | 확인 사항                                                    |
| ---- | ------------- | ------------------------------------------------------------ |
| 1    | BE 서버 실행  | `npm run dev` → 에러 없이 listening on port 3000             |
| 2    | FE Expo 실행  | `npx expo start -c` → QR 코드 표시                           |
| 3    | Expo Go 스캔  | 앱이 로드되고 로그인 화면 표시                               |
| 4    | Google 로그인 | "Continue with Google" → 로그인 성공 → 프로필 등록 화면 이동 |
| 5    | 프로필 등록   | 이름, 생년월일, 성별, 국적, 언어 입력 → 저장                 |
| 6    | 사진 업로드   | 프로필에서 사진 추가 (최대 6장, 5MB 이하)                    |
| 7    | 음성 클론     | 음성 녹음 → 업로드 → 상태가 processing → ready 확인          |
| 8    | 탐색          | Discover 탭에서 추천 후보 카드 표시 확인                     |
| 9    | 스와이프      | Like/Pass 동작 확인                                          |
| 10   | 채팅          | 매치 후 메시지 전송/수신 확인                                |

---

## 5. 문제 해결

| 증상                                   | 해결                                                           |
| -------------------------------------- | -------------------------------------------------------------- |
| `expo-asset` 못 찾음                   | `npx expo install expo-asset`                                  |
| `babel-preset-expo` 못 찾음            | `npm install babel-preset-expo --legacy-peer-deps`             |
| `react-native-worklets/plugin` 못 찾음 | `npm install react-native-worklets --legacy-peer-deps`         |
| `expo-linking` 못 찾음                 | `npx expo install expo-linking -- --legacy-peer-deps`          |
| SDK 버전 불일치                        | Expo Go 앱 버전과 `package.json`의 expo SDK 버전을 맞춘다      |
| `RNGoogleSignin` 에러                  | Expo Go에서는 `expo-auth-session` 사용 (현재 코드에 적용 완료) |
| Google 로그인 "액세스 차단됨"          | Google Cloud Console 리디렉션 URI 설정 필요 (섹션 2 참고)      |
| 모바일에서 API 연결 안 됨              | `EXPO_PUBLIC_API_URL`이 `localhost`가 아닌 PC IP인지 확인      |
| ENOSPC (디스크 부족)                   | 불필요한 `node_modules` 삭제 후 재설치                         |
| 의존성 충돌 (ERESOLVE)                 | `--legacy-peer-deps` 플래그 사용                               |

---

## 6. 현재 상태 (2026-04-15)

- FE 코드: 전체 화면/컴포넌트/API 서비스 구현 완료 (44개 파일)
- BE 연동: 타입/shape 검증 완료, 실제 API 테스트는 Google OAuth 설정 후 가능
- DEV Skip Login: `__DEV__` 모드에서 로그인 우회 버튼 존재 (BE 없이 UI 확인용)
    - 실제 Google 로그인이 설정되면 이 버튼은 자동으로 프로덕션 빌드에서 제외됨
