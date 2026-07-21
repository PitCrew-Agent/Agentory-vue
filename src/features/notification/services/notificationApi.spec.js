import { beforeEach, describe, expect, it, vi } from 'vitest'

const { httpGetMock } = vi.hoisted(() => ({
  httpGetMock: vi.fn(),
}))

vi.mock('@/services/api/http', () => ({
  buildApiUrl: vi.fn(),
  http: {
    get: httpGetMock,
  },
}))

vi.mock('@/services/api/sse', () => ({
  subscribeToSse: vi.fn(),
}))

import {
  fetchAllNotificationItems,
  fetchNotificationPage,
  normalizeNotification,
  normalizeNotificationTone,
} from '@/features/notification/services/notificationApi'

describe('notificationApi', () => {
  beforeEach(() => {
    httpGetMock.mockReset()
  })

  it('derives warning and danger tones from alarm code prefixes', () => {
    expect(normalizeNotificationTone({ alarm_code: 'WRN-702' })).toBe('warning')
    expect(normalizeNotificationTone({ alarm_code: 'ERR-402' })).toBe('danger')
  })

  it('keeps backend severity as a fallback tone', () => {
    const notification = normalizeNotification({
      alarm_code: 'ALM-101',
      id: 1,
      is_read: false,
      occurred_at: '2026-07-13T12:00:00Z',
      severity: 'critical',
    })

    expect(notification.tone).toBe('danger')
  })

  it('keeps the normalized alarm metric', () => {
    const notification = normalizeNotification({
      alarm_code: 'WRN-702',
      equipment_id: 'EQP-A01',
      id: 2,
      is_read: false,
      metric: 'pressure',
      occurred_at: '2026-07-15T12:00:00Z',
    })

    expect(notification.metric).toBe('pressure')
  })

  it('requests and normalizes page-number notification metadata', async () => {
    httpGetMock.mockResolvedValue({
      has_more: true,
      items: [
        {
          alarm_code: 'WRN-702',
          equipment_id: 'EQP-A01',
          id: 11,
          is_read: false,
          occurred_at: '2026-07-15T12:00:00Z',
        },
      ],
      limit: 10,
      page: 2,
      total_items: 23,
      total_pages: 3,
    })

    const page = await fetchNotificationPage({ limit: 10, page: 2, unreadOnly: false })

    expect(httpGetMock).toHaveBeenCalledWith('/api/v1/notifications', {
      params: {
        limit: 10,
        page: 2,
        unread_only: false,
      },
    })
    expect(page).toMatchObject({
      hasMore: true,
      limit: 10,
      page: 2,
      totalItems: 23,
      totalPages: 3,
    })
    expect(page.items).toHaveLength(1)
  })

  it('collects every notification page by page number', async () => {
    httpGetMock
      .mockResolvedValueOnce({
        has_more: true,
        items: [{ alarm_code: 'WRN-501', id: 3, occurred_at: '2026-07-15T12:00:00Z' }],
        limit: 1,
        page: 1,
        total_items: 2,
        total_pages: 2,
      })
      .mockResolvedValueOnce({
        has_more: false,
        items: [{ alarm_code: 'ERR-402', id: 2, occurred_at: '2026-07-14T12:00:00Z' }],
        limit: 1,
        page: 2,
        total_items: 2,
        total_pages: 2,
      })

    const items = await fetchAllNotificationItems({ batchSize: 1 })

    expect(items.map((item) => item.id)).toEqual([3, 2])
    expect(httpGetMock).toHaveBeenNthCalledWith(2, '/api/v1/notifications', {
      params: {
        limit: 1,
        page: 2,
        unread_only: false,
      },
    })
  })
})
