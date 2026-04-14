---
name: review-integration
description: "VoiceMate FE↔BE 통합 정합성을 교차 검증하는 스킬. FE 타입과 BE 응답 shape 비교, API 커버리지, 비동기 상태 처리, 인증 흐름, 실시간 구독, 파일 처리 제약조건을 검증한다."
---

# FE↔BE 통합 정합성 검증

FE 구현이 BE API와 정확히 맞물리는지 교차 검증하는 절차.

## 핵심 원칙: "양쪽 동시 읽기"

한쪽만 읽어서는 경계면 버그를 잡을 수 없다. 반드시 양쪽 코드를 동시에 열어 비교한다:

| 검증 대상 | BE 쪽 | FE 쪽 |
|----------|-------|-------|
| 응답 shape | `routes/*.ts`의 `res.json()` | `types/index.ts`, `services/*.ts` |
| 요청 유효성 | `schemas/*.ts` Zod 스키마 | `services/*.ts` 요청 body |
| 상태 값 | `voice_clone_status`, `audio_status` | 컴포넌트의 조건 분기 |
| 에러 코드 | `errors.ts` 상태 코드 | API 클라이언트 에러 핸들링 |

## 검증 체크리스트

### 1. API 응답 ↔ FE 타입 (최우선)

- [ ] `res.json()`에 전달하는 객체의 shape과 FE 타입 정의가 필드명·타입까지 일치
- [ ] 래핑 여부 확인 — BE가 `{ match: {...} }`를 반환하면 FE가 `.match`로 접근하는지
- [ ] 배열/객체 구분 — BE가 배열 반환인지 객체 래핑 반환인지 FE가 올바르게 처리
- [ ] 필수/선택(nullable) 필드 구분이 양쪽에서 동일
- [ ] 페이지네이션 파라미터(limit, before)가 BE Zod 스키마와 일치

### 2. 요청 body ↔ BE 스키마

- [ ] FE에서 보내는 요청 body의 필드명이 BE Zod 스키마와 일치
- [ ] 제약조건(min/max, 문자 수, 배열 길이)이 FE에서도 사전 검증
- [ ] FormData 사용 시 필드명이 BE의 multer/busboy 설정과 일치

### 3. 인증 흐름

- [ ] 토큰 저장: SecureStore 또는 동등한 보안 저장소 사용
- [ ] 401 응답 시: refresh_token으로 자동 갱신 → 원래 요청 재시도
- [ ] 갱신 실패 시: 저장된 토큰 삭제 + 로그인 화면 이동
- [ ] 인증 불요 엔드포인트(auth, health)에는 토큰 미첨부

### 4. 비동기 상태 처리

- [ ] `voice_clone_status`: pending / processing / ready / failed 4가지 모두 UI 처리
- [ ] `audio_status`: pending / processing / ready / failed 4가지 모두 UI 처리
- [ ] processing 상태에서 폴링 또는 로딩 표시
- [ ] failed 상태에서 재시도 액션 제공 (`POST /api/matches/:messageId/retry`)

### 5. 실시간 기능

- [ ] messages 테이블에 Supabase Realtime 구독 설정
- [ ] 새 메시지 수신 시 채팅 UI 즉시 반영
- [ ] 컴포넌트 언마운트 시 구독 해제 (cleanup)
- [ ] 앱 포그라운드 복귀 시 구독 재연결

### 6. 파일 처리 제약

- [ ] 프로필 사진: JPEG/PNG/WebP만 허용, 5MB 이하, 최대 6장
- [ ] 음성 샘플: WAV/MP3/MP4/OGG/WebM만 허용, 10MB 이하
- [ ] 업로드 전 FE에서 타입/크기 사전 검증

### 7. 엔드포인트 커버리지

- [ ] 해당 기능의 모든 BE 엔드포인트에 대응하는 FE 서비스 함수 존재
- [ ] 서비스 함수가 실제로 호출되는지 (훅 또는 컴포넌트에서 사용)

## 검증 절차

1. `_workspace/01_analyzer_spec.md` 읽기 — 원본 스펙
2. `_workspace/02_implementer_summary.md` 읽기 — 구현 내역, 파일 목록
3. 구현된 FE 파일을 하나씩 읽으며 체크리스트 검증
4. 의심 가는 부분은 BE 코드(`C:\Users\sejin\Documents\voicemate_BE/src/`)를 직접 읽어 확인
5. 결과를 `_workspace/03_reviewer_report.md`에 기록

## 출력 형식

```markdown
# [기능명] 검증 리포트

## 결과 요약
| 항목 | 상태 | 비고 |
(통과 / 실패 / 미검증)

## 발견된 문제 (있는 경우)
### [CRITICAL] 문제 제목
- FE: [파일:라인] — 현재 코드
- BE: [파일:라인] — 기대 값
- 수정: 구체적 변경 방법

### [WARNING] 문제 제목
- 설명 + 권장 수정

## 통과 항목
- 체크리스트에서 통과한 항목 나열
```

## 심각도 기준

| 심각도 | 기준 | 예시 |
|--------|------|------|
| CRITICAL | 런타임 크래시 또는 기능 불가 | 타입 불일치, 엔드포인트 누락, 상태 미처리 |
| WARNING | 동작하지만 품질 문제 | 사전 검증 누락, 에러 메시지 미표시 |
| INFO | 개선 권장 | 코드 스타일, 성능 최적화 |
