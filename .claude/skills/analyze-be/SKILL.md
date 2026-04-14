---
name: analyze-be
description: "VoiceMate BE 코드에서 기능별 API 스펙을 추출하는 스킬. BE 라우트, Zod 스키마, DB 마이그레이션, 서비스 코드를 분석하여 FE 구현에 필요한 정확한 엔드포인트, 요청/응답 shape, 유효성 규칙, 에러 코드를 추출한다."
---

# BE API 스펙 분석

VoiceMate 백엔드 코드에서 FE 구현에 필요한 정확한 API 스펙을 추출하는 절차.

## BE 코드 경로

`C:\Users\sejin\Documents\voicemate_BE`

## 분석 절차

1. 요구사항 정의서(`docs/requirements.md`) 확인 — 해당 기능의 전체 맥락 파악
2. `src/routes/` 해당 라우트 파일 — 엔드포인트, HTTP 메서드, 미들웨어, 핸들러 로직
3. `src/schemas/` 해당 스키마 파일 — Zod 유효성 규칙 (`.optional()`, `.default()`, `.max()` 등)
4. `src/services/` 관련 서비스 — ElevenLabs 연동, Storage 연동, 비동기 처리 로직
5. `supabase/migrations/` — 테이블 구조, 제약조건, RLS 정책
6. `src/types/index.ts` — TypeScript 타입 정의

각 단계에서 실제 코드를 읽고 추출한다. 추측하지 않는다.

## 응답 shape 추출 규칙

- `res.status(200).json({...})` 호출부에서 정확한 JSON shape을 추출한다
- 객체를 직접 반환하는지, 래핑하는지(`{ data: [...] }`) 구분한다
- Supabase 쿼리 결과를 가공하는 경우 최종 가공된 형태를 추출한다
- 에러 응답도 코드별로 빠짐없이 기록한다 (400/401/403/404/409)

## 기능 → BE 파일 매핑

| 기능 | 라우트 | 스키마 | 서비스 |
|------|--------|--------|--------|
| 인증 | `routes/auth.ts` | - | - |
| 프로필 | `routes/profile.ts` | `schemas/profile.ts` | `services/storage.ts` |
| 음성 클론 | `routes/voice.ts` | - | `services/elevenlabs.ts` |
| 탐색/스와이프 | `routes/swipe.ts` | `schemas/swipe.ts` | - |
| 매치 | `routes/match.ts` | - | - |
| 메시지 | `routes/message.ts` | `schemas/message.ts` | `services/elevenlabs.ts`, `services/storage.ts` |
| 차단 | `routes/block.ts` | `schemas/block.ts` | - |
| 신고 | `routes/report.ts` | `schemas/report.ts` | - |
| 선호 설정 | `routes/preference.ts` | `schemas/preference.ts` | - |

## 출력 형식

`_workspace/01_analyzer_spec.md`에 다음 구조로 저장한다:

```markdown
# [기능명] API 스펙

## 엔드포인트 목록
| Method | Path | 인증 | 설명 |

## 각 엔드포인트 상세

### [METHOD /path]
**Request:**
- Headers: Authorization Bearer (필요 시)
- Body/Query: 필드명, 타입, 제약조건, 기본값
  
**Response 200:**
```json
{ 정확한 JSON shape }
```

**Error Responses:**
| 코드 | 조건 | 메시지 |

## FE용 TypeScript 타입 정의
BE 응답 shape을 기반으로 FE에서 사용할 인터페이스 제안

## 비즈니스 규칙
- 비동기 처리, 상태 전이, 자동 동작 등 FE에서 알아야 할 로직

## FE 구현 시 주의사항
- 특수한 처리가 필요한 부분 (폴링, 실시간 구독, 파일 업로드 등)
```
