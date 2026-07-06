import { computed, reactive } from 'vue'

import { notificationLogGroups } from '@/features/notification/mock/notificationLogMock'

const userId = 'employee1'
const notificationGroups = reactive(
  notificationLogGroups.map((group) => ({
    ...group,
    rows: group.rows.map((row) => ({ ...row })),
  })),
)

const notifications = computed(() =>
  notificationGroups.flatMap((group) =>
    group.rows.map((row) => ({
      ...row,
      date: group.date,
    })),
  ),
)

const unreadNotifications = computed(() =>
  notifications.value.filter((notification) => notification.readStatus === 'unread'),
)

function setNotificationReadStatus(id, readStatus) {
  const target = notificationGroups.flatMap((group) => group.rows).find((row) => row.id === id)

  if (target) {
    target.readStatus = readStatus
  }
}

function toggleNotificationReadStatus(id) {
  const target = notificationGroups.flatMap((group) => group.rows).find((row) => row.id === id)

  if (target) {
    target.readStatus = target.readStatus === 'read' ? 'unread' : 'read'
  }
}

function markNotificationRead(id) {
  setNotificationReadStatus(id, 'read')
}

function markAllNotificationsRead() {
  notificationGroups.forEach((group) => {
    group.rows.forEach((row) => {
      row.readStatus = 'read'
    })
  })
}

export function useNotificationCenter() {
  return {
    markAllNotificationsRead,
    markNotificationRead,
    notificationGroups,
    notifications,
    setNotificationReadStatus,
    toggleNotificationReadStatus,
    unreadNotifications,
    userId,
  }
}
