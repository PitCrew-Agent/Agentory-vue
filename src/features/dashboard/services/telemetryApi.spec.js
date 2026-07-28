import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createEmptyEquipment,
  fetchEquipmentStatuses,
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

  it('상태 폴링은 전 설비 상세 대신 상태 목록 API만 조회한다', async () => {
    const statuses = [{ equipment_id: 'EQP-A01', status: 'warning' }]
    http.get.mockResolvedValue(statuses)

    await expect(fetchEquipmentStatuses()).resolves.toEqual(statuses)
    expect(http.get).toHaveBeenCalledOnce()
    expect(http.get).toHaveBeenCalledWith('/api/v1/telemetry/equipment/status')
  })

  it('상세의 밴드 규격과 시점별 center로 동적 SPC 밴드를 구성한다', async () => {
    http.get.mockImplementation((url) => {
      if (url.endsWith('/series')) {
        return Promise.resolve([
          { rf_power: 2.8, rf_power_center: 2.79, timestamp: '2026-07-28T16:33:00Z' },
          { rf_power: 2.83, rf_power_center: 2.81, timestamp: '2026-07-28T16:34:00Z' },
          { rf_power: 2.78, rf_power_center: null, timestamp: '2026-07-28T16:35:00Z' },
        ])
      }

      return Promise.resolve({
        bands: { rf_power: { half: 0.08, lsl: 2.45, usl: 3.05 } },
        process_type: 'Etching',
        status: '양호',
      })
    })

    const equipment = await fetchEquipmentTelemetry('EQP-A05', createEmptyEquipment())
    const chart = equipment.charts.rfPower

    expect(chart.band).toEqual({ half: 0.08, lsl: 2.45, usl: 3.05 })
    expect(chart.points[0].center).toBe(2.79)
    expect(chart.points[0].bandLower).toBeCloseTo(2.71, 5)
    expect(chart.points[0].bandUpper).toBeCloseTo(2.87, 5)
    // 마이그레이션 이전(과거) 행은 center가 null → 해당 구간 밴드 생략
    expect(chart.points[2].center).toBeNull()
    expect(chart.points[2].bandLower).toBeNull()
    // 하드리밋을 y축 범위로 사용
    expect(chart.min).toBeLessThan(2.45)
    expect(chart.max).toBeGreaterThan(3.05)
  })

  it('점 상태를 시점별 밴드 기준으로 판정한다(드리프트 반영)', async () => {
    http.get.mockImplementation((url) => {
      if (url.endsWith('/series')) {
        return Promise.resolve([
          // center 2.85로 드리프트 → 밴드 [2.77, 2.93]. 값 2.75는 정적 관리한계(2.71~2.87) 안이지만 밴드 아래 → 경고
          { rf_power: 2.75, rf_power_center: 2.85, timestamp: '2026-07-28T16:33:00Z' },
          // 밴드 안 → 정상
          { rf_power: 2.85, rf_power_center: 2.85, timestamp: '2026-07-28T16:34:00Z' },
          // 하드리밋(2.45) 이탈 → 위험
          { rf_power: 2.4, rf_power_center: 2.85, timestamp: '2026-07-28T16:35:00Z' },
        ])
      }

      return Promise.resolve({
        bands: { rf_power: { half: 0.08, lsl: 2.45, usl: 3.05 } },
        process_type: 'Etching',
        status: '양호',
      })
    })

    const equipment = await fetchEquipmentTelemetry('EQP-A05', createEmptyEquipment())
    const tones = equipment.charts.rfPower.points.map((point) => point.statusTone)

    expect(tones).toEqual(['warning', 'normal', 'danger'])
  })

  it('밴드 필드 미배포 시 정적 관리한계로 밴드를 대체한다', async () => {
    http.get.mockImplementation((url) =>
      Promise.resolve(
        url.endsWith('/series')
          ? [{ rf_power: 2.8, timestamp: '2026-07-28T16:33:00Z' }]
          : { process_type: 'Etching', status: '양호' },
      ),
    )

    const equipment = await fetchEquipmentTelemetry('EQP-A05', createEmptyEquipment())
    const chart = equipment.charts.rfPower

    // Etching rfPower 관리한계(lcl 2.71, ucl 2.87) → half 0.08, center 2.79
    expect(chart.band).toEqual({ half: 0.08, lsl: 2.45, usl: 3.05 })
    expect(chart.points[0].center).toBeCloseTo(2.79, 5)
    expect(chart.points[0].bandLower).toBeCloseTo(2.71, 5)
  })

  it('uses the backend Deposition profile for sensor status and chart thresholds', async () => {
    http.get.mockImplementation((url) => {
      if (url.endsWith('/series')) {
        return Promise.resolve([
          {
            gas_flow: 400,
            pressure: 30,
            rf_power: 1.8,
            temperature: 46,
            timestamp: '2026-07-20T12:00:00Z',
          },
        ])
      }

      return Promise.resolve({
        gas_flow: 400,
        pressure: 30,
        process_type: 'Deposition',
        rf_power: 1.8,
        status: 'warning',
        temperature: 46,
        updated_at: '2026-07-20T12:00:00Z',
      })
    })

    const equipment = await fetchEquipmentTelemetry('EQP-B01', createEmptyEquipment())
    const temperatureMetric = equipment.metrics.find((metric) => metric.id === 'temperature')

    expect(temperatureMetric.statusTone).toBe('warning')
    expect(equipment.charts.temperature.thresholds).toEqual({
      lcl: 44.7,
      lsl: 43.5,
      ucl: 45.3,
      usl: 46.5,
    })
  })
})
