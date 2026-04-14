---
name: voicemate-build
description: "VoiceMate 프론트엔드 기능 구현 오케스트레이터. 화면 구현, 컴포넌트 개발, API 연동, 기능 추가 등 Expo/React Native 프론트엔드 개발 작업 시 사용. '구현해줘', '만들어줘', '화면', '스크린', '페이지', '컴포넌트', '기능 추가', 'API 연동' 등의 요청 시 트리거. 후속 작업: 수정, 보완, 다시 구현, 리팩토링, 버그 수정, 이전 결과 개선 요청 시에도 사용."
---

# VoiceMate FE Build Orchestrator

VoiceMate 프론트엔드 기능을 3단계 파이프라인(분석 → 구현 → 검증)으로 구현하는 오케스트레이터.

## 실행 모드: 서브 에이전트

파이프라인 패턴의 순차 의존 구조. 각 에이전트의 산출물이 다음 에이전트의 입력이 된다.

## 에이전트 구성

| 에이전트 | subagent_type | 역할 | 출력 |
|---------|--------------|------|------|
| analyzer | Explore | BE 코드에서 API 스펙 추출 | `_workspace/01_analyzer_spec.md` |
| implementer | general-purpose | Expo/RN 코드 구현 | 소스 코드 + `_workspace/02_implementer_summary.md` |
| reviewer | general-purpose | FE↔BE 통합 정합성 검증 | `_workspace/03_reviewer_report.md` |

## 워크플로우

### Phase 0: 컨텍스트 확인

1. `_workspace/` 디렉토리 존재 여부 확인
2. 실행 모드 결정:
   - **`_workspace/` 미존재** → 초기 실행. `_workspace/` 생성 후 Phase 1 진행
   - **`_workspace/` 존재 + 부분 수정 요청** → 해당 에이전트만 재호출. 이전 산출물 경로를 프롬프트에 포함
   - **`_workspace/` 존재 + 새 기능 요청** → `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 이동 후 Phase 1 진행

### Phase 1: BE 분석 (Analyzer)

사용자가 요청한 기능에 해당하는 BE 코드를 분석하여 정확한 API 스펙을 추출한다.

**기능 → BE 파일 매핑:**

| 기능 | BE 라우트 | BE 스키마 | 관련 서비스 |
|------|----------|----------|-----------|
| 인증 | `routes/auth.ts` | - | - |
| 프로필 | `routes/profile.ts` | `schemas/profile.ts` | `services/storage.ts` |
| 음성 클론 | `routes/voice.ts` | - | `services/elevenlabs.ts` |
| 탐색/스와이프 | `routes/swipe.ts` | `schemas/swipe.ts` | - |
| 매치 | `routes/match.ts` | - | - |
| 메시지 | `routes/message.ts` | `schemas/message.ts` | `services/elevenlabs.ts`, `services/storage.ts` |
| 차단 | `routes/block.ts` | `schemas/block.ts` | - |
| 신고 | `routes/report.ts` | `schemas/report.ts` | - |
| 선호 설정 | `routes/preference.ts` | `schemas/preference.ts` | - |

**Agent 호출:**
```
Agent(
  description: "BE API 스펙 분석",
  subagent_type: "Explore",
  model: "opus",
  prompt: "
    당신은 VoiceMate의 BE API 분석 에이전트입니다.
    
    [에이전트 정의 .claude/agents/analyzer.md 를 Read하고 지시를 따르라]
    
    요청된 기능: {feature_name}
    관련 BE 파일: {be_file_paths}
    BE 코드 경로: C:\Users\sejin\Documents\voicemate_BE
    FE 프로젝트 경로: C:\Users\sejin\Documents\voicemate_FE
    
    _workspace/01_analyzer_spec.md에 결과를 저장하라.
    (이전 산출물 존재 시: {previous_spec_path}를 읽고 피드백 반영)
  "
)
```

### Phase 2: FE 구현 (Implementer)

Analyzer의 스펙을 기반으로 Expo/RN 코드를 구현한다.

**Agent 호출:**
```
Agent(
  description: "FE 코드 구현",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: "
    당신은 VoiceMate의 FE 구현 에이전트입니다.
    
    [에이전트 정의 .claude/agents/implementer.md 를 Read하고 지시를 따르라]
    
    1. _workspace/01_analyzer_spec.md를 읽어 API 스펙을 파악하라
    2. 기존 FE 코드(src/)를 확인하여 컨벤션을 파악하라
    3. 스펙에 맞춰 코드를 구현하라
    4. _workspace/02_implementer_summary.md에 구현 요약을 저장하라
    
    FE 프로젝트 경로: C:\Users\sejin\Documents\voicemate_FE
    (사용자 피드백: {feedback})
  "
)
```

### Phase 3: 검증 (Reviewer)

FE 구현이 BE API와 정확히 맞물리는지 교차 검증한다.

**Agent 호출:**
```
Agent(
  description: "FE↔BE 통합 검증",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: "
    당신은 VoiceMate의 QA 검증 에이전트입니다.
    
    [에이전트 정의 .claude/agents/reviewer.md 를 Read하고 지시를 따르라]
    
    1. _workspace/01_analyzer_spec.md를 읽어 원본 스펙 파악
    2. _workspace/02_implementer_summary.md를 읽어 구현 내역 파악
    3. 실제 FE 코드(src/)와 BE 코드를 교차 비교
    4. _workspace/03_reviewer_report.md에 검증 리포트를 저장하라
    
    FE 프로젝트 경로: C:\Users\sejin\Documents\voicemate_FE
    BE 코드 경로: C:\Users\sejin\Documents\voicemate_BE
  "
)
```

### Phase 4: 결과 처리

1. `_workspace/03_reviewer_report.md`를 읽는다
2. **critical 이슈가 있으면:**
   - Implementer를 재호출하여 수정 (최대 2회)
   - 수정 후 Reviewer 재호출하여 재검증
3. **critical 이슈가 없으면:**
   - 사용자에게 결과 요약 보고:
     - 구현된 파일 목록
     - 검증 결과 (통과/경고/미검증)
     - 남은 TODO (있는 경우)

## 데이터 흐름

```
[오케스트레이터]
    │
    ├─ Phase 1 ─→ [analyzer] ─→ _workspace/01_analyzer_spec.md
    │                                    │
    ├─ Phase 2 ─→ [implementer] ←── Read ┘
    │                 │
    │                 ├─→ src/ (소스 코드)
    │                 └─→ _workspace/02_implementer_summary.md
    │                                    │
    ├─ Phase 3 ─→ [reviewer] ←───── Read ┘ + src/ + BE 코드
    │                 │
    │                 └─→ _workspace/03_reviewer_report.md
    │                                    │
    └─ Phase 4 ─── Read ────────────────┘
                     │
                     ├─ critical 있음 → implementer 재호출 → reviewer 재검증
                     └─ critical 없음 → 사용자에게 결과 보고
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| Analyzer 실패 | 1회 재시도. 재실패 시 requirements.md 기반으로 수동 스펙 작성 |
| Implementer 실패 | 1회 재시도. 재실패 시 에러 내용 사용자에게 보고 |
| Reviewer 실패 | 검증 없이 구현 결과만 보고, "검증 미완료" 명시 |
| Critical 이슈 수정 후 재검증 실패 | 2회차까지만 시도, 이후 사용자에게 남은 이슈 보고 |

## 테스트 시나리오

### 정상 흐름
1. 사용자: "로그인 화면 구현해줘"
2. Phase 0: _workspace/ 미존재 → 초기 실행
3. Phase 1: analyzer가 `routes/auth.ts` 분석 → 스펙 추출
4. Phase 2: implementer가 `src/app/(auth)/login.tsx`, `src/services/auth.ts`, `src/hooks/useAuth.ts` 등 생성
5. Phase 3: reviewer가 FE 타입과 BE 응답 shape 교차 검증
6. Phase 4: critical 이슈 없음 → 결과 보고

### 에러 흐름
1. Phase 3에서 reviewer가 타입 불일치 발견 (critical)
2. Phase 4에서 implementer 재호출하여 타입 수정
3. Reviewer 재검증 → 통과
4. 결과 보고
