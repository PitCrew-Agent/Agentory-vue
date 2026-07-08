import { computed, reactive, ref } from 'vue'

import {
  fetchNotificationGroups,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
} from '@/features/notification/services/notificationApi'

const notificationGroups = reactive([])
const isNotificationLoading = ref(false)

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

function replaceNotificationGroups(groups) {
  notificationGroups.splice(
    0,
    notificationGroups.length,
    ...groups.map((group) => ({
      ...group,
      rows: group.rows.map((row) => ({ ...row })),
    })),
  )
}

function findNotification(id) {
  return notificationGroups.flatMap((group) => group.rows).find((row) => row.id === id)
}

async function loadNotifications(options) {
  isNotificationLoading.value = true

  try {
    const groups = await fetchNotificationGroups(options)

    replaceNotificationGroups(groups)
    return groups
  } catch {
    replaceNotificationGroups([])
    return []
  } finally {
    isNotificationLoading.value = false
  }
}

async function setNotificationReadStatus(id, readStatus) {
  const target = notificationGroups.flatMap((group) => group.rows).find((row) => row.id === id)

  if (target) {
    if (readStatus === 'read' && target.readStatus !== 'read') {
      try {
        await markNotificationReadRequest(id)
      } catch {
        return
      }
    }

    target.readStatus = readStatus
  }
}

async function toggleNotificationReadStatus(id) {
  const target = findNotification(id)

  if (target) {
    await setNotificationReadStatus(id, target.readStatus === 'read' ? 'unread' : 'read')
  }
}

function markNotificationRead(id) {
  return setNotificationReadStatus(id, 'read')
}

async function markAllNotificationsRead() {
  try {
    await markAllNotificationsReadRequest()
  } catch {
    return
  }

  notificationGroups.forEach((group) => {
    group.rows.forEach((row) => {
      row.readStatus = 'read'
    })
  })
}

export function useNotificationCenter() {
  return {
    isNotificationLoading,
    loadNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    notificationGroups,
    notifications,
    setNotificationReadStatus,
    toggleNotificationReadStatus,
    unreadNotifications,
  }
}
