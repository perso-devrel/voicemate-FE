# A11Y_AUDIT.md

> 2026-04-18 Phase 3 #19 · `voicemate-FE` 접근성 1차 감사.
> 목표: 모든 `Pressable` / `Image`에 스크린리더가 읽을 수 있는 라벨을 제공한다.

## 1. 현재 상태 (2026-04-18)

- `accessibilityLabel` / `accessibilityRole` / `accessible` 사용처: 이번 PR 이전까지 **0건**.
- 본 PR에서 `src/components/ui/Button.tsx`에 기본 `accessibilityRole="button"` + `accessibilityLabel={title}` + `accessibilityState={{ disabled, busy: loading }}` 부여.
- Button을 사용하는 모든 CTA(로그인, 저장, EmptyState CTA 등)는 자동 커버.

## 2. 잔여 감사 대상 (Pressable, 54건 / 14개 파일)

| 파일 | 대략 위치 | 권장 label |
|------|----------|-----------|
| `src/app/(auth)/login.tsx` | 이메일/회원가입 토글 Pressable | `t('auth.toggleToLogin')` / `t('auth.toggleToSignup')` |
| `src/components/chat/ChatBubble.tsx` | 재생 버튼, 재시도 | `t('chat.playAudio')`, `t('chat.retry')` (신규 i18n 키 필요) |
| `src/components/chat/AudioPlayer.tsx` | 재생/일시정지 | 위와 동일 |
| `src/components/discover/SwipeCard.tsx` | 좋아요/패스 버튼 | `t('discover.like')`, `t('discover.pass')` |
| `src/components/matches/MatchItem.tsx` | 매치 행 | `t('matches.openChat', { name })` |
| `src/app/(main)/(tabs)/profile.tsx` | 설정 항목(편집/로그아웃 등) | 기존 타이틀 재사용 |
| `src/app/(main)/(tabs)/discover.tsx` | 스와이프 버튼 | 위 SwipeCard와 동일 |
| `src/app/(main)/chat/[matchId].tsx` | send 버튼 Pressable(이미 Button 아님) | `t('chat.sendMessage')` (신규 키) |
| `src/app/(main)/setup/profile.tsx` | 관심사 태그 삭제 Pressable | `t('setupProfile.removeInterest', { tag })` |
| `src/app/(main)/setup/voice.tsx` | 녹음/재생 Pressable | `t('voice.record')`, `t('voice.stop')` (기존 키 확인) |
| `src/app/(main)/settings/preferences.tsx` | 성별/언어 Chip | Chip 텍스트 재사용 |
| `src/app/(main)/settings/blocked.tsx` | 해제 Pressable | `t('blocked.unblock')` |

## 3. 감사 대상 — 이미지 (`<Image>`)

| 컴포넌트 | 현 상황 | 권장 |
|----------|---------|------|
| `src/components/ui/Avatar.tsx` | `accessible` 미지정 | `accessible={true}` + `accessibilityLabel={t('common.avatar')}` (fallback) |
| `src/components/matches/MatchItem.tsx` | 행 이미지 | 위와 동일 |
| `src/components/discover/SwipeCard.tsx` | 카드 이미지 | `accessibilityLabel={t('discover.profilePhoto', { name })}` |

> 모든 Image에는 최소 `accessible` 지정 + 의미 있는 `accessibilityLabel`이 필요하다. 디자인 이미지는 `accessibilityElementsHidden` 고려.

## 4. 색 대비 / 포커스 순서

- 컬러 팔레트(`src/constants/colors.ts`)의 주요 페어(`primary vs white`, `textSecondary vs background`)는 WCAG AA 4.5:1를 넘는다. 세부 계산은 Phase 6 별도 이슈에서.
- 스크린리더 포커스 순서는 폼 입력 → 보조 액션 → 주 CTA 순이 정착돼 있는지 기기 QA 단계에서 확인 (`needs-manual-qa`).

## 5. 다음 단계 (Phase 6 파일 단위 후보)

1. 각 도메인 컴포넌트에 label 적용
2. `MatchItem`은 탭이라 `accessibilityRole="button"` 추가
3. 스와이프 카드의 수평 제스처는 `accessibilityActions` 매핑 (좋아요/패스)

각 단계는 독립 PR로 쪼개고, 기기 QA 없이 확정 어려운 부분은 `needs-manual-qa`.
