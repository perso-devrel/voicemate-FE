# API_MAP.md

> 2026-04-18 Phase 4 #21 · `voicemate-FE` 와 `voicemate-BE-v2` 간 REST 엔드포인트 cross-reference.
> BE 저장소는 수정 금지 (TASK.md §🚫 3). 불일치 발견 시 `docs/BE_DEPENDENCIES.md`에 제안만.

## 범례

- ✅ : BE/FE 경로·메서드 일치
- ⚠️ : 호출 방식 차이 (예: `fetchWithTimeout` 경유 vs 직접 upload) — 타임아웃/에러 매핑 일관성 주의
- ❌ : 불일치 (없음)

## 인증 (`/api/auth`)

| BE 메서드 · 경로 | FE 호출처 | 일치 |
|------------------|-----------|------|
| POST `/api/auth/signup` | `services/auth.ts signupWithEmail` | ✅ |
| POST `/api/auth/login` | `services/auth.ts loginWithEmail` | ✅ |
| POST `/api/auth/google` | `services/auth.ts loginWithGoogle` | ✅ |
| POST `/api/auth/refresh` | `services/api.ts refreshAccessToken` (내부) | ✅ |

## 프로필 (`/api/profile`)

| BE 메서드 · 경로 | FE 호출처 | 일치 |
|------------------|-----------|------|
| GET `/api/profile/me` | `services/profile.ts getProfile` | ✅ |
| PUT `/api/profile/me` | `services/profile.ts upsertProfile` | ✅ |
| POST `/api/profile/photos` | `services/profile.ts uploadPhoto` (FileSystem.uploadAsync) | ⚠️ `api.upload` 미사용 — 별도 타임아웃 없음 |
| DELETE `/api/profile/photos/:index` | `services/profile.ts deletePhoto` | ✅ |

## 음성 클론 (`/api/voice`)

| BE 메서드 · 경로 | FE 호출처 | 일치 |
|------------------|-----------|------|
| POST `/api/voice/clone` | `services/voice.ts uploadVoiceClone` (FileSystem.uploadAsync) | ⚠️ `api.upload` 미사용 — 타임아웃 60초 미적용 |
| GET `/api/voice/status` | `services/voice.ts getVoiceStatus` | ✅ |
| DELETE `/api/voice/clone` | `services/voice.ts deleteVoiceClone` | ✅ |

## 디스커버 / 스와이프 (`/api/discover`)

| BE 메서드 · 경로 | FE 호출처 | 일치 |
|------------------|-----------|------|
| GET `/api/discover` (`?limit`) | `services/discover.ts getCandidates` | ✅ |
| POST `/api/discover/swipe` | `services/discover.ts swipe` | ✅ |

## 매치 (`/api/matches`)

| BE 메서드 · 경로 | FE 호출처 | 일치 |
|------------------|-----------|------|
| GET `/api/matches` (`?limit`, `?before`) | `services/matches.ts getMatches` | ✅ |
| DELETE `/api/matches/:matchId` | `services/matches.ts deleteMatch` | ✅ |

## 메시지 (`/api/matches/:matchId/messages`, 기타)

| BE 메서드 · 경로 | FE 호출처 | 일치 |
|------------------|-----------|------|
| GET `/api/matches/:matchId/messages` | `services/messages.ts getMessages` | ✅ |
| POST `/api/matches/:matchId/messages` | `services/messages.ts sendMessage` | ✅ |
| PATCH `/api/matches/:matchId/messages/read` | `services/messages.ts markAsRead` | ✅ |
| POST `/api/matches/:messageId/retry` | `services/messages.ts retryAudio` | ✅ |

## 차단 (`/api/block`)

| BE 메서드 · 경로 | FE 호출처 | 일치 |
|------------------|-----------|------|
| GET `/api/block` | `services/block.ts listBlocked` | ✅ |
| POST `/api/block` | `services/block.ts blockUser` | ✅ |
| DELETE `/api/block/:blockedId` | `services/block.ts unblockUser` | ✅ |

## 선호 (`/api/preferences`)

| BE 메서드 · 경로 | FE 호출처 | 일치 |
|------------------|-----------|------|
| GET `/api/preferences` | `services/preferences.ts getPreferences` | ✅ |
| PUT `/api/preferences` | `services/preferences.ts updatePreferences` | ✅ |

## 신고 (`/api/report`)

| BE 메서드 · 경로 | FE 호출처 | 일치 |
|------------------|-----------|------|
| POST `/api/report` | `services/report.ts reportUser` | ✅ |

## ⚠️ 업로드 경로 타임아웃 일관성 제안

`FileSystem.uploadAsync`를 직접 사용하는 2곳(`uploadPhoto`, `uploadVoiceClone`)은 `api.upload()`가 적용하는 `UPLOAD_TIMEOUT_MS = 60000`을 적용하지 않는다. 네트워크가 끊긴 상황에서 업로드가 무한 대기할 수 있다.

**제안 (Phase 6 분리 이슈)**:
- `api.upload()`로 통일하거나
- `FileSystem.uploadAsync` 호출을 `AbortController` + `setTimeout(controller.abort, 60_000)`로 래핑
- `ApiRequestError` 포맷으로 실패 surface하여 기존 핸들러와 호환

## 누락된 BE/FE 엔드포인트

- BE에 있지만 FE에서 호출되지 않는 엔드포인트: **없음**.
- FE가 기대하지만 BE에 없는 엔드포인트: **없음**.

FE의 API 경로는 모두 BE에 매칭된다 — 구조 정합성은 양호.
