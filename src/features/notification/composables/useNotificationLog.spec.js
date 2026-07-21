import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  applyNotificationReadStatusMock,
  fetchAllNotificationItemsMock,
  fetchNotificationPageMock,
  markNotificationReadRequestMock,
} = vi.hoisted(() => ({
  applyNotificationReadStatusMock: vi.fn(),
  fetchAllNotificationItemsMock: vi.fn(),
  fetchNotificationPageMock: vi.fn(),
  markNotificationReadRequestMock: vi.fn(),
}))

vi.mock('@/features/notification/services/notificationApi', () => ({
  fetchAllNotificationItems: fetchAllNotificationItemsMock,
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
    fetchAllNotificationItemsMock.mockReset()
    fetchNotificationPageMock.mockReset()
    applyNotificationReadStatusMock.mockReset()
    markNotificationReadRequestMock.mockReset()
    markNotificationReadRequestMock.mockResolvedValue(undefined)
  })

  it('uses backend page metadata and requests the selected page', async () => {
    const notifications = createNotifications(23)

    fetchAllNotificationItemsMock.mockResolvedValue(notifications)
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
      limit: 10,
      page: 3,
      unreadOnly: false,
    })
  })

  it('only applies read transitions accepted by the backend', async () => {
    const notifications = [
      { ...createNotifications(1)[0], id: 1, readStatus: 'read' },
      { ...createNotifications(1)[0], id: 2, readStatus: 'unread' },
    ]

    fetchAllNotificationItemsMock.mockResolvedValue(notifications)
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

  it('keeps all calendar dates and loads the first page containing the selected date', async () => {
    const notifications = [
      ...createNotificationsForDate('2026-07-12', 12, 1),
      ...createNotificationsForDate('2026-07-11', 5, 13),
      ...createNotificationsForDate('2026-07-10', 3, 18),
    ]

    fetchAllNotificationItemsMock.mockResolvedValue(notifications)
    mockPageResponse(notifications)
    const notificationLog = useNotificationLog()

    await notificationLog.loadNotifications()

    expect(notificationLog.notificationDates.value).toEqual([
      '2026-07-12',
      '2026-07-11',
      '2026-07-10',
    ])
    await expect(notificationLog.goToNotificationDate('2026-07-11')).resolves.toBe(true)
    expect(notificationLog.notificationPagination.pageIndex).toBe(2)
    expect(
      notificationLog.notificationGroups.value.flatMap((group) => group.rows.map((row) => row.id)),
    ).toContain(13)
    await expect(notificationLog.goToNotificationDate('2026-07-09')).resolves.toBe(false)
    expect(notificationLog.notificationPagination.pageIndex).toBe(2)
  })
})
