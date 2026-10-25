import { apiClient } from './client';
import { DashboardSummary } from '../types';

export const summaryApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    return apiClient<DashboardSummary>('/summary');
  },
};
