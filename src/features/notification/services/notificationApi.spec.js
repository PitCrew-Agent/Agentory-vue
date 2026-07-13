import { describe, expect, it } from 'vitest'

import { normalizeNotification, normalizeNotificationTone } from '@/features/notification/services/notificationApi'

describe('notificationApi', () => {
  it('알람 코드 접두어로 주의와 위험을 구분한다', () => {
    expect(normalizeNotificationTone({ alarm_code: 'WRN-702' })).toBe('warning')
    expect(normalizeNotificationTone({ alarm_code: 'ERR-402' })).toBe('danger')
  })

  it('백엔드 위험도 값을 알림 모델에 포함한다', () => {
    const notification = normalizeNotification({
      alarm_code: 'ALM-101',
      id: 1,
      is_read: false,
      occurred_at: '2026-07-13T12:00:00Z',
      severity: 'critical',
    })

    expect(notification.tone).toBe('danger')
  })
})
