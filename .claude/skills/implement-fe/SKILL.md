---
name: implement-fe
description: "VoiceMate Expo/React Native 프론트엔드 코드를 구현하는 스킬. API 스펙을 기반으로 화면, 컴포넌트, 훅, 서비스, 타입을 생성한다. 프로젝트 구조 컨벤션, 코딩 패턴, 파일 배치 규칙을 포함."
---

# FE 코드 구현

Analyzer의 API 스펙을 기반으로 Expo (React Native + TypeScript) 코드를 구현하는 절차.

## 구현 전 필수 확인

1. `_workspace/01_analyzer_spec.md`를 읽어 API 스펙을 파악한다
2. 기존 `src/` 코드가 있으면 먼저 읽고 컨벤션을 파악한다
3. BE 응답 shape과 FE 타입이 정확히 일치하도록 구현한다

## 프로젝트 구조

```
src/
├── app/                    # Expo Router 파일 기반 라우팅
│   ├── (auth)/             # 미인증 화면 그룹
│   │   ├── login.tsx
│   │   └── _layout.tsx
│   ├── (main)/             # 인증 필요 화면 그룹
│   │   ├── (tabs)/         # 하단 탭 네비게이션
│   │   │   ├── discover.tsx
│   │   │   ├── matches.tsx
│   │   │   ├── profile.tsx
│   │   │   └── _layout.tsx
│   │   ├── chat/[matchId].tsx
│   │   ├── setup/
│   │   │   ├── profile.tsx
│   │   │   └── voice.tsx
│   │   └── _layout.tsx
│   ├── _layout.tsx         # 루트 레이아웃
│   └── index.tsx           # 진입점 리다이렉트
├── components/
│   ├── ui/                 # 범용 UI (Button, Input, Card 등)
│   └── [feature]/          # 기능별 컴포넌트 (SwipeCard, ChatBubble 등)
├── hooks/                  # 커스텀 훅 (useAuth, useProfile 등)
├── services/               # API 서비스 레이어
│   ├── api.ts              # fetch wrapper + 토큰 관리 + 401 자동 갱신
│   └── [feature].ts        # 기능별 API 함수
├── types/                  # 공유 타입 정의
│   └── index.ts
├── stores/                 # Zustand 상태 관리
│   └── authStore.ts
├── constants/              # 상수 (colors, config)
└── utils/                  # 유틸리티 함수
```

## 코딩 패턴

### API 클라이언트 (`services/api.ts`)

모든 API 호출의 공통 로직을 담는다:
- `BASE_URL` 설정
- `Authorization: Bearer {token}` 자동 첨부
- 401 응답 시 `refreshToken()` → 재요청 (1회)
- 갱신 실패 시 로그아웃 처리
- JSON 파싱 + 에러 throw

### 기능별 서비스 (`services/[feature].ts`)

```typescript
// 예: services/auth.ts
export async function loginWithGoogle(idToken: string) {
  return api.post<LoginResponse>('/api/auth/google', { id_token: idToken });
}
```

- 함수 하나 = 엔드포인트 하나
- 반환 타입은 `types/index.ts`에서 import
- 반환 타입이 BE 응답 shape과 정확히 일치해야 한다

### 커스텀 훅 (`hooks/use[Feature].ts`)

```typescript
// API 호출 + 로딩/에러 상태 관리
// 컴포넌트에서는 훅만 호출, 서비스 직접 호출 금지
```

### 타입 정의 (`types/index.ts`)

- BE 응답 shape을 그대로 반영한다
- analyzer 스펙의 "FE용 TypeScript 타입 정의" 섹션을 기반으로 작성
- 추측으로 타입을 만들지 않는다

## 구현 원칙

- 불필요한 추상화, 과도한 에러 핸들링 금지
- 사용하지 않는 import, 빈 컴포넌트, placeholder 코드 금지
- 기존 코드의 패턴과 일관성 유지
- 스펙에 모호한 부분은 BE 코드를 직접 확인한다 (`C:\Users\sejin\Documents\voicemate_BE`)

## 출력

- 실제 소스 코드 파일들 (`src/` 하위)
- `_workspace/02_implementer_summary.md`:

```markdown
# [기능명] 구현 요약

## 생성/수정된 파일
| 파일 경로 | 작업 | 설명 |

## API 연동 매핑
| 엔드포인트 | 서비스 함수 | 훅 |

## 주요 결정사항
- 선택한 접근 방식과 이유

## 미구현/TODO (있는 경우)
```
