import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { notificationCenter } = vi.hoisted(() => ({
  notificationCenter: {
    loadNotifications: vi.fn(),
    primeNotificationStreamCursor: vi.fn(),
    startNotificationStream: vi.fn(),
  },
}))

vi.mock('@/features/notification/composables/useNotificationCenter', () => ({
  useNotificationCenter: () => notificationCenter,
}))

import { useNotificationToast } from '@/features/notification/composables/useNotificationToast'

describe('useNotificationToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    notificationCenter.loadNotifications.mockReset()
    notificationCenter.primeNotificationStreamCursor.mockReset()
    notificationCenter.startNotificationStream.mockReset()
    notificationCenter.startNotificationStream.mockReturnValue(vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('신규 알림을 토스트와 실시간 처리 콜백에 함께 전달한다', async () => {
    const onNotification = vi.fn()
    const { alertToast, alertToasts, startAlertToastStream, stopAlertToastStream } =
      useNotificationToast()

    await startAlertToastStream({ loadInitial: false, onNotification })

    const streamOptions = notificationCenter.startNotificationStream.mock.calls[0][0]
    const notification = {
      code: 'ERR-301',
      equipmentId: 'EQP-A01',
      id: 10,
      metric: 'pressure',
      tone: 'danger',
    }

    streamOptions.onNotification(notification)

    expect(alertToast.value).toMatchObject(notification)
    expect(alertToasts.value).toHaveLength(1)
    expect(onNotification).toHaveBeenCalledOnce()
    expect(onNotification).toHaveBeenCalledWith(notification)

    stopAlertToastStream()
  })

  it('연속 알림은 앞 알림이 종료된 뒤 각자 전체 노출 시간을 보장한다', () => {
    const { alertToast, alertToasts, showAlertToast } = useNotificationToast()

    showAlertToast({ code: 'WRN-701', id: 10, message: '첫 알림' })
    vi.advanceTimersByTime(1200)
    showAlertToast({ code: 'ERR-301', id: 11, message: '두 번째 알림' })

    expect(alertToasts.value).toHaveLength(2)
    expect(alertToast.value.id).toBe(10)

    vi.advanceTimersByTime(2999)
    expect(alertToast.value.id).toBe(10)

    vi.advanceTimersByTime(1)
    expect(alertToast.value.id).toBe(11)

    vi.advanceTimersByTime(4199)
    expect(alertToast.value.id).toBe(11)

    vi.advanceTimersByTime(1)
    expect(alertToast.value).toBeNull()
  })

  it('호버 중에는 알림 토스트의 자동 종료 시간을 일시정지한다', () => {
    const { alertToast, pauseAlertToast, resumeAlertToast, showAlertToast } = useNotificationToast()

    showAlertToast({ code: 'WRN-301', id: 10, message: '압력 주의' })
    vi.advanceTimersByTime(1200)
    pauseAlertToast()
    vi.advanceTimersByTime(6000)

    expect(alertToast.value).not.toBeNull()

    resumeAlertToast()
    vi.advanceTimersByTime(2999)
    expect(alertToast.value).not.toBeNull()

    vi.advanceTimersByTime(1)
    expect(alertToast.value).toBeNull()
  })
})
