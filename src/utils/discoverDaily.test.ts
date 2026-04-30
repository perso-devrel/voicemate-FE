/**
 * 디스커버 일일 한도 관련 상수만 노출. 카운트 영속화는 BE (`/api/discover/quota`)
 * 로 옮겼으므로 SecureStore-기반 load/save 테스트는 제거됨.
 */
import { MAX_PER_DAY, BATCH_SIZE, PREFETCH_THRESHOLD } from './discoverDaily';

describe('discoverDaily — constants', () => {
  it('exposes the documented limits', () => {
    expect(MAX_PER_DAY).toBe(50);
    expect(BATCH_SIZE).toBe(10);
    expect(PREFETCH_THRESHOLD).toBe(3);
  });
});
