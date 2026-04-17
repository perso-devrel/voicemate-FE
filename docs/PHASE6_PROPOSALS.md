# PHASE6_PROPOSALS.md

> 2026-04-18 Ralph Loop · **사람의 판단이 필요한 제안 누적**.
> TASK.md §6-3 금지 범위에 해당하거나, 트레이드오프/우선순위 결정이 필요한 항목을 Ralph가 자율 결정 없이 여기에 모은다.

---

## 1. Expo SDK 54 → 55 전면 업그레이드

- **배경**: `docs/DEPENDENCY_STATUS.md §2` — Expo/React Native/expo-router 등 모든 Expo 계열 패키지가 major 이월 대기.
- **트레이드오프**:
  - ✅ 최신 버그픽스, 플랫폼 정책 대응.
  - ❌ `expo-router@6 → 55` 는 라우트 API 변동 가능. 전 앱 QA 재필요.
  - ❌ SDK 55가 요구하는 Xcode/Android SDK 버전 요구사항 확인 필요.
- **권고**: 별도 feature-freeze 주간에 전담 시간 확보.

## 2. React / React Native minor 따라가기

- **배경**: React 19.1 → 19.2, RN 0.81 → 0.85 (Expo SDK 55에 묶임).
- **권고**: SDK 업그레이드와 함께 처리. 단독 업그레이드 지양.

## 3. `zustand` 4 → 5 (major breaking)

- **배경**: `DEPENDENCY_STATUS.md §2`. 5.x는 일부 타입 시그니처 변경.
- **트레이드오프**: 현재 스토어 한 개(`authStore`) 수준이면 마이그레이션 간단. 다만 향후 Redux/Jotai 대체 검토와 묶어 결정 바람.
- **권고**: 당분간 4.5 유지. 스토어가 2개 이상으로 늘면 5 검토.

## 4. ESLint 9 → 10 / Jest 29 → 30 / TypeScript 5.8 → 6

- **배경**: 각 메이저가 독립 breaking.
- **권고**: 묶어서 한 번에 업그레이드 or SDK 55 업그레이드 타이밍에 합류.

## 5. 자동 시크릿 스캔 도입

- **배경**: `docs/SECURITY_SWEEP.md §5`. 현재 수동 grep만 수행.
- **선택지**:
  - GitHub Secret Scanning (org plan에 따라 무료/유료)
  - `gitleaks` pre-commit hook
- **권고**: 저장소가 public이 되거나 외부 기여가 시작되면 우선 활성화.

## 6. 관찰성(Observability) 도구 도입

- **배경**: 현재 런타임 로그는 `console.log` 1건(`realtime.ts`) 뿐. 프로덕션에서 Realtime CHANNEL_ERROR / 업로드 실패 빈도를 관찰할 수단 없음.
- **선택지**:
  - Sentry (유료, 또는 free tier)
  - DataDog RUM
  - 자체 BE 로그 집계
- **권고**: 베타 런칭 전 최소 한 가지 도입.

## 7. 번역 품질 폴리시

- **배경**: `docs/I18N_REVIEW.md` §🟡 항목 다수. 원어민 검수 없이는 확정 어려움.
- **권고**: 언어별 리뷰어가 생기면 단건 PR로 순차 반영.

## 8. Dark Mode 지원

- **배경**: 현재 `colors.ts`는 단일 팔레트. iOS/Android 시스템 테마와 연동 안 됨.
- **트레이드오프**:
  - ✅ 야간 사용성 개선, 현대 앱 기대치.
  - ❌ 전 UI 재검수 필요. 브랜드 컬러 보존 정책 결정 필요.
- **권고**: 디자인팀의 다크 팔레트 제공 후 착수.

## 9. `docs/ERROR_MAP.md` mapApiError 구현 vs BE 에러 원문 유지

- **배경**: BE는 영어 에러 문자열을 반환. FE는 i18n 매핑 없이 그대로 surface 중.
- **선택지**:
  - A) `mapApiError` 레이어 도입 (26키 추가, PR 반복).
  - B) BE가 에러 코드(예: `E_BLOCK_SELF`)를 함께 반환하도록 개편 (BE 변경 필요 → TASK.md §🚫 3 위반).
  - C) 현 상태 유지.
- **권고**: A를 권장 — FE 단독 해결 가능. 다만 26키를 한 번에 PR로 올리면 Phase 6 200줄 바 초과 → 5회 나눠 작업 필요. 사용자 우선순위 확인 필요.

## 10. Realtime fallback polling

- **배경**: CHANNEL_ERROR backoff 이후에도 실패가 지속되면(BE RLS / publication 오류) 메시지 수신 불가. 현재는 수동 reload.
- **선택지**: 30초 간격 `getMessages` 폴링 추가.
- **트레이드오프**:
  - ✅ UX 회복력.
  - ❌ BE 부하 증가, realtime 복구 시 중복 호출.
- **권고**: backoff 재시도 3회 이상 실패 시에만 활성화하는 조건부 폴백. 사용자 확인 후 설계.

## 11. `react-hooks/exhaustive-deps` 3건 수동 검토

- **배경**: `docs/LINT_WARNINGS.md`의 3건 — login.tsx, _layout.tsx, useVoice.ts.
- **필요**: 각 `useEffect`/`useCallback`의 의도가 mount-once인지 reactive인지 판단. 잘못 고치면 런타임 regression.
- **권고**: 각각 단일 PR + 수동 QA. 여기서 일괄 자동 수정하지 않음.

## 12. 프로필 birth_date YYYY-MM-DD 입력 UX

- **배경**: `docs/TYPE_SYNC.md §1`. 현재 자유 입력, BE는 regex로 거절.
- **선택지**:
  - 자동 마스킹 (`2026-04-18` 자동 대시 삽입)
  - 달력 Picker
- **트레이드오프**: DatePicker는 Android/iOS 차이가 있어 UX 통일 어려움. 라이브러리 선택 필요.
- **권고**: 사용자 피드백 기반으로 선택.

---

## 변경 이력

| 날짜 | 내용 | 담당 |
|------|------|------|
| 2026-04-18 | 초기 12 항목 | Ralph Loop |
