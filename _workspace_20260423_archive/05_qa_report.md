# 메시지 감정 옵션 (Emotion-Aware TTS) QA 실행 리포트

> 작업일: 2026-04-23
> 검증 대상: `_workspace/02_implementer_summary.md`의 변경 파일 9건
> 작업 디렉토리: `C:\Users\EST-INFRA\voicemate-FE`

## 실행 결과 요약

| 검증 | 결과 | 비고 |
|---|---|---|
| `npm run typecheck` | **PASS** (EXIT 0) | `tsc --noEmit` 무출력 |
| `npm run lint` | **PASS (with warnings)** | 0 errors / 5 warnings (전부 기존 이슈) |
| `npm test` | 미실행 (테스트 미작성) | 변경 모듈에 대한 jest 테스트 파일 없음 |
| expo-router 라우트 | **PASS** | `[matchId].tsx`의 `useLocalSearchParams<{ matchId: string; ... }>()` 일치 확인 |
| 신규 파일 존재 | **PASS** | `src/constants/emotions.ts`, `src/components/chat/EmotionPicker.tsx` 모두 존재 |

## 신규 회귀 (이번 변경에 의한 오류)

**없음.** 이번 변경 파일(`types/index.ts`, `services/messages.ts`, `hooks/useChat.ts`, `app/(main)/chat/[matchId].tsx`, `components/chat/ChatBubble.tsx`, `i18n/locales/ko.ts`, `i18n/locales/en.ts`, 신규 `src/constants/emotions.ts`, 신규 `src/components/chat/EmotionPicker.tsx`)에서 typecheck / lint 오류가 발생하지 않았다.

자동 수정 시도 0건 (수정할 신규 회귀 없음).

## 기존 이슈 (변경 외 영역의 기존 경고)

이번 변경과 무관하며, 본 QA 범위 밖. 보고만 하고 수정하지 않음.

| 파일 | 라인 | 규칙 | 메시지 | 분류 |
|---|---|---|---|---|
| `src/app/(main)/(tabs)/profile.tsx` | 20:10 | `@typescript-eslint/no-unused-vars` | `'Button' is defined but never used` | WARNING |
| `src/app/(main)/(tabs)/profile.tsx` | 24:10 | `@typescript-eslint/no-unused-vars` | `'useAuthStore' is defined but never used` | WARNING |
| `src/app/_layout.tsx` | 46:6 | `react-hooks/exhaustive-deps` | `useEffect missing dependency: 'tryAutoLogin'` | WARNING |
| `src/hooks/useVoice.ts` | 64:6 | `react-hooks/exhaustive-deps` | `useCallback missing dependency: 'stopPolling'` | WARNING |
| `src/i18n/index.ts` | 21:1 | `import/no-named-as-default-member` | `i18n also has named export 'use'` | INFO |

해당 파일 5종 중 어느 것도 이번 emotion 기능 구현에서 수정되지 않았음(`git status --short`로 확인). 따라서 모두 기존(pre-existing) 이슈.

## 사용자 개입 필요

**없음.** 자동 수정이 필요한 신규 회귀가 없으며, 기존 이슈도 별도 정리 작업으로 분리하여 처리하면 됨.

## 통과 항목

- `tsc --noEmit` 전체 프로젝트 타입 체크 통과
- ESLint 전체 프로젝트 0 errors
- 신규 `Emotion` union 8종(`neutral | happy | sad | angry | surprised | excited | whispering | laughing`)이 `messages.ts`, `useChat.ts`, `EmotionPicker.tsx`, `ChatBubble.tsx`에서 일관되게 참조됨 (타입 충돌 없음)
- `Message.emotion: Emotion | null` 옵셔널 처리가 ChatBubble의 truthy-check와 정합 (타입 좁히기 누락 없음)
- expo-router 동적 라우트 `[matchId].tsx` 파라미터 이름 일치
- 신규 파일 import 경로 모두 유효 (typecheck 통과로 입증)
- i18n 키 `chat.emotion.*`, `chat.emotionPicker.toggleLabel` ko/en 양쪽 동일 구조 (typecheck 시 정의 누락 시 타입 에러로 검출됨)

## 비고

- 사용자 지시에 따라 리포트를 `_workspace/05_qa_report.md`에 저장(에이전트 기본 출력 경로 `04_qa_report.md`가 아님). 향후 동일 사이클의 리뷰어 산출물과 번호 충돌하지 않도록 주의.
- `npm test` 미실행: `package.json`상 jest 설정 또는 변경 모듈 대상 테스트 파일이 미작성. 본 변경은 UI/타입/서비스 시그니처 위주이며 BE 통합 검증은 별도 reviewer 단계 책임.
