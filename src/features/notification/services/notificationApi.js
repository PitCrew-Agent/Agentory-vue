import { normalizeNotificationReadStatus } from '@/constants/notificationStatus'
import { getAcceptLanguage } from '@/features/i18n/services/localePreference'
import { buildApiUrl, http } from '@/services/api/http'
import { subscribeToSse } from '@/services/api/sse'

function formatDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value ?? '').slice(0, 10)
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function formatDateTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value ?? '')
      .replace('T', ' ')
      .slice(0, 16)
  }

  return `${formatDate(value)} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`
}

export function getNotificationGroupDate(item) {
  return formatDate(item.occurred_at ?? item.occurredAt)
}

export function normalizeNotificationTone(item = {}) {
  const rawTone = String(
    item.severity ?? item.status ?? item.status_level ?? item.statusLevel ?? item.tone ?? '',
  )
    .trim()
    .toLowerCase()
  const code = String(item.alarm_code ?? item.code ?? '')
    .trim()
    .toUpperCase()

  if (['danger', 'critical', 'error', '위험'].includes(rawTone) || code.startsWith('ERR-')) {
    return 'danger'
  }

  if (['warning', 'warn', '주의'].includes(rawTone) || code.startsWith('WRN-')) {
    return 'warning'
  }

  return 'warning'
}

export function normalizeNotification(item) {
  const occurredAt = item.occurred_at ?? item.occurredAt

  return {
    code: item.alarm_code ?? item.code,
    equipmentCode: item.equipment_id ?? item.equipmentId,
    equipmentId: item.equipment_id ?? item.equipmentId,
    id: item.id,
    lineId:
      item.line_id ??
      item.lineId ??
      item.line_code ??
      item.lineCode ??
      item.line_name ??
      item.lineName ??
      item.line ??
      '',
    message: item.message,
    metric: item.metric ?? '',
    occurredAt: formatDateTime(occurredAt),
    occurredDate: formatDate(occurredAt),
    readStatus: normalizeNotificationReadStatus(item.is_read ?? item.isRead),
    tone: normalizeNotificationTone(item),
  }
}

export function groupNotificationRows(items) {
  const groupMap = new Map()

  items.forEach((item) => {
    const row = item.occurredAt ? item : normalizeNotification(item)
    const date = row.occurredDate || formatDate(row.occurredAt)
    const rows = groupMap.get(date) ?? []

    rows.push(row)
    groupMap.set(date, rows)
  })

  return [...groupMap.entries()]
    .toSorted(([firstDate], [secondDate]) => secondDate.localeCompare(firstDate))
    .map(([date, rows]) => ({
      date,
      id: date,
      rows: rows.toSorted((first, second) => second.occurredAt.localeCompare(first.occurredAt)),
    }))
}

export async function fetchNotificationPage({ page = 1, limit = 10, unreadOnly = false } = {}) {
  const response = await http.get('/api/v1/notifications', {
    params: {
      limit,
      page,
      unread_only: unreadOnly,
    },
  })
  const rawItems = Array.isArray(response) ? response : (response?.items ?? [])
  const items = rawItems.map(normalizeNotification)
  const currentPage = Number(response?.page ?? page) || 1
  const pageLimit = Number(response?.limit ?? limit) || limit
  const totalItems = Number(response?.total_items ?? items.length) || 0
  const totalPages = Number(response?.total_pages ?? (items.length ? 1 : 0)) || 0

  return {
    groups: groupNotificationRows(items),
    hasMore: response?.has_more ?? currentPage < totalPages,
    items,
    limit: pageLimit,
    page: currentPage,
    totalItems,
    totalPages,
  }
}

export async function fetchAllNotificationItems({ batchSize = 50, unreadOnly = false } = {}) {
  const items = []
  const itemIds = new Set()
  let pageNumber = 1

  while (true) {
    const page = await fetchNotificationPage({
      limit: batchSize,
      page: pageNumber,
      unreadOnly,
    })

    page.items.forEach((item) => {
      if (!itemIds.has(item.id)) {
        itemIds.add(item.id)
        items.push(item)
      }
    })

    if (!page.hasMore || page.page >= page.totalPages) {
      break
    }

    pageNumber = page.page + 1
  }

  return items
}

export async function fetchNotificationGroups(options = {}) {
  const page = await fetchNotificationPage(options)

  return page.groups
}

export async function fetchUnreadNotifications({ limit = 10 } = {}) {
  const page = await fetchNotificationPage({
    limit,
    page: 1,
    unreadOnly: true,
  })

  return page.items
}

export function markNotificationReadRequest(notificationId) {
  return http.patch(`/api/v1/notifications/${encodeURIComponent(notificationId)}/read`)
}

export function markAllNotificationsReadRequest() {
  return http.post('/api/v1/notifications/read-all')
}

export function subscribeNotificationStream({ afterId = 0, onError, onNotification } = {}) {
  let latestNotificationId = Number(afterId) || 0

  function getStreamUrl() {
    const streamUrl = new URL(buildApiUrl('/api/v1/notifications/stream'))
    streamUrl.searchParams.set('after_id', String(latestNotificationId))

    return streamUrl.toString()
  }

  function handleNotification(event) {
    if (event.event !== 'notification') {
      return
    }

    try {
      const notification = JSON.parse(event.data)
      const notificationId = Number(notification.id)

      if (Number.isFinite(notificationId)) {
        latestNotificationId = Math.max(latestNotificationId, notificationId)
      }

      onNotification?.(notification)
    } catch (error) {
      onError?.(error)
    }
  }

  return subscribeToSse({
    getUrl: getStreamUrl,
    headers: {
      Accept: 'text/event-stream',
      'Accept-Language': getAcceptLanguage(),
    },
    onError,
    onEvent: handleNotification,
  })
}
