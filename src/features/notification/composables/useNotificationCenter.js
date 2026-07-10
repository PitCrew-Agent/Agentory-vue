import { computed, reactive, ref } from 'vue'

import {
  fetchNotificationPage,
  getNotificationGroupDate,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
  normalizeNotification,
  subscribeNotificationStream,
} from '@/features/notification/services/notificationApi'
import {
  ensureNotificationLineContext,
  filterNotificationGroupsByAssignedLines,
  shouldIncludeAssignedLineNotification,
} from '@/features/notification/utils/notificationLineFilter'

const notificationGroups = reactive([])
const notificationPagination = reactive({
  canGoPrevious: false,
  cursorStack: [],
  currentCursor: '',
  hasMore: false,
  limit: 10,
  nextCursor: '',
  pageIndex: 1,
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
  const filteredGroups = filterNotificationGroupsByAssignedLines(groups)

  notificationGroups.splice(
    0,
    notificationGroups.length,
    ...filteredGroups.map((group) => ({
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

  if (!shouldIncludeAssignedLineNotification(row)) {
    return null
  }

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
  const shouldResetPagination = options?.reset ?? !options?.before
  const nextBefore = shouldResetPagination ? '' : (options?.before ?? notificationPagination.currentCursor)
  const nextLimit = options?.limit ?? notificationPagination.limit
  const nextUnreadOnly = options?.unreadOnly ?? (shouldResetPagination ? true : notificationPagination.unreadOnly)

  isNotificationLoading.value = true

  try {
    await ensureNotificationLineContext()

    const page = await fetchNotificationPage({
      before: nextBefore,
      limit: nextLimit,
      unreadOnly: nextUnreadOnly,
    })

    replaceNotificationGroups(page.groups)
    notificationPagination.currentCursor = nextBefore
    notificationPagination.hasMore = page.hasMore
    notificationPagination.limit = nextLimit
    notificationPagination.nextCursor = page.nextCursor
    notificationPagination.unreadOnly = nextUnreadOnly

    if (shouldResetPagination) {
      notificationPagination.cursorStack = []
      notificationPagination.pageIndex = 1
    }

    notificationPagination.canGoPrevious = notificationPagination.cursorStack.length > 0

    return page.groups
  } catch {
    replaceNotificationGroups([])
    notificationPagination.hasMore = false
    notificationPagination.nextCursor = ''
    notificationPagination.canGoPrevious = notificationPagination.cursorStack.length > 0
    return []
  } finally {
    isNotificationLoading.value = false
  }
}

async function primeNotificationStreamCursor() {
  try {
    await ensureNotificationLineContext()

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
  if (!notificationPagination.hasMore || !notificationPagination.nextCursor || isNotificationLoading.value) {
    return
  }

  const previousCursor = notificationPagination.currentCursor

  notificationPagination.cursorStack.push(previousCursor)
  notificationPagination.pageIndex += 1
  await loadNotifications({
    before: notificationPagination.nextCursor,
    limit: notificationPagination.limit,
    reset: false,
    unreadOnly: notificationPagination.unreadOnly,
  })
}

async function loadPreviousNotificationsPage() {
  if (!notificationPagination.cursorStack.length || isNotificationLoading.value) {
    return
  }

  const previousCursor = notificationPagination.cursorStack.pop()

  notificationPagination.pageIndex = Math.max(1, notificationPagination.pageIndex - 1)
  await loadNotifications({
    before: previousCursor,
    limit: notificationPagination.limit,
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
