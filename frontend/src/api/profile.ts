import { apiClient } from './client';
import { MedicalHistory, UserProfile } from '../types';

export const profileApi = {
  getMedicalHistory: async (): Promise<MedicalHistory | null> => {
    const res = await apiClient<{ profile: MedicalHistory | null }>('/profile');
    return res.profile;
  },

  saveMedicalHistory: async (history: MedicalHistory): Promise<MedicalHistory> => {
    // Strip client-only or deprecated uploadedFiles
    const { uploadedFiles, ...cleanHistory } = history;
    const res = await apiClient<{ profile: MedicalHistory }>('/profile', {
      method: 'PUT',
      body: cleanHistory,
    });
    return res.profile;
  },

  updatePharmacy: async (pharmacy: { name: string; phone: string }): Promise<{ name: string; phone: string }> => {
    const res = await apiClient<{ pharmacy: { name: string; phone: string } }>('/profile/pharmacy', {
      method: 'PUT',
      body: pharmacy,
    });
    return res.pharmacy;
  },

  getDisplayProfile: async (): Promise<UserProfile> => {
    return apiClient<UserProfile>('/profile/me');
  },

  updateDisplayProfile: async (profile: Partial<UserProfile>): Promise<UserProfile> => {
    return apiClient<UserProfile>('/profile/me', {
      method: 'PUT',
      body: profile,
    });
  },
};
