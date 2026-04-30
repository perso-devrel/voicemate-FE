// 디스커버 일일 카드 한도 관련 상수.
// 카운트 자체는 BE 의 `swipes` 테이블에서 derive 되며, FE 는 GET /api/discover/quota
// 로 마운트 시 받아 in-memory 로 사용한다 (utils/discoverDaily 파일은 더 이상
// SecureStore 캐시를 가지지 않음 — 기기 간 동기화를 위해 BE 가 source of truth).
export const MAX_PER_DAY = 50;
export const BATCH_SIZE = 10;
export const PREFETCH_THRESHOLD = 3;
