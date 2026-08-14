import { create } from 'zustand';
import { listNotificationsApi, markNotificationsReadApi, type SystemNotification } from '../api/notifications';

interface SystemNotificationsState {
  notifications: SystemNotification[];
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markRead: (notificationIds: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useSystemNotificationsStore = create<SystemNotificationsState>((set, get) => ({
  notifications: [],
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const payload = await listNotificationsApi();
      set({ notifications: payload.notifications, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  markRead: async (notificationIds) => {
    if (notificationIds.length === 0) return;
    await markNotificationsReadApi(notificationIds);
    set((state) => ({
      notifications: state.notifications.map((item) =>
        notificationIds.includes(item.id) ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
      )
    }));
  },

  markAllRead: async () => {
    const unreadIds = get().notifications.filter((item) => !item.isRead).map((item) => item.id);
    if (unreadIds.length === 0) return;
    await get().markRead(unreadIds);
  }
}));
