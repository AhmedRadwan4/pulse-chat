import { create } from 'zustand'
import type { AppNotification } from '@/types/db'

interface NotificationState {
  notifications: AppNotification[]
  unreadCount: number
  setNotifications: (items: AppNotification[], unreadCount: number) => void
  addNotification: (notif: AppNotification) => void
  markRead: (id: string) => void
  markAllRead: () => void
}

export const useNotificationStore = create<NotificationState>(set => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (items, unreadCount) => set({ notifications: items, unreadCount }),

  addNotification: notif =>
    set(state => ({
      notifications: [notif, ...state.notifications],
      unreadCount: state.unreadCount + 1
    })),

  markRead: id =>
    set(state => ({
      notifications: state.notifications.map(n => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1)
    })),

  markAllRead: () =>
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }))
}))
