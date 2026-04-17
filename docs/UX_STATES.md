# UX_STATES.md

> 2026-04-18 Phase 3 #16 · 로딩/에러/빈 상태 UI 가이드. 본 문서는 카탈로그이며, 실제 마이그레이션 PR은 Phase 6에서 파일 단위로 분할한다.

## 1. 에러 상태 (Error)

### 사용 규칙

| 상황 | 패턴 | 이유 |
|------|------|------|
| 폼 제출 후 BE 에러 (로그인, 프로필 저장 등) | `Alert.alert(t('common.error'), describeError(e))` | 사용자가 다음 조작 전에 반드시 인지해야 함 |
| 리스트/화면 전체 로드 실패 (discover, matches) | 인라인 에러 + 재시도 버튼 | 전체 콘텐츠가 없는 상태에서 Alert은 과함 |
| 백그라운드 동기화 실패 (읽음 표시 등) | 조용히 실패 (`catch {}`) | 핵심 UX 흐름을 막지 않기 위함 |
| 재시도 가능한 일시적 네트워크 오류 | 인라인 에러 배너 + "다시 시도" | 네트워크 회복 시 즉시 복구 |

### 금지

- `Alert.alert('Error', err.message)` 같이 영어 타이틀 하드코딩
- `setError(e.message)` 직접 — `describeError(e)`로 통과시킬 것 (문자열 아닐 수도 있음)
- 동시에 Alert + Toast 노출

### 헬퍼

```ts
import { describeError, errorStatus } from '@/utils/errors';

try {
  await api.post(...);
} catch (e) {
  Alert.alert(t('common.error'), describeError(e, t('common.tryAgain')));
}
```

- `describeError(e, fallback)` — `ApiRequestError.errorMessage` > `Error.message` > `string` > `fallback` 순.
- `errorStatus(e)` — 401/403 분기용 0/status.

---

## 2. 로딩 상태 (Loading)

### 사용 규칙

| 상황 | 패턴 |
|------|------|
| 화면 전체가 데이터를 기다림 (첫 진입) | `LoadingScreen` 전체 커버 |
| 버튼 액션 대기 (로그인, 저장) | `<Button loading />` — 내부 `ActivityIndicator` |
| 리스트 하단 페이징 | `<ActivityIndicator />` footer |
| 토스트/배너 수준의 가벼운 로딩 | 별도 컴포넌트 없음 (Phase 3 #17에서 결정) |

### 금지

- 여러 loading indicator 동시 렌더(예: FlatList 로딩 + LoadingScreen)
- `loading` 상태를 안 풀어 둔 상태로 화면 이탈 — `try/finally`로 항상 해제

---

## 3. 빈 상태 (Empty)

### 사용 규칙

| 스크린 | 빈 상태 문구 key | CTA |
|--------|-----------------|-----|
| discover | `discover.noMoreProfiles` + `discover.checkBackLater` | — |
| matches | `matches.noMatches` + `matches.startSwiping` | discover 탭 이동 |
| chat (첫 진입) | `matches.startConversation` | 입력바 포커스 |
| profile 사진 | `profile.addPhoto` | 업로더 오픈 |

### 일관 레이아웃

```
+---------------------+
|                     |
|      (icon)         |
|    headline         |
|    subline          |
|    [ primary CTA ]  |
|                     |
+---------------------+
```

- icon: `@expo/vector-icons` 기준 크기 48, color `colors.textSecondary`.
- headline / subline은 모두 i18n 키.
- CTA는 도달 가능한 다음 액션.

---

## 4. 마이그레이션 로드맵

Phase 6에서 아래 파일 단위로 이슈를 쪼갠다:

- `src/hooks/useChat.ts` (5 catch 분기)
- `src/hooks/useProfile.ts` (8 catch 분기)
- `src/hooks/useVoice.ts`, `useMatches.ts`, `useDiscover.ts`, `usePreferences.ts`
- `src/app/(auth)/login.tsx` (Alert + setError 혼재)
- `src/app/(main)/(tabs)/*.tsx`
- `src/app/(main)/setup/*.tsx`, `settings/*.tsx`

각 PR은 `describeError` 치환 + 테스트 추가 + UX 규칙 준수만 다룬다(기능 변경 금지).

## 변경 이력

| 날짜 | 내용 | 담당 |
|------|------|------|
| 2026-04-18 | 최초 작성 | Ralph Loop |
