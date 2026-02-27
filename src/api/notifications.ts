import { apiFetch } from './client';

export type SystemNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  publishedAt: string;
  isRead: boolean;
  readAt: string | null;
};

export const listNotificationsApi = () =>
  apiFetch<{ notifications: SystemNotification[] }>('/notifications');

export const markNotificationsReadApi = (notificationIds: string[]) =>
  apiFetch<{ ok: boolean }>('/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ notificationIds })
  });
