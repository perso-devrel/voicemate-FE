# VoiceMate Frontend

음성 클론 기반 크로스 언어 소개팅 앱의 Expo (React Native + TypeScript) 프론트엔드.

## 하네스: VoiceMate FE Build

**목표:** 설계 → BE 분석 → 구현 → 디자인 리뷰 → 통합 검증 → QA 실행의 6단계 파이프라인(gstack 라이프사이클 적용)으로 정확하고 일관된 프론트엔드 코드를 생성한다.

**트리거:** 화면 구현, 컴포넌트 개발, API 연동, 기능 추가/수정, 디자인 검토, QA, 리팩토링, 버그 수정 등 프론트엔드 개발 작업 요청 시 `voicemate-build` 스킬을 사용하라. 단순 질문이나 설정 변경은 직접 응답 가능.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-04-14 | 초기 구성 (analyzer / implementer / reviewer) | 전체 | - |
| 2026-04-23 | gstack 패턴 적용 → 6-에이전트 파이프라인 확장. planner / designer / qa 신규 추가, Phase 4·5 병렬화 | agents/, skills/, voicemate-build | 사용자 요청: gstack의 Plan→Build→Review→Test 라이프사이클 도입 |
