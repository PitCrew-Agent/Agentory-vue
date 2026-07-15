import { describe, expect, it } from 'vitest'

import {
  requestDashboardEquipmentFocus,
  useDashboardEquipmentFocus,
} from '@/features/dashboard/composables/useDashboardEquipmentFocus'

describe('useDashboardEquipmentFocus', () => {
  it('알림의 장비와 센서 정보를 한 번 소비할 포커스 요청으로 만든다', () => {
    requestDashboardEquipmentFocus({
      code: 'ERR-301',
      equipmentId: 'EQP-A01',
      id: 12,
      metric: 'pressure',
      tone: 'danger',
    })

    const { consumeEquipmentFocusRequest } = useDashboardEquipmentFocus()

    expect(consumeEquipmentFocusRequest()).toEqual({
      equipmentId: 'EQP-A01',
      key: 'notification:12:EQP-A01',
    })
    expect(consumeEquipmentFocusRequest()).toBeNull()
  })
})
