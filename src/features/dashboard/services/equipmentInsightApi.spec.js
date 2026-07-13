import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchEquipmentAlarmSummary,
  fetchEquipmentSensorSeries,
} from '@/features/dashboard/services/equipmentInsightApi'
import { http } from '@/services/api/http'

vi.mock('@/services/api/http', () => ({
  http: {
    get: vi.fn(),
  },
}))

describe('equipmentInsightApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('선택 설비의 센서 시계열을 조회한다', async () => {
    http.get.mockResolvedValue([
      {
        gas_flow: 606,
        pressure: 42.1,
        rf_power: 2.79,
        temperature: 60.1,
        timestamp: '2026-07-13T09:00:00Z',
      },
    ])

    const series = await fetchEquipmentSensorSeries('EQP-A05')

    expect(http.get).toHaveBeenCalledWith('/api/v1/telemetry/equipment/EQP-A05/series', {
      params: {},
    })
    expect(series[0]).toMatchObject({
      gasFlow: 606,
      rfPower: 2.79,
      temperature: 60.1,
    })
  })

  it('알람 코드별 집계를 상태와 함께 정규화한다', async () => {
    http.get.mockResolvedValue([
      {
        alarm_code: 'ERR-402',
        count: 12,
        first_seen: '2026-07-13T08:00:00Z',
        last_seen: '2026-07-13T09:00:00Z',
        severity: '위험',
      },
    ])

    const summary = await fetchEquipmentAlarmSummary('EQP-A05')

    expect(summary[0]).toMatchObject({
      alarmCode: 'ERR-402',
      count: 12,
      metrics: [
        { id: 'temperature', label: '온도', order: 0 },
        { id: 'pressure', label: '압력', order: 1 },
      ],
      statusTone: 'danger',
    })
  })
})
