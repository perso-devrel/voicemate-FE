import { api } from './api';
import type { BlockListItem } from '@/types';

export async function blockUser(blockedId: string): Promise<{ status: string }> {
  return api.post<{ status: string }>('/api/block', { blocked_id: blockedId });
}

export async function unblockUser(blockedId: string): Promise<{ status: string }> {
  return api.delete<{ status: string }>(`/api/block/${blockedId}`);
}

export async function getBlockList(): Promise<BlockListItem[]> {
  return api.get<BlockListItem[]>('/api/block');
}
