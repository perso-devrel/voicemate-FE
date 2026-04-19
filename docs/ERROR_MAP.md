# ERROR_MAP.md

> 2026-04-18 Phase 4 #23 · BE 에러 문자열 → FE i18n 매핑 후보.
> 실제 매핑 레이어는 Phase 6에서 `src/utils/errors.ts`에 `mapApiError()`로 추가한다.

## 배경

- BE는 오류 시 `{ error: "문자열" }`을 반환한다.
- FE는 `ApiRequestError.errorMessage`로 그대로 surface 한다.
- 현재는 영어 원문이 그대로 사용자에게 노출되며 i18n 대칭성이 깨진다.

## 전략

1. BE 에러 문자열 → FE `errors.*` 네임스페이스 i18n 키로 룩업한다.
2. 룩업 실패 시 원문 + 상태 코드를 fallback으로 노출.
3. 민감 정보가 포함될 수 있는 Supabase DB 에러는 일괄 `errors.generic`으로 치환.

## 매핑 표

| HTTP | BE 문자열 | 제안 i18n 키 | 제안 ko 문구 | 제안 en 문구 |
|------|----------|-------------|---------------|---------------|
| 401 | `Missing or invalid authorization header` | `errors.auth.missingHeader` | 로그인이 필요합니다. 다시 로그인해주세요. | Please sign in again. |
| 401 | `Invalid or expired token` | `errors.auth.expired` | 세션이 만료되었습니다. 다시 로그인해주세요. | Your session expired. Please sign in again. |
| 400 | `email and password are required` | `errors.auth.missingCreds` | 이메일과 비밀번호를 입력해주세요. | Email and password are required. |
| 400 | `id_token is required` | `errors.auth.googleTokenMissing` | Google 로그인 정보를 불러오지 못했습니다. | Could not retrieve Google sign-in info. |
| 400 | `refresh_token is required` | `errors.auth.refreshMissing` | 세션 정보가 없습니다. 다시 로그인해주세요. | No session. Please sign in again. |
| 400 | `Cannot block yourself` | `errors.block.self` | 자기 자신을 차단할 수 없습니다. | You can't block yourself. |
| 409 | `Already blocked` | `errors.block.duplicate` | 이미 차단한 사용자입니다. | Already blocked. |
| 404 | `Block not found` | `errors.block.notFound` | 차단 정보를 찾을 수 없습니다. | Block not found. |
| 404 | `Profile not found` | `errors.profile.notFound` | 프로필을 찾을 수 없습니다. | Profile not found. |
| 400 | `No photo file provided` | `errors.photo.missing` | 사진을 선택해주세요. | Please pick a photo. |
| 400 | `Only JPEG, PNG, WebP images are allowed` | `errors.photo.unsupported` | JPEG, PNG, WebP 형식만 업로드할 수 있습니다. | Only JPEG, PNG, and WebP are allowed. |
| 400 | `Maximum 6 photos allowed` | `errors.photo.tooMany` | 최대 6장까지 업로드할 수 있습니다. | Up to 6 photos only. |
| 400 | `Invalid photo index` | `errors.photo.invalidIndex` | 잘못된 사진입니다. | Invalid photo. |
| 403 | `Not a member of this match` | `errors.match.notMember` | 이 매치에 접근할 수 없습니다. | You don't have access to this match. |
| 403 | `This match has been unmatched` | `errors.match.unmatched` | 이미 해제된 매치입니다. | This match has been ended. |
| 403 | `Cannot send message to blocked user` | `errors.message.blocked` | 차단한 사용자에게는 메시지를 보낼 수 없습니다. | You can't message a blocked user. |
| 404 | `Message not found` | `errors.message.notFound` | 메시지를 찾을 수 없습니다. | Message not found. |
| 400 | `Audio is not in failed state` | `errors.message.audioNotFailed` | 재시도할 수 없는 상태입니다. | Retry not available for this message. |
| 400 | `No voice clone available` | `errors.voice.none` | 먼저 음성 클론을 생성해주세요. | Please create a voice clone first. |
| 400 | `No audio file provided` | `errors.voice.missing` | 녹음 파일이 없습니다. | Please provide an audio file. |
| 400 | `Only audio files (WAV, MP3, MP4, OGG, WebM) are allowed` | `errors.voice.unsupported` | WAV/MP3/MP4/OGG/WebM만 업로드할 수 있습니다. | Only WAV, MP3, MP4, OGG, WebM allowed. |
| 500 | `Voice clone creation failed` | `errors.voice.cloneFailed` | 음성 클론 생성에 실패했습니다. 다시 시도해주세요. | Voice clone creation failed. Try again. |
| 409 | `Already swiped this user` | `errors.swipe.duplicate` | 이미 선택한 사용자입니다. | You've already swiped on this user. |
| 404 | `Match not found` | `errors.match.notFound` | 매치 정보를 찾을 수 없습니다. | Match not found. |
| 400 | `Cannot report yourself` | `errors.report.self` | 자기 자신을 신고할 수 없습니다. | You can't report yourself. |
| 409 | `Already reported this user` | `errors.report.duplicate` | 이미 신고한 사용자입니다. | Already reported. |
| 500 | `Internal server error` | `errors.generic` | 일시적인 오류가 발생했습니다. | Something went wrong. |

### Fallback

- 위 테이블에 없는 문자열 → `errors.generic`으로 치환.
- Supabase DB 에러(문자열에 "duplicate key value", "RLS", "permission denied" 등 포함) → `errors.generic` + 디버그 로그(DEV만).

## Phase 6 구현 스켈레톤

```ts
// src/utils/errors.ts (확장 예정)
const STATIC_MAP: Record<string, string> = {
  'Cannot block yourself': 'errors.block.self',
  'Already blocked': 'errors.block.duplicate',
  // ... 전체 테이블
};

export function mapApiError(e: unknown, t: (k: string) => string): string {
  if (e instanceof ApiRequestError) {
    const key = STATIC_MAP[e.errorMessage];
    if (key) return t(key);
  }
  return describeError(e, t('errors.generic'));
}
```

- 모든 Alert 호출 지점에서 `describeError(e)` → `mapApiError(e, t)`로 점진 교체.
- 각 도메인별 단건 PR로 쪼갠다 (Phase 6 §허용 범위 `에러 메시지 개선`).

## 검증 전략

- 매핑 레이어 도입 시 유닛 테스트 1 케이스/분류(17개 이상)로 고정.
- `docs/UX_STATES.md` §1의 에러 패턴과 일관성 유지.
