import { apiClient } from './client';
import { SelfCareDetail } from '../types';

export const selfcareApi = {
  getConditions: async (): Promise<{ id: string; title: string }[]> => {
    const res = await apiClient<{ conditions: { id: string; title: string }[] }>('/selfcare');
    return res.conditions || [];
  },

  getConditionDetail: async (conditionId: string): Promise<SelfCareDetail> => {
    return apiClient<SelfCareDetail>(`/selfcare/${conditionId}`);
  },
};
