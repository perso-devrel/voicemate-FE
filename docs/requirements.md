# VoiceMate 요구사항 정의서

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | VoiceMate |
| 개요 | 음성 클론 기반의 크로스 언어 소개팅 모바일 앱 |
| 핵심 가치 | 언어가 다른 사용자 간 AI 음성 더빙으로 자연스러운 소통 |
| 플랫폼 | iOS / Android (Expo) |

### 1.1 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | Expo (React Native + TypeScript) |
| 백엔드 | Node.js + Express 5 + TypeScript |
| 인프라 | Supabase (Auth + PostgreSQL + Storage + Realtime) |
| 외부 API | ElevenLabs (음성 클론, TTS, 더빙) |

---

## 2. 사용자 흐름 (User Flow)

```
앱 시작
  → Google 소셜 로그인
  → 프로필 등록 (이름, 생년월일, 성별, 국적, 언어, 사진, 자기소개, 관심사)
  → 음성 등록 (음성 샘플 녹음 → AI 음성 클론 생성)
  → 매칭 탐색 (추천 후보 카드 스와이프)
  → 양방향 Like 시 매치 성립
  → 메시지 채팅 (텍스트 전송 → AI 음성 더빙 + 번역 자동 생성)
```

---

## 3. 기능 요구사항

### 3.1 인증 (Authentication)

| ID | 기능 | 설명 | API |
|----|------|------|-----|
| AUTH-1 | Google 소셜 로그인 | Google id_token을 서버에 전달하여 Supabase 인증 수행 | `POST /api/auth/google` |
| AUTH-2 | 토큰 갱신 | refresh_token으로 새 access_token 발급 | `POST /api/auth/refresh` |
| AUTH-3 | 자동 로그인 | 저장된 토큰으로 앱 재시작 시 자동 인증 | 클라이언트 로직 |
| AUTH-4 | 로그아웃 | 저장된 토큰 삭제 및 로그인 화면 이동 | 클라이언트 로직 |

### 3.2 프로필 관리 (Profile)

| ID | 기능 | 설명 | API |
|----|------|------|-----|
| PROF-1 | 프로필 조회 | 내 프로필 정보 조회 | `GET /api/profile/me` |
| PROF-2 | 프로필 생성/수정 | 필수(이름, 생년월일, 성별, 국적, 언어) + 선택(자기소개, 관심사) 정보 upsert | `PUT /api/profile/me` |
| PROF-3 | 프로필 사진 업로드 | 최대 6장, JPEG/PNG/WebP, 5MB 이하 | `POST /api/profile/photos` |
| PROF-4 | 프로필 사진 삭제 | 인덱스 기반 개별 삭제 | `DELETE /api/profile/photos/:index` |

**프로필 필드 상세:**

| 필드 | 타입 | 제약조건 | 필수 |
|------|------|----------|------|
| display_name | string | 1~50자 | O |
| birth_date | string | YYYY-MM-DD 형식 | O |
| gender | enum | `male` / `female` / `other` | O |
| nationality | string | 2~5자 (국가 코드) | O |
| language | string | 2~5자 (언어 코드) | O |
| bio | string | 최대 500자 | X |
| interests | string[] | 최대 10개, 각 30자 이하 | X |
| photos | string[] | 최대 6장 URL | X |

### 3.3 음성 클론 (Voice Clone)

| ID | 기능 | 설명 | API |
|----|------|------|-----|
| VOICE-1 | 음성 샘플 녹음/업로드 | WAV/MP3/MP4/OGG/WebM, 최대 10MB | `POST /api/voice/clone` |
| VOICE-2 | 음성 클론 상태 확인 | `pending` → `processing` → `ready` / `failed` | `GET /api/voice/status` |
| VOICE-3 | 음성 클론 삭제 | ElevenLabs 및 DB에서 삭제 | `DELETE /api/voice/clone` |
| VOICE-4 | 자기소개 음성 자동 생성 | 프로필 저장 시 음성 클론이 있으면 bio를 TTS로 자동 생성 | 서버 자동 처리 |

**음성 클론 상태 머신:**
```
pending → processing → ready
                     → failed
```

### 3.4 매칭 탐색 (Discovery & Swipe)

| ID | 기능 | 설명 | API |
|----|------|------|-----|
| DISC-1 | 추천 후보 목록 조회 | 추천 알고리즘 기반 후보 리스트 반환 | `GET /api/discover` |
| DISC-2 | 스와이프 (Like/Pass) | 후보에 대한 관심 표시 또는 패스 | `POST /api/discover/swipe` |
| DISC-3 | 매치 성립 알림 | 양방향 Like 시 매치 자동 생성, 결과 반환 | 스와이프 응답에 포함 |

**추천 알고리즘 점수 체계:**

| 요소 | 점수 | 설명 |
|------|------|------|
| 언어 차이 | +30 | 다른 언어 사용자 우대 (앱 핵심 가치) |
| 관심사 겹침 | 최대 +30 | 겹치는 관심사 × 10점, 상한 30 |
| 음성 클론 보유 | +15 | 더빙 기능 사용 가능 |
| 프로필 완성도 | 최대 +15 | 사진 3장 이상 +10, 자기소개 +5 |
| 신규 유저 부스트 | +10 | 가입 7일 이내 |
| 결정론적 지터 | 0~15 | 페이지네이션 안정성 |

**필터링 조건:**
- 이미 스와이프한 사용자 제외
- 차단한/당한 사용자 제외
- 매칭 선호 설정 (나이, 성별, 언어) 적용

### 3.5 매칭 관리 (Matches)

| ID | 기능 | 설명 | API |
|----|------|------|-----|
| MATCH-1 | 매치 목록 조회 | 활성 매치 + 상대 프로필 + 마지막 메시지 + 안읽은 수 | `GET /api/matches` |
| MATCH-2 | 매치 해제 (Unmatch) | 소프트 삭제 (unmatched_at 기록) | `DELETE /api/matches/:matchId` |

**매치 목록 항목 구성:**
- 매치 ID, 생성일시
- 상대방 프로필 (이름, 사진, 국적, 언어)
- 마지막 메시지 (텍스트, 발신자, 시간)
- 안읽은 메시지 수

### 3.6 메시지 & 음성 더빙 (Messages)

| ID | 기능 | 설명 | API |
|----|------|------|-----|
| MSG-1 | 메시지 전송 | 텍스트 전송 → 서버에서 비동기 음성 더빙 처리 | `POST /api/matches/:matchId/messages` |
| MSG-2 | 메시지 목록 조회 | 커서 기반 페이지네이션 (before + limit) | `GET /api/matches/:matchId/messages` |
| MSG-3 | 읽음 처리 | 상대방 메시지 일괄 읽음 표시 | `PATCH /api/matches/:matchId/messages/read` |
| MSG-4 | 음성 재생성 | 실패한 음성 더빙 재시도 | `POST /api/matches/:messageId/retry` |
| MSG-5 | 실시간 메시지 수신 | Supabase Realtime 구독 | 클라이언트 로직 |

**메시지 데이터 구조:**

| 필드 | 설명 |
|------|------|
| original_text | 원문 텍스트 (1~1000자) |
| original_language | 원문 언어 |
| translated_text | 번역된 텍스트 (서버 자동 생성) |
| translated_language | 번역 대상 언어 |
| audio_url | 더빙 음성 파일 URL |
| audio_status | `pending` / `processing` / `ready` / `failed` |
| read_at | 읽은 시각 (null이면 안읽음) |

**음성 더빙 파이프라인:**
```
같은 언어: TTS(원문, 보낸이 음성) → 음성 파일
다른 언어: TTS(원문, 보낸이 음성) → Dubbing API(번역 + 음성 변환) → 음성 파일 + 번역 텍스트
```

### 3.7 차단 (Block)

| ID | 기능 | 설명 | API |
|----|------|------|-----|
| BLOCK-1 | 사용자 차단 | 차단 + 기존 매치 자동 해제 | `POST /api/block` |
| BLOCK-2 | 차단 해제 | 차단만 해제 (매치 복원 안됨) | `DELETE /api/block/:blockedId` |
| BLOCK-3 | 차단 목록 조회 | 차단한 사용자 목록 + 기본 프로필 | `GET /api/block` |

### 3.8 신고 (Report)

| ID | 기능 | 설명 | API |
|----|------|------|-----|
| REPORT-1 | 사용자 신고 | 사유 선택 + 상세 설명(선택) | `POST /api/report` |

**신고 사유:**
- `spam` — 스팸
- `inappropriate` — 부적절한 콘텐츠
- `fake_profile` — 허위 프로필
- `harassment` — 괴롭힘
- `other` — 기타

### 3.9 매칭 선호 설정 (Preferences)

| ID | 기능 | 설명 | API |
|----|------|------|-----|
| PREF-1 | 선호 설정 조회 | 현재 매칭 선호 조건 조회 | `GET /api/preferences` |
| PREF-2 | 선호 설정 변경 | 나이 범위, 선호 성별, 선호 언어 설정 | `PUT /api/preferences` |

**선호 설정 필드:**

| 필드 | 타입 | 기본값 | 제약조건 |
|------|------|--------|----------|
| min_age | number | 18 | 18~100, min ≤ max |
| max_age | number | 100 | 18~100 |
| preferred_genders | string[] | 전체 | `male`/`female`/`other` |
| preferred_languages | string[] | 전체 | 언어 코드 배열 |

---

## 4. 비기능 요구사항

### 4.1 인증 & 보안

| ID | 요구사항 |
|----|----------|
| NFR-SEC-1 | 모든 API 요청에 JWT Bearer 토큰 포함 (인증/헬스체크 제외) |
| NFR-SEC-2 | 토큰 만료 시 자동 갱신 (refresh_token 활용) |
| NFR-SEC-3 | 민감 정보(토큰)는 SecureStore에 안전하게 저장 |

### 4.2 실시간 통신

| ID | 요구사항 |
|----|----------|
| NFR-RT-1 | Supabase Realtime으로 메시지 실시간 수신 |
| NFR-RT-2 | 앱 포그라운드 진입 시 구독 재연결 |
| NFR-RT-3 | 새 메시지/매치 시 푸시 알림 |

### 4.3 파일 처리

| ID | 요구사항 |
|----|----------|
| NFR-FILE-1 | 프로필 사진: JPEG/PNG/WebP, 5MB 이하, 최대 6장 |
| NFR-FILE-2 | 음성 샘플: WAV/MP3/MP4/OGG/WebM, 10MB 이하 |
| NFR-FILE-3 | 이미지 업로드 전 리사이징/압축으로 용량 최적화 |

### 4.4 UX

| ID | 요구사항 |
|----|----------|
| NFR-UX-1 | 메시지 전송 시 텍스트 즉시 표시, 음성은 비동기 로딩 |
| NFR-UX-2 | 음성 더빙 상태(`processing`/`ready`/`failed`) 시각적 표시 |
| NFR-UX-3 | 음성 재생 인라인 플레이어 제공 |
| NFR-UX-4 | 스와이프 카드 UI (Tinder 스타일) |
| NFR-UX-5 | 커서 기반 무한 스크롤 (메시지, 매치 목록) |

### 4.5 오프라인 & 에러 처리

| ID | 요구사항 |
|----|----------|
| NFR-ERR-1 | 네트워크 에러 시 사용자 알림 및 재시도 안내 |
| NFR-ERR-2 | API 응답 코드별 적절한 에러 메시지 표시 (400/401/403/404/409) |
| NFR-ERR-3 | 토큰 만료(401) 시 자동 갱신 후 요청 재시도 |

---

## 5. 화면 구성

### 5.1 화면 목록

| 화면 | 설명 | 인증 필요 |
|------|------|-----------|
| 로그인 | Google 소셜 로그인 | X |
| 프로필 등록 | 최초 가입 시 프로필 정보 입력 | O |
| 음성 등록 | 음성 샘플 녹음 및 클론 생성 | O |
| 탐색 (Discover) | 추천 후보 스와이프 카드 | O |
| 매치 목록 | 매칭된 사용자 리스트 | O |
| 채팅 | 1:1 메시지 + 음성 재생 | O |
| 내 프로필 | 프로필 조회 및 수정 | O |
| 설정 | 매칭 선호, 차단 관리, 로그아웃 | O |

### 5.2 네비게이션 구조

```
[인증 안됨]
  └── LoginScreen

[인증됨 + 프로필 미등록]
  └── ProfileSetupScreen → VoiceSetupScreen

[인증됨 + 프로필 등록 완료]
  └── BottomTabNavigator
        ├── DiscoverTab (탐색/스와이프)
        ├── MatchesTab (매치 목록 → ChatScreen)
        └── ProfileTab (내 프로필/설정)
```

---

## 6. API 엔드포인트 요약

| Method | Endpoint | 기능 |
|--------|----------|------|
| POST | `/api/auth/google` | Google 로그인 |
| POST | `/api/auth/refresh` | 토큰 갱신 |
| GET | `/api/profile/me` | 프로필 조회 |
| PUT | `/api/profile/me` | 프로필 생성/수정 |
| POST | `/api/profile/photos` | 사진 업로드 |
| DELETE | `/api/profile/photos/:index` | 사진 삭제 |
| POST | `/api/voice/clone` | 음성 클론 생성 |
| GET | `/api/voice/status` | 음성 클론 상태 |
| DELETE | `/api/voice/clone` | 음성 클론 삭제 |
| GET | `/api/discover` | 추천 후보 조회 |
| POST | `/api/discover/swipe` | 스와이프 |
| GET | `/api/matches` | 매치 목록 |
| DELETE | `/api/matches/:matchId` | 매치 해제 |
| GET | `/api/matches/:matchId/messages` | 메시지 목록 |
| POST | `/api/matches/:matchId/messages` | 메시지 전송 |
| PATCH | `/api/matches/:matchId/messages/read` | 읽음 처리 |
| POST | `/api/matches/:messageId/retry` | 음성 재생성 |
| POST | `/api/block` | 사용자 차단 |
| DELETE | `/api/block/:blockedId` | 차단 해제 |
| GET | `/api/block` | 차단 목록 |
| POST | `/api/report` | 사용자 신고 |
| GET | `/api/preferences` | 선호 설정 조회 |
| PUT | `/api/preferences` | 선호 설정 변경 |

---

## 7. 데이터 모델 (주요 테이블)

### profiles
```
id, display_name, birth_date, gender, nationality, language,
bio, interests[], photos[], elevenlabs_voice_id, voice_sample_url,
voice_clone_status, bio_audio_url, is_active, created_at, updated_at
```

### matches
```
id, user1_id, user2_id, unmatched_at, unmatched_by, created_at
제약: user1_id < user2_id (정규화된 정렬)
```

### messages
```
id, match_id, sender_id, original_text, original_language,
translated_text, translated_language, audio_url, audio_status,
read_at, created_at
```

### swipes
```
id, swiper_id, swiped_id, direction(like|pass), created_at
```

### blocks / reports / user_preferences
- 차단, 신고, 매칭 선호 설정 관리

---

## 8. Supabase Storage 버킷

| 버킷 | 용도 | 파일 경로 패턴 |
|-------|------|----------------|
| photos | 프로필 사진 | `{userId}/{timestamp}_{uuid}.{ext}` |
| voice-samples | 음성 클론 원본 | `{userId}.wav` |
| voice-messages | 더빙 음성 파일 | `{messageId}.mp3` |
| bio-audio | 자기소개 TTS | `{userId}/bio.mp3` |

---

## 9. 핵심 비즈니스 규칙

1. **양방향 Like = 매치 성립**: A가 B를 Like + B가 A를 Like → 자동 매치 생성
2. **차단 시 매치 자동 해제**: 차단하면 기존 매치가 소프트 삭제됨
3. **차단 해제 시 매치 미복원**: 차단 해제해도 이전 매치는 돌아오지 않음
4. **스와이프는 1회**: 같은 상대에게 재스와이프 불가 (UNIQUE 제약)
5. **신고는 1회**: 같은 상대 중복 신고 불가
6. **메시지 즉시 전달 + 음성 비동기**: 텍스트는 즉시 저장/표시, 음성 더빙은 백그라운드 처리
7. **음성 클론 → 자기소개 음성 자동 생성**: 음성 클론이 ready 상태면 프로필 저장 시 bio 음성 자동 생성
8. **크로스 언어 우대**: 추천 알고리즘에서 다른 언어 사용자에게 +30점 가산
