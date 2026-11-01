import { apiClient } from './client';
import { HealthDocument, Source, Finding, ExtractedMedicine } from '../types';

export interface DocumentsListResponse {
  items: HealthDocument[];
  page: number;
  pageSize: number;
  total: number;
}

export const documentsApi = {
  getDocuments: async (params?: {
    q?: string;
    kind?: string;
    page?: number;
    pageSize?: number;
  }): Promise<HealthDocument[]> => {
    const res = await apiClient<HealthDocument[] | DocumentsListResponse>('/analyze/documents', {
      params,
    });
    if (Array.isArray(res)) {
      return res;
    }
    return res.items || [];
  },

  getDocument: async (id: string): Promise<HealthDocument> => {
    return apiClient<HealthDocument>(`/analyze/documents/${id}`);
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient<void>(`/analyze/documents/${id}`, {
      method: 'DELETE',
    });
  },

  updateDocument: async (
    id: string,
    data: {
      findings?: Finding[];
      medicines?: ExtractedMedicine[];
      language?: string;
    }
  ): Promise<HealthDocument> => {
    return apiClient<HealthDocument>(`/analyze/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  analyzeDocument: async (
    file: File,
    options?: {
      kind?: 'auto' | 'report' | 'prescription';
      language?: string;
      asyncMode?: boolean;
    }
  ): Promise<HealthDocument | { id: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.kind) {
      formData.append('kind', options.kind);
      formData.append('doc_type', options.kind === 'prescription' ? 'prescription' : 'lab');
    }
    if (options?.language) {
      formData.append('language', options.language);
    }

    return apiClient<HealthDocument | { id: string }>('/analyze/document', {
      method: 'POST',
      body: formData,
      params: options?.asyncMode ? { async: true } : undefined,
    });
  },

  getProgress: async (id: string): Promise<{ id: string; status: string; progress: number; step: string }> => {
    return apiClient<{ id: string; status: string; progress: number; step: string }>(`/documents/${id}/progress`);
  },

  askQuestion: async (id: string, question: string): Promise<{ answer: string; sources: Source[] }> => {
    return apiClient<{ answer: string; sources: Source[] }>(`/analyze/documents/${id}/ask`, {
      method: 'POST',
      body: { question },
    });
  },

  shareDocument: async (id: string, caregiverId?: string): Promise<void> => {
    await apiClient<void>(`/documents/${id}/share`, {
      method: 'POST',
      body: { caregiverId },
    });
  },
};
