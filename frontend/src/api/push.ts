import { apiClient } from './client';

export const pushApi = {
  getVapidKey: async (): Promise<string> => {
    const res = await apiClient<{ publicKey: string }>('/push/vapid-key');
    return res.publicKey;
  },

  subscribePush: async (subscription: PushSubscriptionJSON): Promise<void> => {
    await apiClient<void>('/push/subscribe', {
      method: 'POST',
      body: subscription,
    });
  },

  unsubscribePush: async (subscription: PushSubscriptionJSON): Promise<void> => {
    await apiClient<void>('/push/subscribe', {
      method: 'DELETE',
      body: subscription,
    });
  },
};
