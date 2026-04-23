---
name: voicemate-build
description: "VoiceMate 프론트엔드 기능 구현 오케스트레이터. 화면 구현, 컴포넌트 개발, API 연동, 기능 추가 등 Expo/React Native 프론트엔드 개발 작업 시 사용. '구현해줘', '만들어줘', '화면', '스크린', '페이지', '컴포넌트', '기능 추가', 'API 연동' 등의 요청 시 트리거. 후속 작업: 수정, 보완, 다시 구현, 리팩토링, 버그 수정, 이전 결과 개선, 디자인 검토, QA 요청 시에도 사용."
---

# VoiceMate FE Build Orchestrator

VoiceMate 프론트엔드 기능을 6단계 파이프라인(설계 → 분석 → 구현 → 디자인 리뷰 → 통합 검증 → QA 실행)으로 구현하는 오케스트레이터. gstack의 Plan→Build→Review→Test 라이프사이클을 모바일 앱 맥락에 적용.

## 실행 모드: 서브 에이전트 (하이브리드)

기본은 파이프라인 패턴. **Phase 4(Design Review)와 Phase 5(Integration Review)는 병렬 실행** — 두 검증은 입력만 공유하고 출력이 독립이므로 동시 호출 가능.

## 에이전트 구성

| Phase | 에이전트 | subagent_type | 역할 | 출력 |
|-------|---------|--------------|------|------|
| 1 | planner | general-purpose | 화면/데이터 흐름/영향 파일 설계 | `_workspace/00_planner_design.md` |
| 2 | analyzer | Explore | BE 코드에서 API 스펙 추출 | `_workspace/01_analyzer_spec.md` |
| 3 | implementer | general-purpose | Expo/RN 코드 구현 | 소스 코드 + `_workspace/02_implementer_summary.md` |
| 4 | designer | general-purpose | UI/UX·디자인 시스템·i18n·접근성 검증 | `_workspace/03_designer_report.md` |
| 5 | reviewer | general-purpose | FE↔BE 통합 정합성 검증 | `_workspace/04_reviewer_report.md` |
| 6 | qa | general-purpose | tsc/lint/test 실행 검증 + 자동 수정 | `_workspace/05_qa_report.md` |

모든 Agent 호출에 `model: "opus"` 명시.

## 워크플로우

### Phase 0: 컨텍스트 확인

1. `_workspace/` 디렉토리 존재 여부 확인
2. 실행 모드 결정:
   - **`_workspace/` 미존재** → 초기 실행. `_workspace/` 생성 후 Phase 1 진행
   - **`_workspace/` 존재 + 부분 수정 요청** → 해당 에이전트만 재호출. 이전 산출물 경로를 프롬프트에 포함
   - **`_workspace/` 존재 + 새 기능 요청** → `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 이동 후 Phase 1 진행

**부분 재실행 매핑:**
| 사용자 요청 | 재호출 에이전트 |
|------------|---------------|
| "디자인만 다시 보자" | designer |
| "BE 통합 다시 검증" | reviewer |
| "타입 오류 수정" | qa |
| "구현만 수정" | implementer (필요 시 reviewer/qa 재실행) |
| "설계부터 다시" | 전체 재실행 |

### Phase 1: 설계 (Planner)

사용자 요청을 화면 트리, 데이터 흐름, 영향 파일로 분해한다.

```
Agent(
  description: "기능 설계",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: "
    당신은 VoiceMate의 FE 설계 에이전트입니다.

    [에이전트 정의 .claude/agents/planner.md 를 Read하고 지시를 따르라]

    요청된 기능: {feature_request}
    FE 프로젝트 경로: C:\\Users\\EST-INFRA\\voicemate-FE

    _workspace/00_planner_design.md에 설계 결과를 저장하라.
    (이전 산출물 존재 시: _workspace/00_planner_design.md를 읽고 피드백 반영)
  "
)
```

### Phase 2: BE 분석 (Analyzer)

Planner의 BE 연동 필요성 섹션을 기반으로 정확한 API 스펙을 추출한다.

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

```
Agent(
  description: "BE API 스펙 분석",
  subagent_type: "Explore",
  model: "opus",
  prompt: "
    당신은 VoiceMate의 BE API 분석 에이전트입니다.

    [에이전트 정의 .claude/agents/analyzer.md 를 Read하고 지시를 따르라]

    요청된 기능: {feature_name}
    설계 문서: _workspace/00_planner_design.md를 먼저 읽고 BE 연동 필요성 파악
    관련 BE 파일: {be_file_paths}
    BE 코드 경로: C:\\Users\\sejin\\Documents\\voicemate_BE
    FE 프로젝트 경로: C:\\Users\\EST-INFRA\\voicemate-FE

    _workspace/01_analyzer_spec.md에 결과를 저장하라.
  "
)
```

**BE 연동이 불필요한 경우** (순수 UI 변경 등): Phase 2를 건너뛰고 Phase 3로 진행. Implementer에게 "Phase 2 생략됨, BE 연동 없음" 명시.

### Phase 3: FE 구현 (Implementer)

설계 문서와 API 스펙을 기반으로 Expo/RN 코드를 구현한다.

```
Agent(
  description: "FE 코드 구현",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: "
    당신은 VoiceMate의 FE 구현 에이전트입니다.

    [에이전트 정의 .claude/agents/implementer.md 를 Read하고 지시를 따르라]

    1. _workspace/00_planner_design.md를 읽어 설계 의도 파악
    2. _workspace/01_analyzer_spec.md를 읽어 API 스펙 파악 (있는 경우)
    3. 기존 FE 코드(src/)의 컨벤션을 파악
    4. 설계 + 스펙에 맞춰 코드를 구현
    5. _workspace/02_implementer_summary.md에 구현 요약 저장

    FE 프로젝트 경로: C:\\Users\\EST-INFRA\\voicemate-FE
    (사용자 피드백: {feedback})
  "
)
```

### Phase 4·5: 디자인 + 통합 검증 (병렬)

Designer와 Reviewer는 동일한 입력(`02_implementer_summary.md` + 소스)을 읽지만 검증 대상이 다르다(UI vs API). **두 Agent 호출을 같은 메시지에서 병렬로 실행**한다.

**Phase 4 — Designer:**
```
Agent(
  description: "디자인 리뷰",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: "
    당신은 VoiceMate의 디자인 리뷰 에이전트입니다.

    [에이전트 정의 .claude/agents/designer.md 를 Read하고 지시를 따르라]

    1. _workspace/00_planner_design.md, _workspace/02_implementer_summary.md를 읽기
    2. 변경된 src/ 파일을 디자인 시스템·RN 패턴·i18n·접근성 기준으로 검증
    3. _workspace/03_designer_report.md에 리포트 저장

    FE 프로젝트 경로: C:\\Users\\EST-INFRA\\voicemate-FE
  "
)
```

**Phase 5 — Reviewer:**
```
Agent(
  description: "FE↔BE 통합 검증",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: "
    당신은 VoiceMate의 통합 검증 에이전트입니다.

    [에이전트 정의 .claude/agents/reviewer.md 를 Read하고 지시를 따르라]

    1. _workspace/01_analyzer_spec.md, _workspace/02_implementer_summary.md를 읽기
    2. 실제 FE 코드(src/)와 BE 코드를 양쪽 동시 비교
    3. _workspace/04_reviewer_report.md에 리포트 저장 (※ 파일명이 04로 변경됨)

    FE 프로젝트 경로: C:\\Users\\EST-INFRA\\voicemate-FE
    BE 코드 경로: C:\\Users\\sejin\\Documents\\voicemate_BE
  "
)
```

### Phase 6: QA 실행 (qa)

Designer/Reviewer 리포트를 통합하여 critical 이슈가 없으면 실행 검증으로 진행. critical 이슈가 있으면 먼저 Phase 7로.

```
Agent(
  description: "QA 실행 검증",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: "
    당신은 VoiceMate의 QA 실행 에이전트입니다.

    [에이전트 정의 .claude/agents/qa.md 를 Read하고 지시를 따르라]

    1. _workspace/02_implementer_summary.md에서 변경 파일 목록 확인
    2. 작업 디렉토리: C:\\Users\\EST-INFRA\\voicemate-FE
    3. typecheck → lint → test 순서로 실행
    4. 자명한 오류는 직접 수정하고 재실행
    5. _workspace/05_qa_report.md에 결과 저장
  "
)
```

### Phase 7: 결과 처리 및 수정 루프

1. 4개 리포트(designer / reviewer / qa)를 통합 분석
2. **CRITICAL 이슈가 있으면:**
   - Implementer를 재호출하여 수정 (최대 2회)
   - 수정 후 영향받는 검증 단계만 재호출 (디자인 변경 → designer, API 변경 → reviewer, 타입 변경 → qa)
3. **CRITICAL 이슈가 없으면:**
   - 사용자에게 결과 요약 보고:
     - 구현된 파일 목록
     - 디자인 / 통합 / QA 검증 결과 (통과 / 경고 / 미검증)
     - WARNING/INFO 이슈 (있는 경우)
     - 남은 TODO

## 데이터 흐름

```
[오케스트레이터]
    │
    ├─ Phase 1 ─→ [planner] ─────────→ _workspace/00_planner_design.md
    │                                          │
    ├─ Phase 2 ─→ [analyzer] ←── Read ────────┤
    │                 └─→ _workspace/01_analyzer_spec.md
    │                                          │
    ├─ Phase 3 ─→ [implementer] ←── Read ──── ┤
    │                 ├─→ src/ (소스 코드)
    │                 └─→ _workspace/02_implementer_summary.md
    │                                          │
    ├─ Phase 4·5 (병렬)
    │     ├─→ [designer]  ←── Read ────────── ┤  + src/
    │     │      └─→ _workspace/03_designer_report.md
    │     └─→ [reviewer]  ←── Read ────────── ┘  + src/ + BE 코드
    │            └─→ _workspace/04_reviewer_report.md
    │                                          │
    ├─ Phase 6 ─→ [qa] ←── Read ──────────── ─┤
    │                 ├─→ src/ (자명한 수정)
    │                 └─→ _workspace/05_qa_report.md
    │                                          │
    └─ Phase 7 ─── 통합 ─────────────────────┘
                     │
                     ├─ critical 있음 → implementer 재호출 → 영향 검증 재호출
                     └─ critical 없음 → 사용자에게 결과 보고
```

## 데이터 전달 프로토콜

| 전략 | 적용 |
|------|------|
| 파일 기반 | 모든 Phase 간 — `_workspace/` 하위 표준 파일명 |
| 반환값 기반 | 각 서브 에이전트의 완료 메시지를 오케스트레이터가 수집 |

**파일명 컨벤션:** `{phase:00-05}_{agent}_{artifact}.md`. 예: `02_implementer_summary.md`.

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| Planner 실패 | 1회 재시도. 재실패 시 사용자에게 요청 명확화 요구 |
| Analyzer 실패 | 1회 재시도. 재실패 시 BE 연동 없이 구현 시도, 보고서에 "스펙 미확인" 표시 |
| Implementer 실패 | 1회 재시도. 재실패 시 에러 내용 사용자에게 보고 |
| Designer/Reviewer 실패 | 해당 검증 없이 진행, "검증 미완료" 명시 |
| QA 명령어 실행 실패 (환경 문제) | 수동 검증 보고로 전환 |
| Critical 수정 후 재검증 실패 (2회차) | 남은 이슈 사용자에게 보고하여 개입 요청 |

## 팀 크기 가이드

6명 에이전트는 중규모 작업의 상한선이다. Phase 4·5 병렬화로 실제 직렬 단계는 5단계. 작업이 단순 UI 수정이면 다음을 건너뛰어 비용을 줄인다:
- 순수 UI 변경(BE 연동 없음): Phase 2(analyzer) + Phase 5(reviewer) 생략
- 순수 BE 연동 변경(UI 미변경): Phase 4(designer) 생략
- 코드 변경 없는 설정/리팩토링: Phase 4·5 생략

생략 결정은 Phase 1(planner) 결과를 보고 오케스트레이터가 판단한다.

## 테스트 시나리오

### 정상 흐름 (전체 6단계)
1. 사용자: "프로필 편집 화면 구현해줘"
2. Phase 0: `_workspace/` 미존재 → 초기 실행
3. Phase 1: planner가 `src/app/(main)/profile/edit.tsx` 신규 + `services/profile.ts` 수정 설계
4. Phase 2: analyzer가 `routes/profile.ts`, `schemas/profile.ts` 분석 → 스펙 추출
5. Phase 3: implementer가 화면/훅/서비스 구현
6. Phase 4·5 병렬: designer가 디자인 일관성 / reviewer가 BE shape 검증
7. Phase 6: qa가 typecheck/lint/test 실행 → 1건 자동 수정 → 통과
8. Phase 7: critical 없음 → 결과 보고

### 부분 재실행 흐름
1. 사용자: "방금 만든 프로필 편집 화면 디자인 다시 봐줘"
2. Phase 0: `_workspace/` 존재 + 부분 수정 → designer만 재호출
3. designer가 새 리포트 작성
4. critical 있으면 implementer + designer 재실행, 없으면 결과 보고

### 에러 흐름
1. Phase 5에서 reviewer가 타입 불일치 발견 (CRITICAL)
2. Phase 7에서 implementer 재호출 → 타입 수정
3. reviewer + qa 재실행 → 통과
4. 결과 보고

## 후속 작업 트리거

다음 표현으로 이 오케스트레이터를 재트리거할 수 있다:
- "다시 구현", "재구현", "수정", "보완"
- "디자인만 다시", "QA만 다시", "BE 통합 다시"
- "이전 결과 개선", "방금 그거 다시"
- "타입 오류 고쳐줘"
