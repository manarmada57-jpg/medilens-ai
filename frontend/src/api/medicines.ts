import { apiClient } from './client';
import { Dose, Medication, RefillAlert } from '../types';

export interface MedicineCreateInput {
  name: string;
  dosage: string;
  instructions: string;
  notes?: string;
  times: string[];
  startDate?: string;
  endDate?: string;
  timeSlot?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  timeDisplay?: string;
  category?: string;
  advisory?: string;
  pillsTotal?: number;
  pillsLeft?: number;
  pharmacy?: string;
  phone?: string;
  source?: 'manual' | 'prescription';
  sourceDocId?: string;
}

export const medicinesApi = {
  getMedicines: async (): Promise<Medication[]> => {
    const res = await apiClient<Medication[] | { medicines: Medication[] }>('/medicines');
    if (Array.isArray(res)) {
      return res;
    }
    return res.medicines || [];
  },

  createMedicine: async (input: MedicineCreateInput): Promise<Medication> => {
    const res = await apiClient<Medication | { medicine: Medication }>('/medicines', {
      method: 'POST',
      body: input,
    });
    return 'medicine' in res ? res.medicine : res;
  },

  createBulkMedicines: async (medicines: MedicineCreateInput[]): Promise<Medication[]> => {
    const res = await apiClient<{ medicines: Medication[] }>('/medicines/bulk', {
      method: 'POST',
      body: { medicines },
    });
    return res.medicines;
  },

  updateMedicine: async (id: string, updates: Partial<MedicineCreateInput>): Promise<Medication> => {
    const res = await apiClient<Medication | { medicine: Medication }>(`/medicines/${id}`, {
      method: 'PUT',
      body: updates,
    });
    return 'medicine' in res ? res.medicine : res;
  },

  deleteMedicine: async (id: string): Promise<void> => {
    await apiClient<void>(`/medicines/${id}`, {
      method: 'DELETE',
    });
  },

  getTodaySchedule: async (date?: string): Promise<Dose[]> => {
    const res = await apiClient<{ doses: Dose[] }>('/medicines/schedule/today', {
      params: date ? { date } : undefined,
    });
    return res.doses || [];
  },

  logDose: async (
    medicineId: string,
    action: {
      date: string;
      time: string;
      status: 'taken' | 'snoozed' | 'skipped' | 'pending';
    }
  ): Promise<void> => {
    await apiClient<void>(`/medicines/${medicineId}/log`, {
      method: 'POST',
      body: action,
    });
  },

  snoozeMedicine: async (id: string, minutes: number = 15): Promise<{ snoozedUntil: string }> => {
    return apiClient<{ snoozedUntil: string }>(`/medicines/${id}/snooze`, {
      method: 'POST',
      body: { minutes },
    });
  },

  getRefillAlerts: async (): Promise<RefillAlert[]> => {
    const res = await apiClient<RefillAlert[] | { alerts: RefillAlert[] }>('/medicines/refill-alerts');
    if (Array.isArray(res)) {
      return res;
    }
    return res.alerts || [];
  },

  getAdherenceStats: async (days: number = 7): Promise<{ days: { date: string; scheduled: number; taken: number }[] }> => {
    return apiClient<{ days: { date: string; scheduled: number; taken: number }[] }>('/medicines/stats/adherence', {
      params: { days },
    });
  },
};
