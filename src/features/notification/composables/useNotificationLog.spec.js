import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  applyNotificationReadStatusMock,
  fetchAllNotificationItemsMock,
  markNotificationReadRequestMock,
} = vi.hoisted(() => ({
  applyNotificationReadStatusMock: vi.fn(),
  fetchAllNotificationItemsMock: vi.fn(),
  markNotificationReadRequestMock: vi.fn(),
}))

vi.mock('@/features/notification/services/notificationApi', () => ({
  fetchAllNotificationItems: fetchAllNotificationItemsMock,
  groupNotificationRows(items) {
    if (!items.length) {
      return []
    }

    return [
      {
        date: '2026-07-10',
        id: '2026-07-10',
        rows: items,
      },
    ]
  },
  markNotificationReadRequest: markNotificationReadRequestMock,
}))

vi.mock('@/features/notification/utils/notificationLineFilter', () => ({
  ensureNotificationLineContext: vi.fn(),
  shouldIncludeAssignedLineNotification: (notification) => notification.assignedLine !== false,
}))

vi.mock('@/features/notification/composables/useNotificationCenter', () => ({
  useNotificationCenter: () => ({
    applyNotificationReadStatus: applyNotificationReadStatusMock,
  }),
}))

import { useNotificationLog } from '@/features/notification/composables/useNotificationLog'

function createNotifications(count) {
  return Array.from({ length: count }, (_, index) => ({
    assignedLine: true,
    id: index + 1,
    occurredAt: `2026-07-10 12:${String(index).padStart(2, '0')}`,
    occurredDate: '2026-07-10',
    readStatus: index % 2 ? 'read' : 'unread',
  }))
}

function createNotificationsForDate(date, count, startId) {
  return Array.from({ length: count }, (_, index) => ({
    assignedLine: true,
    id: startId + index,
    occurredAt: `${date} 12:${String(index).padStart(2, '0')}`,
    occurredDate: date,
    readStatus: 'unread',
  }))
}

describe('useNotificationLog', () => {
  beforeEach(() => {
    fetchAllNotificationItemsMock.mockReset()
    applyNotificationReadStatusMock.mockReset()
    markNotificationReadRequestMock.mockReset()
    markNotificationReadRequestMock.mockResolvedValue(undefined)
  })

  it('담당 라인 알림을 페이지당 10건으로 나누고 전체 페이지를 계산한다', async () => {
    fetchAllNotificationItemsMock.mockResolvedValue([
      ...createNotifications(23),
      { ...createNotifications(1)[0], assignedLine: false, id: 24 },
    ])
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
  })

  it('서버가 지원하는 읽음 전환만 반영한다', async () => {
    fetchAllNotificationItemsMock.mockResolvedValue([
      { ...createNotifications(1)[0], id: 1, readStatus: 'read' },
      { ...createNotifications(1)[0], id: 2, readStatus: 'unread' },
    ])
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

  it('전체 알림 날짜를 제공하고 선택 날짜가 처음 등장하는 페이지로 이동한다', async () => {
    fetchAllNotificationItemsMock.mockResolvedValue([
      ...createNotificationsForDate('2026-07-12', 12, 1),
      ...createNotificationsForDate('2026-07-11', 5, 13),
      ...createNotificationsForDate('2026-07-10', 3, 18),
    ])
    const notificationLog = useNotificationLog()

    await notificationLog.loadNotifications()

    expect(notificationLog.notificationDates.value).toEqual([
      '2026-07-12',
      '2026-07-11',
      '2026-07-10',
    ])
    expect(notificationLog.goToNotificationDate('2026-07-11')).toBe(true)
    expect(notificationLog.notificationPagination.pageIndex).toBe(2)
    expect(notificationLog.notificationGroups.value[0].rows.map((row) => row.id)).toContain(13)
    expect(notificationLog.goToNotificationDate('2026-07-09')).toBe(false)
    expect(notificationLog.notificationPagination.pageIndex).toBe(2)
  })
})
