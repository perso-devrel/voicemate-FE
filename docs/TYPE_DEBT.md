# TYPE_DEBT.md

> 2026-04-17 Phase 1 #2 · `voicemate-FE`의 `any` 사용 부채 인벤토리.
> 전수 30건 / 14개 파일. 개별 축소는 Phase 6 리팩토링 트랙에서 진행한다.

## 범례

| 카테고리 | 설명 | 권장 리팩토링 |
|----------|------|---------------|
| `E-catch` | `try { … } catch (e: any)` 에러 바인딩 | `catch (e: unknown)` + 타입 좁히기(`e instanceof ApiRequestError`) |
| `Nav-event` | `expo-router` / React Navigation 이벤트 핸들러 | 라이브러리 제공 이벤트 타입 사용 |
| `Misc` | 그 외 | 개별 명세 |

## 인벤토리

| # | 파일 | 라인 | 스니펫 | 카테고리 | 권장 방향 |
|---|------|------|--------|----------|-----------|
| 1 | ~~`src/services/api.ts`~~ | ~~26~~ | ~~`} catch (e: any) {`~~ | E-catch | ✅ 해결 (Phase 6 #63 — `unknown` + `e instanceof Error && e.name === 'AbortError'`) |
| 2 | `src/hooks/useDiscover.ts` | 16 | `} catch (e: any) {` | E-catch | 공용 `useErrorHandler` 훅(Phase 3 #16 후)에 위임 |
| 3 | `src/hooks/useDiscover.ts` | 31 | `} catch (e: any) {` | E-catch | 〃 |
| 4 | `src/hooks/usePreferences.ts` | 16 | `} catch (e: any) {` | E-catch | 〃 |
| 5 | `src/hooks/usePreferences.ts` | 30 | `} catch (e: any) {` | E-catch | 〃 |
| 6 | `src/hooks/useVoice.ts` | 18 | `} catch (e: any) {` | E-catch | 〃 |
| 7 | `src/hooks/useVoice.ts` | 32 | `} catch (e: any) {` | E-catch | 〃 |
| 8 | `src/hooks/useVoice.ts` | 47 | `} catch (e: any) {` | E-catch | 〃 |
| 9 | ~~`src/hooks/useChat.ts`~~ | ~~24~~ | ~~E-catch~~ | E-catch | ✅ #71 |
| 10 | ~~`src/hooks/useChat.ts`~~ | ~~40~~ | ~~E-catch~~ | E-catch | ✅ #71 |
| 11 | ~~`src/hooks/useChat.ts`~~ | ~~53~~ | ~~E-catch~~ | E-catch | ✅ #71 |
| 12 | `src/hooks/useMatches.ts` | 19 | `} catch (e: any) {` | E-catch | 〃 |
| 13 | `src/hooks/useMatches.ts` | 35 | `} catch (e: any) {` | E-catch | 〃 |
| 14 | `src/hooks/useProfile.ts` | 18 | `} catch (e: any) {` | E-catch | 〃 |
| 15 | `src/hooks/useProfile.ts` | 33 | `} catch (e: any) {` | E-catch | 〃 |
| 16 | `src/hooks/useProfile.ts` | 48 | `} catch (e: any) {` | E-catch | 〃 |
| 17 | `src/hooks/useProfile.ts` | 71 | `} catch (e: any) {` | E-catch | 〃 |
| 18 | `src/app/(auth)/login.tsx` | 36 | `} catch (e: any) {` | E-catch | `ApiRequestError` 체크 |
| 19 | `src/app/(auth)/login.tsx` | 61 | `} catch (e: any) {` | E-catch | 〃 |
| 20 | `src/app/(main)/(tabs)/profile.tsx` | 57 | `} catch (e: any) {` | E-catch | 〃 |
| 21 | `src/app/(main)/(tabs)/profile.tsx` | 67 | `} catch (e: any) {` | E-catch | 〃 |
| 22 | `src/app/(main)/settings/blocked.tsx` | 20 | `} catch (e: any) {` | E-catch | 〃 |
| 23 | `src/app/(main)/setup/voice.tsx` | 127 | `} catch (e: any) {` | E-catch | 〃 |
| 24 | `src/app/(main)/setup/voice.tsx` | 141 | `} catch (e: any) {` | E-catch | 〃 |
| 25 | `src/app/(main)/setup/voice.tsx` | 166 | `} catch (e: any) {` | E-catch | 〃 |
| 26 | `src/app/(main)/setup/profile.tsx` | 42 | `navigation.addListener('beforeRemove', (e: any) => …)` | Nav-event | `expo-router`의 `EventListenerCallback<EventMap['beforeRemove']>` 사용 |
| 27 | `src/app/(main)/setup/profile.tsx` | 118 | `} catch (e: any) {` | E-catch | `ApiRequestError` 체크 |
| 28 | `src/app/(main)/chat/[matchId].tsx` | 63 | `} catch (e: any) {` | E-catch | 〃 |
| 29 | `src/app/(main)/chat/[matchId].tsx` | 79 | `} catch (e: any) {` | E-catch | 〃 |
| 30 | `src/app/(main)/settings/preferences.tsx` | 56 | `} catch (e: any) {` | E-catch | 〃 |

## 집계

| 카테고리 | 건수 (2026-04-18 #71 이후) |
|----------|------|
| E-catch | 25 |
| Nav-event | 1 |
| Misc | 0 |
| **합계** | **26** |

## 권고 리팩토링 레시피

### 1. `catch (e: unknown)` + 타입 가드 헬퍼

```ts
// src/utils/errors.ts (신규, Phase 6에서 추가 예정)
import { ApiRequestError } from '@/services/api';

export function describeError(e: unknown, fallback = 'Unexpected error'): string {
  if (e instanceof ApiRequestError) return e.errorMessage;
  if (e instanceof Error) return e.message;
  return fallback;
}
```

- 대부분의 `E-catch` 항목은 `Alert.alert(t('common.error'), describeError(e))` 형태로 치환 가능.
- 단건 PR에 묶어 처리하되 Phase 6 규칙(200줄/PR)에 맞춰 파일 3–4개 단위로 쪼갠다.

### 2. `navigation.addListener('beforeRemove', …)` 이벤트 타입

```ts
import type { EventArg } from '@react-navigation/native';

navigation.addListener('beforeRemove', (e: EventArg<'beforeRemove', true>) => {
  // e.preventDefault() 가능
});
```

- `expo-router`는 내부적으로 React Navigation 기반이므로 `@react-navigation/native`의 타입을 직접 사용해도 안전하다.

## 진행 방침

- **본 이슈(#3)에서는 코드 수정을 하지 않는다.** 부채 목록 확보에 집중.
- Phase 6 진입 시 허용 범위 `리팩토링 / 타입 좁히기` 카테고리에서 우선순위가 높은 E-catch(특히 `src/services/api.ts`의 `fetchWithTimeout`)부터 단일 PR로 처리한다.
- 모든 축소 PR은 사용자 메시지가 회귀 없이 동일하게 유지되는지 확인 후 머지한다.
