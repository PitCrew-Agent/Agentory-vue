import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createEmptyEquipment,
  fetchEquipmentTelemetry,
} from '@/features/dashboard/services/telemetryApi'
import { http } from '@/services/api/http'

vi.mock('@/services/api/http', () => ({
  http: {
    get: vi.fn(),
  },
}))

describe('telemetryApi', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('기본 조회 범위를 현재 시각 기준 최근 10분으로 설정한다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-13T10:00:00.000Z'))

    http.get.mockImplementation((url) => {
      if (url.endsWith('/series')) {
        return Promise.resolve([])
      }

      return Promise.resolve({
        last_inspection_at: '2026-07-13T09:45:00+09:00',
        manager_name: '김억산',
        process_type: 'Etching',
        status: '양호',
        updated_at: '2026-07-13T10:00:00+09:00',
      })
    })

    const equipment = await fetchEquipmentTelemetry('EQP-A05', createEmptyEquipment())

    expect(http.get).toHaveBeenCalledWith('/api/v1/telemetry/equipment/EQP-A05/series', {
      params: { start: '2026-07-13T09:50:00.000Z' },
    })
    expect(equipment).toMatchObject({
      inspectedAt: '2026-07-13 09:45',
      inspectionStartedAt: '2026-07-13T09:45:00+09:00',
    })
  })

  it('사용자가 지정한 시작과 종료 시각을 시계열 요청에 전달한다', async () => {
    http.get.mockImplementation((url) => {
      if (url.endsWith('/series')) {
        return Promise.resolve([])
      }

      return Promise.resolve({
        last_inspection_at: '2026-07-13',
        process_type: 'Etching',
        status: '양호',
      })
    })

    const equipment = await fetchEquipmentTelemetry('EQP-A05', createEmptyEquipment(), {
      end: '2026-07-13T10:00:00+09:00',
      start: '2026-07-13T09:45:00+09:00',
    })

    expect(http.get).toHaveBeenCalledWith('/api/v1/telemetry/equipment/EQP-A05/series', {
      params: {
        end: '2026-07-13T10:00:00+09:00',
        start: '2026-07-13T09:45:00+09:00',
      },
    })
    expect(equipment.inspectedAt).toBe('2026-07-13')
  })

  it('날짜만 지정한 시작값은 해당 날짜 자정으로 정규화한다', async () => {
    http.get.mockImplementation((url) =>
      Promise.resolve(
        url.endsWith('/series')
          ? []
          : { last_inspection_at: '2026-07-13', process_type: 'Etching', status: '양호' },
      ),
    )

    await fetchEquipmentTelemetry('EQP-A05', createEmptyEquipment(), {
      start: '2026-07-13',
    })

    expect(http.get).toHaveBeenCalledWith('/api/v1/telemetry/equipment/EQP-A05/series', {
      params: { start: '2026-07-13T00:00:00' },
    })
  })

  it('센서 상세와 시계열을 동시에 요청한다', async () => {
    let resolveDetail
    let resolveSeries

    http.get.mockImplementation((url) => {
      if (url.endsWith('/series')) {
        return new Promise((resolve) => {
          resolveSeries = resolve
        })
      }

      return new Promise((resolve) => {
        resolveDetail = resolve
      })
    })

    const telemetryPromise = fetchEquipmentTelemetry('EQP-A05', createEmptyEquipment())

    expect(http.get).toHaveBeenCalledTimes(2)
    expect(resolveDetail).toBeTypeOf('function')
    expect(resolveSeries).toBeTypeOf('function')

    resolveDetail({ process_type: 'Etching', status: '?묓샇' })
    resolveSeries([])

    await expect(telemetryPromise).resolves.toBeTruthy()
  })
})
