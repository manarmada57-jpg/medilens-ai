import { apiClient } from './client';
import { SkinAnalysisResult } from '../types';

export const skinApi = {
  analyzeSkin: async (
    file: File,
    note?: string,
    language?: string
  ): Promise<SkinAnalysisResult> => {
    const formData = new FormData();
    formData.append('file', file);
    if (note) {
      formData.append('note', note);
    }
    if (language) {
      formData.append('language', language);
    }

    return apiClient<SkinAnalysisResult>('/analyze/skin', {
      method: 'POST',
      body: formData,
    });
  },
};
