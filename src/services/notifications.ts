import type { AppNotification } from '@/lib/types'
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/store'
import { markNotificationReadRemote } from '@/lib/data/supabase-adapter'
import { isSupabaseConfigured } from '@/lib/supabase'

export function markNotificationReadService(id: string): void {
  if (isSupabaseConfigured) {
    markNotificationReadRemote(id).catch(() => {
      // Non-critical failure
    })
  } else {
    markNotificationRead(id)
  }
}

export function markAllNotificationsReadService(): void {
  if (isSupabaseConfigured) {
    return
  }
  markAllNotificationsRead()
}

export function getNotifications(state: any, userId: string): AppNotification[] {
  return state.notifications
    .filter((n: AppNotification) => n.userId === userId)
    .sort(
      (a: AppNotification, b: AppNotification) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
}

export function getUnreadCount(state: any, userId: string): number {
  return state.notifications.filter(
    (n: AppNotification) => n.userId === userId && !n.readAt,
  ).length
}