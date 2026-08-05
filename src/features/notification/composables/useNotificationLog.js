import { computed, reactive, ref } from 'vue'

import {
  fetchNotificationPage,
  groupNotificationRows,
  markNotificationReadRequest,
} from '@/features/notification/services/notificationApi'
import { useNotificationCenter } from '@/features/notification/composables/useNotificationCenter'
import { createKstDayRange } from '@/services/datetime/kstDateTime'

function createPaginationState() {
  return {
    canGoPrevious: false,
    end: null,
    hasMore: false,
    limit: 10,
    pageIndex: 1,
    selectedDate: '',
    start: null,
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

  const notificationDates = computed(() =>
    [...new Set(notificationItems.map((item) => item.occurredDate).filter(Boolean))].toSorted(
      (first, second) => second.localeCompare(first),
    ),
  )
  const selectedNotificationDate = computed(() => notificationPagination.selectedDate)

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

  async function loadNotificationPage(pageNumber, options = {}) {
    const nextLimit = options.limit ?? notificationPagination.limit
    const nextUnreadOnly = options.unreadOnly ?? notificationPagination.unreadOnly
    const nextStart = Object.hasOwn(options, 'start') ? options.start : notificationPagination.start
    const nextEnd = Object.hasOwn(options, 'end') ? options.end : notificationPagination.end
    const nextSelectedDate = Object.hasOwn(options, 'selectedDate')
      ? options.selectedDate
      : notificationPagination.selectedDate

    if (isNotificationLoading.value) {
      return notificationGroups.value
    }

    isNotificationLoading.value = true

    try {
      const page = await fetchNotificationPage({
        end: nextEnd,
        limit: nextLimit,
        page: pageNumber,
        start: nextStart,
        unreadOnly: nextUnreadOnly,
      })

      notificationItems.splice(
        0,
        notificationItems.length,
        ...page.items.map((item) => ({ ...item })),
      )
      notificationPagination.unreadOnly = nextUnreadOnly
      notificationPagination.start = nextStart
      notificationPagination.end = nextEnd
      notificationPagination.selectedDate = nextSelectedDate
      syncPagination(page)

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
    const range = createKstDayRange(date)

    if (!range) {
      return false
    }

    await loadNotificationPage(1, {
      end: range.end,
      selectedDate: date,
      start: range.start,
    })

    return notificationItems.some((notification) => notification.occurredDate === date)
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
    selectedNotificationDate,
    setNotificationReadStatus,
  }
}
