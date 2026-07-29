import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchFactoryScene } from '@/features/dashboard/services/telemetryApi'
import { fetchEquipmentListPageData } from '@/features/equipment/services/equipmentApi'
import { fetchNotificationPage } from '@/features/notification/services/notificationApi'

vi.mock('@/features/dashboard/services/telemetryApi', () => ({
  fetchFactoryScene: vi.fn(),
}))

vi.mock('@/features/notification/services/notificationApi', () => ({
  fetchNotificationPage: vi.fn(),
}))

function createEquipment(id, alarmCode) {
  return {
    alarmCode,
    equipmentCode: id,
    id,
    lineId: 'a-line',
    metrics: [],
    name: id,
    sequence: id,
    status: { tone: alarmCode === '-' ? 'normal' : 'warning' },
    type: 'Etching',
  }
}

describe('equipmentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the latest matching backend notification message for equipment notes', async () => {
    const equipment = createEquipment('EQP-A01', 'WRN-501')
    const scene = {
      equipmentList: [equipment],
      lineGroups: [{ equipment: [equipment], id: 'a-line', label: 'A-Line' }],
    }

    fetchFactoryScene.mockResolvedValue(scene)
    fetchNotificationPage.mockResolvedValue({
      hasMore: false,
      items: [
        {
          code: 'WRN-501',
          equipmentId: 'EQP-A01',
          message: 'EQP-A01 gas flow left the warning band',
        },
      ],
      page: 1,
      totalPages: 1,
    })

    const pageData = await fetchEquipmentListPageData()

    expect(pageData.groups[0].rows[0].note).toBe('EQP-A01 gas flow left the warning band')
    expect(fetchNotificationPage).toHaveBeenCalledWith({
      limit: 50,
      page: 1,
      unreadOnly: false,
    })
  })

  it('does not replace notes with a client-side status message', async () => {
    const equipment = createEquipment('EQP-A02', '-')
    const scene = {
      equipmentList: [equipment],
      lineGroups: [{ equipment: [equipment], id: 'a-line', label: 'A-Line' }],
    }

    fetchFactoryScene.mockResolvedValue(scene)

    const pageData = await fetchEquipmentListPageData()

    expect(pageData.groups[0].rows[0].note).toBe('')
    expect(pageData.groups[0].rows[0]).not.toHaveProperty('noteKey')
    expect(fetchNotificationPage).not.toHaveBeenCalled()
  })

  it('스코프 밖 알람은 전체 순회 대신 최근 페이지 상한만 병렬 조회한다', async () => {
    const equipment = createEquipment('EQP-CAP1', 'WRN-CAP1')
    const scene = {
      equipmentList: [equipment],
      lineGroups: [{ equipment: [equipment], id: 'a-line', label: 'A-Line' }],
    }

    fetchFactoryScene.mockResolvedValue(scene)
    // 담당 라인 밖이라 매칭되는 알림이 없고 총 10페이지가 있어도 상한(3)까지만 조회해야 한다.
    fetchNotificationPage.mockImplementation(({ page }) =>
      Promise.resolve({ hasMore: page < 10, items: [], page, totalPages: 10 }),
    )

    const pageData = await fetchEquipmentListPageData()

    expect(fetchNotificationPage).toHaveBeenCalledTimes(3)
    expect(fetchNotificationPage.mock.calls.map(([args]) => args.page)).toEqual([1, 2, 3])
    expect(pageData.groups[0].rows[0].note).toBe('')
  })

  it('상한 내 미매칭 알람을 네거티브 캐시해 다음 로드에서 재조회하지 않는다', async () => {
    const equipment = createEquipment('EQP-CAP2', 'WRN-CAP2')
    const scene = {
      equipmentList: [equipment],
      lineGroups: [{ equipment: [equipment], id: 'a-line', label: 'A-Line' }],
    }

    fetchFactoryScene.mockResolvedValue(scene)
    fetchNotificationPage.mockResolvedValue({ hasMore: false, items: [], page: 1, totalPages: 1 })

    await fetchEquipmentListPageData()
    expect(fetchNotificationPage).toHaveBeenCalledTimes(1)

    const secondLoad = await fetchEquipmentListPageData()

    // 두 번째 로드는 네거티브 캐시로 해결되어 추가 알림 조회가 없어야 한다.
    expect(fetchNotificationPage).toHaveBeenCalledTimes(1)
    expect(secondLoad.groups[0].rows[0].note).toBe('')
  })
})
