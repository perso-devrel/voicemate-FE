# QA_CHECKLIST.md

> 2026-04-18 Phase 5 #27 · 수동 QA 체크리스트.
> 기기별(iOS 실기기 / Android 실기기 / 시뮬레이터) 결과를 기록한다.

## 0. 준비

- [ ] BE(`voicemate-BE-v2`) 로컬에서 `npm run dev`로 기동
- [ ] FE `.env` 설정:
  - [ ] 실기기: `EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:3000`
  - [ ] Android 에뮬레이터: `http://10.0.2.2:3000`
  - [ ] iOS 시뮬레이터: `http://localhost:3000`
- [ ] Expo Dev Tools에서 QR 스캔 또는 `npm run android` / `npm run ios`
- [ ] 테스트용 Google 계정 2개 (실시간 송수신 확인)

## 1. 인증 플로우

- [ ] 이메일 회원가입 (신규 이메일) → 홈 진입
- [ ] 이메일 로그인 → 홈 진입
- [ ] 비밀번호 오입력 → `auth.loginFailed` Alert (문구 자연스러움)
- [ ] Google 로그인 → 홈 진입
- [ ] 로그아웃 → 로그인 화면 복귀
- [ ] 이메일 로딩 중에 Google 버튼 클릭 — 반응 없음(정상), Google 버튼 opacity 그대로
- [ ] DEV 빌드에서 `[DEV] Skip Login` 버튼이 보이고 프로덕션에서는 숨겨짐

## 2. 프로필 / 음성 등록 (첫 진입)

- [ ] 신규 계정 첫 로그인 → 프로필 생성 화면
- [ ] 뒤로가기 → 로그아웃 확인 후 로그아웃
- [ ] 프로필 저장 → 음성 등록 화면
- [ ] 음성 녹음 권한 요청 + 수락
- [ ] 30초 이상 녹음 → 업로드 성공 → 클론 상태 `processing → ready`
- [ ] 10초 미만 녹음 시 `setupVoice.tooShortMessage` Alert
- [ ] 10MB 초과 시 `setupVoice.voiceSizeLimit` Alert
- [ ] 녹음 도중 화면 이탈 — 앱이 크래시하지 않음(오디오 플레이어 누수 방지)

## 3. 매칭 / 스와이프 (Discover)

- [ ] Discover 탭 진입 → 후보 1장 렌더
- [ ] 우측 스와이프(좋아요)
- [ ] 좌측 스와이프(패스)
- [ ] 후보 소진 시 EmptyState(`discover.noMoreProfiles`) 표시
- [ ] 상호 좋아요 시 매치 모달 표시 (`discover.match!`)

## 4. Matches 탭

- [ ] 매치 없음 → EmptyState + "지금 둘러보기" CTA → Discover 이동
- [ ] 매치가 생기면 행 표시, 마지막 메시지 미리보기
- [ ] 매치 행 탭 → 채팅 화면 진입

## 5. 채팅 / 실시간 송수신 (실기기 2대 필요)

- [ ] A에서 B에게 메시지 전송 → B 화면에 즉시 반영 (≤ 2초)
- [ ] 반대 방향도 동일
- [ ] 비행기 모드로 B 단말 끊기 → A가 보낸 메시지가 재연결 후 자동 반영 (AppState 복귀 → 재구독 확인)
- [ ] 오래된 메시지 상단 로드 (FlatList `onStartReached`)
- [ ] 음성 클론이 생성된 계정끼리: `audio_status`가 `ready`로 전이 후 재생 버튼 활성
- [ ] 재생 중 다른 메시지 재생 → 이전 player가 해제되고 새 재생만 들림 (누수 방지)
- [ ] 채팅 화면 이탈 시 오디오 정지
- [ ] Android 제스처 나비 — 입력바가 nav bar와 겹치지 않음 (`MIN_BOTTOM_SAFE_PAD`)

## 6. 프로필 / 설정

- [ ] 프로필 탭에서 프로필 정보 표시
- [ ] 사진 추가/삭제
- [ ] 프로필 편집 → 저장 → 반영
- [ ] 음성 클론 설정 진입 → 상태 표시, 삭제
- [ ] 매칭 선호 설정 → 성별/언어 Chip 선택 → 저장 → 재진입 시 복원
- [ ] 최소/최대 연령 저장 후 재진입 시 동일
- [ ] legacy `'한국어'` 값 필터 — 저장된 preferred_languages에 레거시 값이 있어도 UI에서 드롭

## 7. 차단 / 신고

- [ ] 매치 상대 프로필에서 차단 → 매치가 즉시 사라짐
- [ ] 차단된 사용자는 Discover에서도 노출되지 않음
- [ ] 차단 목록에서 해제 → 다시 보임 (캐시 초기화 고려)
- [ ] 신고 → 사유 선택 → 중복 신고 시 `Already reported` Alert

## 8. 접근성 / UX

- [ ] 스크린리더(VoiceOver/TalkBack) 기본 동작 시 Button 제목이 읽힘
- [ ] 로딩 indicator가 반응하며, 액션 실패 시 Alert 출력
- [ ] 언어 설정: 기기 언어를 ko/en으로 변경 시 모든 화면 문자열이 해당 언어로 스위치

## 9. 기록

| 날짜 | 담당 | 기기 | 결과 |
|------|------|------|------|
| | | | |

## 변경 이력

| 날짜 | 내용 | 담당 |
|------|------|------|
| 2026-04-18 | 초기 체크리스트 | Ralph Loop |
