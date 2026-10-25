import { apiClient } from './client';
import { AppConfig, EmergencyMeta } from '../types';

export const metaApi = {
  getConfig: async (): Promise<AppConfig> => {
    return apiClient<AppConfig>('/config', { skipAuth: true });
  },

  getEmergencyMeta: async (country: string = 'IN'): Promise<EmergencyMeta> => {
    return apiClient<EmergencyMeta>('/meta/emergency', {
      params: { country },
      skipAuth: true,
    });
  },

  getHealth: async (): Promise<{ ok: boolean; ai?: boolean }> => {
    return apiClient<{ ok: boolean; ai?: boolean }>('/health', { skipAuth: true });
  },
};
