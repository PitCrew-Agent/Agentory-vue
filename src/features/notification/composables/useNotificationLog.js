import { computed, reactive, ref } from 'vue'

import {
  fetchAllNotificationItems,
  groupNotificationRows,
  markNotificationReadRequest,
} from '@/features/notification/services/notificationApi'
import { useNotificationCenter } from '@/features/notification/composables/useNotificationCenter'
import {
  ensureNotificationLineContext,
  shouldIncludeAssignedLineNotification,
} from '@/features/notification/utils/notificationLineFilter'

function createPaginationState() {
  return {
    canGoPrevious: false,
    hasMore: false,
    limit: 10,
    pageIndex: 1,
    totalItems: 0,
    totalPages: 0,
    unreadOnly: false,
  }
}

export function useNotificationLog() {
  const notificationCenter = useNotificationCenter()
  const notificationItems = reactive([])
  const notificationPagination = reactive(createPaginationState())
  const isNotificationLoading = ref(false)

  const pagedNotificationItems = computed(() => {
    const startIndex = (notificationPagination.pageIndex - 1) * notificationPagination.limit

    return notificationItems.slice(startIndex, startIndex + notificationPagination.limit)
  })

  const notificationGroups = computed(() => groupNotificationRows(pagedNotificationItems.value))

  function findNotification(id) {
    return notificationItems.find((row) => row.id === id)
  }

  function syncPagination() {
    const totalItems = notificationItems.length
    const totalPages = Math.ceil(totalItems / notificationPagination.limit)

    notificationPagination.totalItems = totalItems
    notificationPagination.totalPages = totalPages
    notificationPagination.pageIndex = totalPages
      ? Math.min(notificationPagination.pageIndex, totalPages)
      : 1
    notificationPagination.canGoPrevious = notificationPagination.pageIndex > 1
    notificationPagination.hasMore = notificationPagination.pageIndex < totalPages
  }

  async function loadNotifications(options = {}) {
    const nextLimit = options.limit ?? notificationPagination.limit
    const nextUnreadOnly = options.unreadOnly ?? false

    isNotificationLoading.value = true

    try {
      await ensureNotificationLineContext()

      const items = await fetchAllNotificationItems({
        unreadOnly: nextUnreadOnly,
      })
      const assignedLineItems = items.filter(shouldIncludeAssignedLineNotification)

      notificationItems.splice(
        0,
        notificationItems.length,
        ...assignedLineItems.map((item) => ({ ...item })),
      )
      notificationPagination.limit = nextLimit
      notificationPagination.pageIndex = 1
      notificationPagination.unreadOnly = nextUnreadOnly
      syncPagination()

      return notificationGroups.value
    } catch {
      notificationItems.splice(0, notificationItems.length)
      syncPagination()
      return []
    } finally {
      isNotificationLoading.value = false
    }
  }

  async function loadNextNotificationsPage() {
    if (!notificationPagination.hasMore || isNotificationLoading.value) {
      return
    }

    notificationPagination.pageIndex += 1
    syncPagination()
  }

  async function loadPreviousNotificationsPage() {
    if (!notificationPagination.canGoPrevious || isNotificationLoading.value) {
      return
    }

    notificationPagination.pageIndex = Math.max(1, notificationPagination.pageIndex - 1)
    syncPagination()
  }

  async function setNotificationReadStatus(id, readStatus) {
    const target = findNotification(id)

    if (!target) {
      return
    }

    if (readStatus !== 'read' || target.readStatus === 'read') {
      return
    }

    try {
      await markNotificationReadRequest(id)
    } catch {
      return
    }

    target.readStatus = 'read'
    notificationCenter.applyNotificationReadStatus(id, 'read')
  }

  async function markAllNotificationsRead() {
    const unreadItems = notificationItems.filter((item) => item.readStatus === 'unread')

    if (!unreadItems.length) {
      return
    }

    const results = await Promise.allSettled(
      unreadItems.map((item) => markNotificationReadRequest(item.id)),
    )

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        unreadItems[index].readStatus = 'read'
        notificationCenter.applyNotificationReadStatus(unreadItems[index].id, 'read')
      }
    })
  }

  return {
    isNotificationLoading,
    loadNextNotificationsPage,
    loadNotifications,
    loadPreviousNotificationsPage,
    markAllNotificationsRead,
    notificationGroups,
    notificationPagination,
    setNotificationReadStatus,
  }
}
