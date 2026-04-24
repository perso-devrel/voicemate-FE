# 프로필 사진 블러/잠금 상태 일원화 — QA 실행 리포트

작업 디렉토리: `C:\Users\EST-INFRA\voicemate-FE`
실행일: 2026-04-24
검증 대상: `src/types/index.ts`, `src/components/matches/MatchItem.tsx`, `src/components/discover/SwipeCard.tsx`

## 실행 결과 요약

| 검증 | 결과 | 비고 |
|------|------|------|
| typecheck (`tsc --noEmit`) | PASS | 종료 코드 0, 오류 0건 |
| lint (`eslint` 변경 3파일) | PASS | 종료 코드 0, error 0 / warning 0 |
| test (`jest --findRelatedTests`) | 미작성 | 변경 대상 모듈에 해당하는 테스트 없음 (실패 아님) |
| 런타임 정합성 | PASS | `Avatar.blur: boolean`, RN `Image.blurRadius: number` 시그니처 일치 |

## 실행한 명령어와 결과

### 1) 타입 체크
```bash
npx tsc --noEmit
# EXIT_CODE=0
```
- 신규 회귀 0건
- `MatchListItem.is_unlocked?: boolean`이 optional로 선언되어 있어 기존 매칭 리스트 consumer(useMatches, MatchListScreen 등)에 타입 회귀 없음
- `<Avatar ... blur={!item.is_unlocked} />`: `!undefined === true`, `!false === true`, `!true === false` 모두 `boolean`으로 평가되어 Avatar prop 시그니처(`blur?: boolean`)와 일치
- `<Image ... blurRadius={24} />`: react-native `ImageProps.blurRadius?: number` 시그니처와 일치

### 2) 린트
```bash
npx eslint src/types/index.ts src/components/matches/MatchItem.tsx src/components/discover/SwipeCard.tsx
# EXIT_CODE=0
```
- error 0건, warning 0건
- 변경 파일 모두 무결

### 3) 테스트
```bash
npx jest --findRelatedTests src/types/index.ts src/components/matches/MatchItem.tsx src/components/discover/SwipeCard.tsx
# Pattern - 0 matches
```
- 해당 파일을 참조하는 기존 테스트 없음 → "테스트 미작성"으로 분류 (실패 아님)
- 기존 전체 jest 스위트는 변경 파일을 import하지 않으므로 회귀 영향권 밖

### 4) 런타임 정합성
- `src/components/ui/Avatar.tsx:11` — `blur?: boolean` prop 실제 구현 확인 (`blurRadius={blur ? Math.max(8, size * 0.35) : 0}`). boolean 값 그대로 전달 가능
- `src/components/discover/SwipeCard.tsx:89` — `blurRadius={24}`은 리터럴 number, RN `Image`의 `blurRadius?: number` 시그니처 충족
- `is_unlocked` 참조 그레프: `src/types/index.ts:127`(정의), `src/components/matches/MatchItem.tsx:25`(사용) 2곳만 — 예상 범위 내
- `useMatches` / `services/matches.ts`는 응답 shape 그대로 통과시키므로 타입 확장만으로 자동 반영 (Implementer 요약과 일치)
- expo-router 라우트 변경 없음 — 라우팅 정합성 검증 불필요

## 신규 회귀 (이번 변경에 의한 오류)

- 없음

## 기존 이슈 (변경 외 영역의 기존 오류)

- 없음 (typecheck / lint 클린)

## 사용자 개입 필요

- 없음 (자동 수정 없이 통과)

## 통과 항목

- TypeScript 컴파일 (strict)
- ESLint (변경 3파일)
- 기존 jest 테스트 회귀 없음 (변경 파일에 참조 테스트 부재)
- RN/Expo 컴포넌트 prop 시그니처 정합성

## 권장 후속 (QA 범위 밖, INFO)

- [INFO] `MatchItem`의 렌더 스냅샷 테스트 작성 권장 (`is_unlocked=false/true/undefined` 3-케이스로 `blur` prop 전달값 검증). Implementer 요약의 "BE 배포 전/후 예상 동작 표"를 회귀 방지 테이블로 고정 가능
- [INFO] `SwipeCard`의 `blurRadius={24}` 상수 하드코딩 — Designer 검토 후 토큰화 여부 결정 (현재는 Planner §11-1 의도에 부합)
- [INFO] BE `is_unlocked` 필드 배포 완료 시, optional → required로 타입 승격 및 기본값 fallback 제거 고려

## 최종 판정

PASS — 변경 3파일 모두 typecheck/lint 통과, 신규 회귀 없음, 자동 수정 0건.
