import { api } from './api';
import type { ReportRequest } from '@/types';

export async function reportUser(data: ReportRequest): Promise<{ status: string }> {
  return api.post<{ status: string }>('/api/report', data);
}
