import { computed, reactive, ref } from 'vue'

import {
  fetchNotificationPage,
  getNotificationGroupDate,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
  normalizeNotification,
  subscribeNotificationStream,
} from '@/features/notification/services/notificationApi'

const notificationGroups = reactive([])
const notificationPagination = reactive({
  canGoPrevious: false,
  hasMore: false,
  limit: 10,
  pageIndex: 1,
  totalItems: 0,
  totalPages: 0,
  unreadOnly: false,
})
const isNotificationLoading = ref(false)
let latestNotificationId = 0
const knownNotificationIds = new Set()

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

function captureLatestNotificationId(row) {
  const numericId = Number(row?.id)

  if (Number.isFinite(numericId)) {
    latestNotificationId = Math.max(latestNotificationId, numericId)
  }
}

function replaceNotificationGroups(groups) {
  notificationGroups.splice(
    0,
    notificationGroups.length,
    ...groups.map((group) => ({
      ...group,
      rows: group.rows.map((row) => ({ ...row })),
    })),
  )
  notificationGroups
    .flatMap((group) => group.rows)
    .forEach((row) => {
      knownNotificationIds.add(row.id)
      captureLatestNotificationId(row)
    })
}

function findNotification(id) {
  return notificationGroups.flatMap((group) => group.rows).find((row) => row.id === id)
}

function applyNotificationReadStatus(id, readStatus = 'read') {
  const target = findNotification(id)

  if (target) {
    target.readStatus = readStatus
  }
}

function applyAllNotificationsRead() {
  notificationGroups.forEach((group) => {
    group.rows.forEach((row) => {
      row.readStatus = 'read'
    })
  })
}

function getLatestNotificationId() {
  return latestNotificationId
}

function sortNotificationGroups() {
  notificationGroups.sort((first, second) => second.date.localeCompare(first.date))
  notificationGroups.forEach((group) => {
    group.rows.sort((first, second) => second.occurredAt.localeCompare(first.occurredAt))
  })
}

function addNotification(rawNotification) {
  const row = normalizeNotification(rawNotification)

  if (!row.id || knownNotificationIds.has(row.id) || findNotification(row.id)) {
    return null
  }

  knownNotificationIds.add(row.id)
  captureLatestNotificationId(row)

  const date = getNotificationGroupDate(rawNotification)
  let group = notificationGroups.find((item) => item.date === date)

  if (!group) {
    group = {
      date,
      id: date,
      rows: [],
    }
    notificationGroups.push(group)
  }

  group.rows.push(row)
  sortNotificationGroups()

  return {
    ...row,
    date,
  }
}

async function loadNotifications(options) {
  const shouldResetPagination = options?.reset ?? !options?.page
  const nextPage = shouldResetPagination
    ? 1
    : (options?.page ?? notificationPagination.pageIndex)
  const nextLimit = options?.limit ?? notificationPagination.limit
  const nextUnreadOnly =
    options?.unreadOnly ?? (shouldResetPagination ? true : notificationPagination.unreadOnly)

  isNotificationLoading.value = true

  try {
    const page = await fetchNotificationPage({
      limit: nextLimit,
      page: nextPage,
      unreadOnly: nextUnreadOnly,
    })

    replaceNotificationGroups(page.groups)
    notificationPagination.canGoPrevious = page.page > 1
    notificationPagination.hasMore = page.hasMore
    notificationPagination.limit = page.limit
    notificationPagination.pageIndex = page.page
    notificationPagination.totalItems = page.totalItems
    notificationPagination.totalPages = page.totalPages
    notificationPagination.unreadOnly = nextUnreadOnly

    return page.groups
  } catch {
    replaceNotificationGroups([])
    notificationPagination.canGoPrevious = false
    notificationPagination.hasMore = false
    notificationPagination.pageIndex = 1
    notificationPagination.totalItems = 0
    notificationPagination.totalPages = 0
    return []
  } finally {
    isNotificationLoading.value = false
  }
}

async function primeNotificationStreamCursor() {
  try {
    const page = await fetchNotificationPage({
      limit: 1,
      unreadOnly: false,
    })

    page.items.forEach((row) => {
      knownNotificationIds.add(row.id)
      captureLatestNotificationId(row)
    })
  } catch {
    // 스트림 기준점 보정 실패 시 기존 cursor를 유지한다.
  }
}

async function loadNextNotificationsPage() {
  if (!notificationPagination.hasMore || isNotificationLoading.value) {
    return
  }

  await loadNotifications({
    limit: notificationPagination.limit,
    page: notificationPagination.pageIndex + 1,
    reset: false,
    unreadOnly: notificationPagination.unreadOnly,
  })
}

async function loadPreviousNotificationsPage() {
  if (!notificationPagination.canGoPrevious || isNotificationLoading.value) {
    return
  }

  await loadNotifications({
    limit: notificationPagination.limit,
    page: notificationPagination.pageIndex - 1,
    reset: false,
    unreadOnly: notificationPagination.unreadOnly,
  })
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

    applyNotificationReadStatus(id, readStatus)
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

  applyAllNotificationsRead()
}

function startNotificationStream({ onNotification } = {}) {
  return subscribeNotificationStream({
    afterId: getLatestNotificationId(),
    onNotification(rawNotification) {
      const notification = addNotification(rawNotification)

      if (notification) {
        onNotification?.(notification)
      }
    },
  })
}

export function useNotificationCenter() {
  return {
    addNotification,
    applyAllNotificationsRead,
    applyNotificationReadStatus,
    isNotificationLoading,
    loadNotifications,
    loadNextNotificationsPage,
    loadPreviousNotificationsPage,
    markAllNotificationsRead,
    markNotificationRead,
    notificationGroups,
    notificationPagination,
    notifications,
    primeNotificationStreamCursor,
    setNotificationReadStatus,
    startNotificationStream,
    toggleNotificationReadStatus,
    unreadNotifications,
  }
}
