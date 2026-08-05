import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  applyNotificationReadStatusMock,
  fetchNotificationPageMock,
  markNotificationReadRequestMock,
} = vi.hoisted(() => ({
  applyNotificationReadStatusMock: vi.fn(),
  fetchNotificationPageMock: vi.fn(),
  markNotificationReadRequestMock: vi.fn(),
}))

vi.mock('@/features/notification/services/notificationApi', () => ({
  fetchNotificationPage: fetchNotificationPageMock,
  groupNotificationRows(items) {
    return [...new Set(items.map((item) => item.occurredDate))].map((date) => ({
      date,
      id: date,
      rows: items.filter((item) => item.occurredDate === date),
    }))
  },
  markNotificationReadRequest: markNotificationReadRequestMock,
}))

vi.mock('@/features/notification/composables/useNotificationCenter', () => ({
  useNotificationCenter: () => ({
    applyNotificationReadStatus: applyNotificationReadStatusMock,
  }),
}))

import { useNotificationLog } from '@/features/notification/composables/useNotificationLog'

function createNotifications(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    occurredAt: `2026-07-10 12:${String(index).padStart(2, '0')}`,
    occurredDate: '2026-07-10',
    readStatus: index % 2 ? 'read' : 'unread',
  }))
}

function createNotificationsForDate(date, count, startId) {
  return Array.from({ length: count }, (_, index) => ({
    id: startId + index,
    occurredAt: `${date} 12:${String(index).padStart(2, '0')}`,
    occurredDate: date,
    readStatus: 'unread',
  }))
}

function mockPageResponse(notifications, totalItems = notifications.length) {
  fetchNotificationPageMock.mockImplementation(({ limit, page }) => ({
    groups: [],
    hasMore: page < Math.ceil(totalItems / limit),
    items: notifications.slice((page - 1) * limit, page * limit),
    limit,
    page,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
  }))
}

describe('useNotificationLog', () => {
  beforeEach(() => {
    fetchNotificationPageMock.mockReset()
    applyNotificationReadStatusMock.mockReset()
    markNotificationReadRequestMock.mockReset()
    markNotificationReadRequestMock.mockResolvedValue(undefined)
  })

  it('uses backend page metadata and requests the selected page', async () => {
    const notifications = createNotifications(23)

    mockPageResponse(notifications)
    const notificationLog = useNotificationLog()

    await notificationLog.loadNotifications()

    expect(notificationLog.notificationGroups.value[0].rows).toHaveLength(10)
    expect(notificationLog.notificationPagination.totalItems).toBe(23)
    expect(notificationLog.notificationPagination.totalPages).toBe(3)
    expect(notificationLog.notificationPagination.pageIndex).toBe(1)

    await notificationLog.loadNextNotificationsPage()
    await notificationLog.loadNextNotificationsPage()

    expect(notificationLog.notificationPagination.pageIndex).toBe(3)
    expect(notificationLog.notificationGroups.value[0].rows).toHaveLength(3)
    expect(notificationLog.notificationPagination.hasMore).toBe(false)
    expect(fetchNotificationPageMock).toHaveBeenLastCalledWith({
      end: null,
      limit: 10,
      page: 3,
      start: null,
      unreadOnly: false,
    })
  })

  it('only applies read transitions accepted by the backend', async () => {
    const notifications = [
      { ...createNotifications(1)[0], id: 1, readStatus: 'read' },
      { ...createNotifications(1)[0], id: 2, readStatus: 'unread' },
    ]

    mockPageResponse(notifications)
    const notificationLog = useNotificationLog()

    await notificationLog.loadNotifications()
    await notificationLog.setNotificationReadStatus(1, 'unread')

    expect(markNotificationReadRequestMock).not.toHaveBeenCalled()
    expect(notificationLog.notificationGroups.value[0].rows[0].readStatus).toBe('read')

    await notificationLog.setNotificationReadStatus(2, 'read')

    expect(markNotificationReadRequestMock).toHaveBeenCalledWith(2)
    expect(applyNotificationReadStatusMock).toHaveBeenCalledWith(2, 'read')
    expect(notificationLog.notificationGroups.value[0].rows[1].readStatus).toBe('read')
  })

  it('loads the selected calendar date with the backend KST range filter', async () => {
    const notifications = [
      ...createNotificationsForDate('2026-07-12', 12, 1),
      ...createNotificationsForDate('2026-07-11', 5, 13),
      ...createNotificationsForDate('2026-07-10', 3, 18),
    ]

    fetchNotificationPageMock.mockImplementation(({ end, limit, page, start }) => {
      const filteredNotifications = start
        ? notifications.filter((notification) => {
            const occurredAt = `${notification.occurredDate}T12:00:00+09:00`

            return occurredAt >= start && occurredAt < end
          })
        : notifications

      return {
        groups: [],
        hasMore: page < Math.ceil(filteredNotifications.length / limit),
        items: filteredNotifications.slice((page - 1) * limit, page * limit),
        limit,
        page,
        totalItems: filteredNotifications.length,
        totalPages: Math.ceil(filteredNotifications.length / limit),
      }
    })
    const notificationLog = useNotificationLog()

    await notificationLog.loadNotifications()

    await expect(notificationLog.goToNotificationDate('2026-07-11')).resolves.toBe(true)
    expect(fetchNotificationPageMock).toHaveBeenLastCalledWith({
      end: '2026-07-12T00:00:00+09:00',
      limit: 10,
      page: 1,
      start: '2026-07-11T00:00:00+09:00',
      unreadOnly: false,
    })
    expect(notificationLog.notificationPagination.pageIndex).toBe(1)
    expect(notificationLog.selectedNotificationDate.value).toBe('2026-07-11')
    expect(
      notificationLog.notificationGroups.value.flatMap((group) => group.rows.map((row) => row.id)),
    ).toContain(13)
    await expect(notificationLog.goToNotificationDate('2026-07-09')).resolves.toBe(false)
    expect(notificationLog.notificationPagination.totalItems).toBe(0)
  })
})
