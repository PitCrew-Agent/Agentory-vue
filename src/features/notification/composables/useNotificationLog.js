import { computed, reactive, ref } from 'vue'

import {
  fetchAllNotificationItems,
  fetchNotificationPage,
  groupNotificationRows,
  markNotificationReadRequest,
} from '@/features/notification/services/notificationApi'
import { useNotificationCenter } from '@/features/notification/composables/useNotificationCenter'

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
  const notificationIndexItems = reactive([])
  const notificationPagination = reactive(createPaginationState())
  const isNotificationLoading = ref(false)
  let notificationDateIndexRequestId = 0

  const notificationDates = computed(() =>
    [
      ...new Set(notificationIndexItems.map((item) => item.occurredDate).filter(Boolean)),
    ].toSorted((first, second) => second.localeCompare(first)),
  )

  const notificationGroups = computed(() => groupNotificationRows(notificationItems))

  function findNotification(id) {
    return notificationItems.find((row) => row.id === id)
  }

  function syncPagination(page) {
    notificationPagination.limit = page.limit
    notificationPagination.pageIndex = page.page
    notificationPagination.totalItems = page.totalItems
    notificationPagination.totalPages = page.totalPages
    notificationPagination.canGoPrevious = notificationPagination.pageIndex > 1
    notificationPagination.hasMore = page.hasMore
  }

  async function refreshNotificationDateIndex(unreadOnly, fallbackItems = []) {
    const requestId = ++notificationDateIndexRequestId
    let indexItems = fallbackItems

    try {
      indexItems = await fetchAllNotificationItems({ unreadOnly })
    } catch {
      // Keep the visible page available when the optional calendar index cannot be refreshed.
    }

    if (requestId !== notificationDateIndexRequestId) {
      return
    }

    notificationIndexItems.splice(
      0,
      notificationIndexItems.length,
      ...indexItems.map((item) => ({ ...item })),
    )
  }

  async function loadNotificationPage(pageNumber, options = {}) {
    const nextLimit = options.limit ?? notificationPagination.limit
    const nextUnreadOnly = options.unreadOnly ?? notificationPagination.unreadOnly

    if (isNotificationLoading.value) {
      return notificationGroups.value
    }

    isNotificationLoading.value = true

    try {
      const page = await fetchNotificationPage({
        limit: nextLimit,
        page: pageNumber,
        unreadOnly: nextUnreadOnly,
      })

      notificationItems.splice(
        0,
        notificationItems.length,
        ...page.items.map((item) => ({ ...item })),
      )
      notificationPagination.unreadOnly = nextUnreadOnly
      syncPagination(page)

      if (options.refreshDates) {
        void refreshNotificationDateIndex(nextUnreadOnly, page.items)
      }

      return notificationGroups.value
    } catch {
      notificationItems.splice(0, notificationItems.length)
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

  function loadNotifications(options = {}) {
    return loadNotificationPage(options.page ?? 1, {
      ...options,
      refreshDates: true,
      unreadOnly: options.unreadOnly ?? false,
    })
  }

  async function loadNextNotificationsPage() {
    if (!notificationPagination.hasMore || isNotificationLoading.value) {
      return
    }

    await loadNotificationPage(notificationPagination.pageIndex + 1)
  }

  async function loadPreviousNotificationsPage() {
    if (!notificationPagination.canGoPrevious || isNotificationLoading.value) {
      return
    }

    await loadNotificationPage(notificationPagination.pageIndex - 1)
  }

  async function loadNotificationsPage(pageNumber) {
    const targetPage = Math.min(
      Math.max(1, Number(pageNumber) || 1),
      Math.max(1, notificationPagination.totalPages),
    )

    if (targetPage === notificationPagination.pageIndex || isNotificationLoading.value) {
      return notificationGroups.value
    }

    return loadNotificationPage(targetPage)
  }

  async function goToNotificationDate(date) {
    const firstNotificationIndex = notificationIndexItems.findIndex(
      (notification) => notification.occurredDate === date,
    )

    if (firstNotificationIndex < 0) {
      return false
    }

    const targetPage = Math.floor(firstNotificationIndex / notificationPagination.limit) + 1

    await loadNotificationsPage(targetPage)

    return true
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
    goToNotificationDate,
    isNotificationLoading,
    loadNextNotificationsPage,
    loadNotifications,
    loadNotificationsPage,
    loadPreviousNotificationsPage,
    markAllNotificationsRead,
    notificationDates,
    notificationGroups,
    notificationPagination,
    setNotificationReadStatus,
  }
}
