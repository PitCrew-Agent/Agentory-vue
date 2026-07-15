import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { createIncidentPlanRequestMock, markNotificationReadMock, pushMock, routerState } =
  vi.hoisted(() => ({
    createIncidentPlanRequestMock: vi.fn(),
    markNotificationReadMock: vi.fn(),
    pushMock: vi.fn(),
    routerState: { value: { name: 'Dashboard' } },
  }))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    currentRoute: routerState,
    push: pushMock,
  }),
}))

vi.mock('@/features/incident/services/incidentPlanApi', () => ({
  createIncidentPlanRequest: createIncidentPlanRequestMock,
}))

vi.mock('@/features/notification/composables/useNotificationCenter', () => ({
  useNotificationCenter: () => ({
    markNotificationRead: markNotificationReadMock,
  }),
}))

import { useIncidentResponse } from '@/features/incident/composables/useIncidentResponse'

describe('useIncidentResponse', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routerState.value = { name: 'Dashboard' }
    pushMock.mockReset()
    pushMock.mockResolvedValue(undefined)
    markNotificationReadMock.mockReset()
    markNotificationReadMock.mockResolvedValue(undefined)
    createIncidentPlanRequestMock.mockReset()
    createIncidentPlanRequestMock.mockResolvedValue({ notificationId: 27 })
  })

  it('대응 계획 생성과 알림 읽음 처리를 함께 시작한다', async () => {
    const { startIncidentResponse } = useIncidentResponse()

    await startIncidentResponse({ id: 27 })

    expect(createIncidentPlanRequestMock).toHaveBeenCalledWith(27)
    expect(markNotificationReadMock).toHaveBeenCalledWith(27)
    expect(pushMock).toHaveBeenCalledWith({ name: 'WorkLog' })
  })

  it('호출자가 읽음을 처리하면 중복 요청하지 않는다', async () => {
    const { startIncidentResponse } = useIncidentResponse()

    await startIncidentResponse({ id: 27 }, { markAsRead: false })

    expect(createIncidentPlanRequestMock).toHaveBeenCalledWith(27)
    expect(markNotificationReadMock).not.toHaveBeenCalled()
  })
})
