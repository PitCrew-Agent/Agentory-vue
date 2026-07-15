import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchEquipmentAlarmSensorSummary,
  fetchEquipmentRepairHistory,
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

    const series = await fetchEquipmentSensorSeries('EQP-A05', { start: '2026-07-13' })

    expect(http.get).toHaveBeenCalledWith('/api/v1/telemetry/equipment/EQP-A05/series', {
      params: { start: '2026-07-13T00:00:00' },
    })
    expect(series[0]).toMatchObject({
      gasFlow: 606,
      rfPower: 2.79,
      temperature: 60.1,
    })
  })

  it('센서별 알람 집계를 도넛 차트 데이터로 정규화한다', async () => {
    http.get.mockResolvedValue([
      {
        count: 12,
        first_seen: '2026-07-13T08:00:00Z',
        last_seen: '2026-07-13T09:00:00Z',
        metric: 'rf_power',
      },
    ])

    const summary = await fetchEquipmentAlarmSensorSummary('EQP-A05')

    expect(http.get).toHaveBeenCalledWith('/api/v1/telemetry/equipment/EQP-A05/alarms/sensors', {
      params: {},
    })
    expect(summary[0]).toMatchObject({
      count: 12,
      metricId: 'rfPower',
      metricLabelKey: 'metrics.rfPower',
    })
  })

  it('설비별 수리 이력 커서 페이지를 정규화한다', async () => {
    http.get.mockResolvedValue({
      has_more: true,
      items: [
        {
          alarm_code_before: 'ERR-402',
          equipment_id: 'EQP-A05',
          id: 42,
          note: '냉각 라인 교체',
          repaired_at: '2026-07-13T10:15:00+09:00',
          repaired_by: 7,
          repaired_by_name: '김억산',
        },
      ],
      next_cursor: 'next-page',
    })

    const page = await fetchEquipmentRepairHistory('EQP-A05', { before: 'cursor', limit: 5 })

    expect(http.get).toHaveBeenCalledWith('/api/v1/admin/equipment/EQP-A05/repairs', {
      params: { before: 'cursor', limit: 5 },
    })
    expect(page).toMatchObject({
      hasMore: true,
      items: [
        {
          alarmCode: 'ERR-402',
          repairedByName: '김억산',
        },
      ],
      nextCursor: 'next-page',
    })
  })
})
