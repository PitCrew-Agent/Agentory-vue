import { normalizeNotificationReadStatus } from '@/constants/notificationStatus'
import { http } from '@/services/api/http'

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
    return String(value ?? '').replace('T', ' ').slice(0, 16)
  }

  return `${formatDate(value)} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`
}

function normalizeNotification(item) {
  return {
    code: item.alarm_code,
    equipmentCode: item.equipment_id,
    equipmentId: item.equipment_id,
    id: item.id,
    lineId: '',
    message: item.message,
    occurredAt: formatDateTime(item.occurred_at),
    readStatus: normalizeNotificationReadStatus(item.is_read),
  }
}

function groupNotifications(items) {
  const groupMap = new Map()

  items.forEach((item) => {
    const date = formatDate(item.occurred_at)
    const rows = groupMap.get(date) ?? []

    rows.push(normalizeNotification(item))
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

export async function fetchNotificationGroups({ unreadOnly = false } = {}) {
  const notifications = await http.get('/api/v1/notifications', {
    params: {
      unread_only: unreadOnly,
    },
  })

  return groupNotifications(notifications)
}

export function markNotificationReadRequest(notificationId) {
  return http.patch(`/api/v1/notifications/${encodeURIComponent(notificationId)}/read`)
}

export function markAllNotificationsReadRequest() {
  return http.post('/api/v1/notifications/read-all')
}
