# haru_FE

> **보이스 클론 기반 cross-language 데이팅 앱 — 모바일 클라이언트**
>
> Expo SDK 54 + React Native 0.81 + React 19.

[![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-7c3aed)](https://claude.com/claude-code)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020)](https://expo.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

이 레포는 모바일 앱(Expo + RN) 만 다룹니다. **백엔드는 별도 레포** → [`perso-devrel/haru_BE`](https://github.com/perso-devrel/haru_BE)

---

## 핵심 기능

사용자가 본인 언어로 텍스트 메시지를 작성

→ 메시지를 자동으로 상대 언어로 번역

→ 사용자의 목소리를 입혀서 음성으로 전달

---

## 핵심 가치

### 1. 언어의 벽은 없애되, 사람의 흔적은 지우지 않는다

번역된 메시지는 기계 음성이 아니라 **송신자 본인의 클론 보이스**로 재생됩니다.
말투·호흡·목소리 톤이 살아 있어, 사진이나 텍스트만으로는 만들 수 없는 **"목소리만의 설렘"** 을 의도합니다.

### 2. 비효율과 느림의 미학

| 단계 | 일반 데이팅앱 | haru |
|---|---|---|
| 매칭 상대 탐색 | 사진 스와이프 | **블러된 사진 + 목소리 음성 청취** |
| 사진 공개 | 처음부터 전부 공개 / 결제·매칭으로 잠금 해제 | **채팅 5회 왕복 시 일부 공개, 10회 시 전체 공개** |
| 메시지 | 텍스트 즉시 노출 | **음성 1회 청취 후 텍스트 공개** |

---

## 페르소나: 한국 남성 × 일본 여성

이미 검증된 수요 위에 만듭니다.

- 한남-일녀 결혼 **1,176건 (2024)** — 전년 대비 **+40.2%**, 최근 10년 내 최고치
- 한남-일녀 결혼이 한녀-일남 결혼의 **약 8배** (1,176건 vs 147건)
- 지리·문화적으로 근접 → 실제 만남으로 이어질 수 있는 조건이 갖춰져 있음

1차 출시 한국·일본, 확장 미국·태국·인도 순.

---

## 개발 배경

> "Perso AI API로 이런 앱도 만들 수 있다" 는 레퍼런스 확보가 출발점.

현재 음성 클론 / TTS는 **ElevenLabs API**를 사용 중이며, 추후 **Perso AI API**로 전환 예정.
번역은 Vertex AI Gemini 2.5 Flash, 모더레이션은 OpenAI Moderation으로 구성.

코드는 [Claude Code](https://claude.com/claude-code) 와 함께 작성·아키텍처링했습니다.

---

## 기술 스택

| 항목 | 버전 / 라이브러리 |
|---|---|
| Expo SDK | 54 |
| React Native | 0.81.5 |
| React | 19.1.0 |
| TypeScript | 5.8 (strict) |
| 라우팅 | `expo-router` 6.x (`src/app/**`) |
| 상태 | `zustand` 4.5 |
| i18n | `i18next` + `react-i18next` (ko / ja / en) |
| 실시간 | `@supabase/supabase-js` Realtime |
| 오디오 | `expo-audio` 1.1 (shared singleton player) |
| 푸시 | `expo-notifications` |
| 인증 | `@react-native-google-signin/google-signin` |

지원 언어 모델: ko / ja / en / th / hi (UI는 ko/ja/en, `parity.test.ts` 가 키 대칭 강제).

---

## 시작하기

```bash
# 1) 백엔드 먼저 띄우기 (별도 레포)
git clone https://github.com/perso-devrel/haru_BE
cd haru_BE
npm install
cp .env.example .env       # 값 채우기 (BE 레포 README 참고)
npm run dev                # http://localhost:3000

# 2) FE — 이 레포
git clone https://github.com/perso-devrel/haru_FE
cd haru_FE
npm install --legacy-peer-deps
cp .env.example .env       # 값 채우기 (아래 환경 변수 섹션)
npm run start              # Expo Dev Tools → QR 스캔
```

> React 19 peer 범위 때문에 `--legacy-peer-deps` 가 필요합니다.

### 디바이스 / 시뮬레이터 별 BE URL

| 환경 | `EXPO_PUBLIC_API_URL` |
|---|---|
| iOS 시뮬레이터 | `http://localhost:3000` |
| Android 에뮬레이터 | `http://10.0.2.2:3000` |
| 실기기 (LAN) | `http://<PC LAN IP>:3000` — 같은 Wi-Fi 대역 필수 |

> **Expo Go는 푸시 알림이 안 됩니다.** 푸시까지 보려면 EAS dev build (`eas build --profile development --platform ios|android`) 를 한 번 굽거나, 푸시 코드를 잠깐 빼두세요.

---

## 환경 변수

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000     # BE URL (위 표 참고)
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon>             # service_role 절대 ❌
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
```

---

## 디렉터리 구조

```
src/
├── app/                     # expo-router 파일 기반 라우트
│   ├── (auth)/login.tsx
│   ├── (main)/(tabs)/
│   │   ├── discover.tsx     # 추천 카드 스와이프 + 보이스 인트로 재생
│   │   ├── likes.tsx        # 받은 좋아요 (4번째 탭)
│   │   ├── matches.tsx      # 매치 목록 + 청취 게이팅 마스킹
│   │   └── profile.tsx
│   ├── (main)/chat/[matchId].tsx     # 채팅 — Realtime + 청취 게이팅 + 30일 후 재합성
│   ├── (main)/setup/step{1..5}.tsx   # 회원 가입 (사진 / voice clone 등록 포함)
│   ├── (main)/settings/*.tsx
│   └── _layout.tsx          # 글로벌 푸시 deep link + 403 freeze 모달 핸들러
│
├── components/
│   ├── chat/
│   │   ├── sharedAudioPlayer.ts      # module-level singleton (multiple-player race 차단)
│   │   ├── ChatBubble.tsx            # 청취 게이팅 + 30일 만료 분기
│   │   └── ...
│   ├── discover/SwipeCard.tsx        # 카드 중앙 보이스 재생 버튼
│   ├── voice/RecordRing.tsx          # voice clone 녹음 UI
│   └── VoiceIntroMultiLangPreview.tsx
│
├── hooks/
│   ├── useChat.ts                    # 메시지 실시간 + 청취 → markListened
│   ├── useMatches.ts                 # 매치 목록 + realtime 합성
│   ├── useReceivedLikes.ts           # 받은 좋아요 (디스커버 quota 공유)
│   ├── usePushToken.ts               # Expo Push 등록 + 권한 요청
│   └── useVoice.ts, useVoiceCloneRecorder.ts
│
├── services/                # REST + Realtime 서비스 (BE 라우트와 1:1 대응)
├── stores/                  # zustand: authStore, profileStore...
├── i18n/locales/{ko,ja,en}.ts        # 같은 키 동시 추가 (parity.test.ts CI 강제)
├── constants/bioPhrases.ts           # voice-intro preset bypass 카탈로그 (BE fixture 동기화)
└── utils/
```

---

## 화면 한 줄 요약

| 라우트 | 역할 |
|---|---|
| `(auth)/login` | Google 로그인, 403 frozen 인 경우 즉시 차단 |
| `setup/step1..5` | 닉네임 → 사진 → voice intro → 선호도 → 푸시 권한 |
| `(tabs)/discover` | 카드 스와이프 — 블러 사진 + 보이스 청취 우선 |
| `(tabs)/likes` | 받은 좋아요 (출시 무료, 후속 sprint에서 paywall 검토) |
| `(tabs)/matches` | 마지막 메시지 미청취 시 "새 메시지" 마스킹 |
| `chat/[matchId]` | 텍스트 → 번역문 + 송신자 목소리 / 30일 만료 시 재합성 버튼 / 청취 게이팅 |
| `settings/voice` | voice clone 재녹음 (옛 voice 자동 cleanup) |
| `settings/notifications` | 메시지 / 매치 푸시 토글 |

---

## 핵심 가치가 코드 어디에 살아 있나

- **블러 사진 + 보이스 우선 탐색** — `components/discover/SwipeCard.tsx` 가 사진을 블러 처리한 상태로 카드 중앙에 보이스 재생 버튼을 둠. 시청자 언어 슬롯 (`voice_intro_audio_url`) 은 `services/discover.ts` 가 BE에서 미러로 받아옴
- **채팅 왕복 기반 사진 단계 공개** — 매치 라운드트립 카운트로 photo unlock 플래그가 토글되고 (BE 의 `005_match_photo_access.sql` + `get_match_summaries_v3`), FE는 `useMatches.ts` 에서 받아 카드 블러 강도를 분기
- **음성 1회 청취 → 텍스트 공개** — `ChatBubble.tsx` 가 수신자 분기에서 미청취 시 편지 카드(`messagePreparing` / `tapToListen`) 만 노출. `sharedAudioPlayer` 로 재생 자연 완료를 감지하면 optimistic하게 `markListened` → 텍스트 공개. 채팅 목록 미리보기도 미청취 시 "새 메시지" 로 마스킹
- **클론 보이스 자동 번역** — `hooks/useChat.ts` 가 Realtime UPDATE 로 `audio_status: processing → ready` 를 받으면 `sharedAudioPlayer` 에 enqueue, 30일 만료 시 재합성 트리거

---

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run start` | Expo Dev Server |
| `npm run android` | Android run (prebuild 후) |
| `npm run ios` | iOS run (Mac 전용) |
| `npm run web` | web target — `web/`(랜딩) 과 다른 RN-web 빌드 |
| `npm run lint` | ESLint (`eslint-config-expo` flat preset) |
| `npm run typecheck` | TypeScript strict |
| `npm test` | Jest + babel-preset-expo |

---

## 디버깅 팁

- Metro 콘솔에서 `[Realtime <matchId>] SUBSCRIBED | CHANNEL_ERROR | TIMED_OUT` — `__DEV__` 에서만 출력
- 채팅 음성이 안 들리면: `sharedAudioPlayer` 가 module-level singleton 이라 native player 가 1개만 떠야 정상. 두 개 이상 mount 되면 expo-audio 1.1.x 에서 evict race 발생
- 푸시 안 옴: Expo Go 사용 중이거나 EAS dev build 의 push 자격증명이 만료됐을 가능성. 토큰은 `usePushToken` 에서 마스킹되어 로그됨
- 403 frozen 자동 모달: `services/api.ts` 가 글로벌 403 catch + 디바운스 — `stores/authStore.ts:logout()` 에서 `resetAccountFrozenState()` 호출

---

## 워크스페이스 분리

이 디렉터리는 모바일 앱 전용입니다. 같은 폴더 트리 안에 두 개의 Next.js 워크스페이스가 추가로 있는데, **각자 자체 lockfile / tsconfig / node_modules** 라서 Metro 와 Turbopack 이 충돌하지 않습니다.

| 워크스페이스 | 역할 |
|---|---|
| `web/` | 마케팅 랜딩 페이지 (Next.js 15 + Tailwind v4 + next-intl) |
| `admin/` | 운영자용 대시보드 (dev/QA 전용, **출시 시 `ADMIN_DASHBOARD_ENABLED=false` + Vercel 프로젝트 disable + `cleanup:dev` 3단계 필수**) |

자세한 가드레일은 `admin/CLAUDE.md`.

---

## 함께 보는 레포

- **BE (Express + Supabase + ElevenLabs + Vertex AI)** → [`perso-devrel/haru_BE`](https://github.com/perso-devrel/haru_BE)

---

## 라이선스

MIT. 음성 클론 / 번역 / 실시간 채팅을 결합한 모바일 앱이 어떻게 구성될 수 있는지에 대한 레퍼런스로 자유롭게 참고하세요.
