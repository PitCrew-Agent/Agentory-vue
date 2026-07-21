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
})
