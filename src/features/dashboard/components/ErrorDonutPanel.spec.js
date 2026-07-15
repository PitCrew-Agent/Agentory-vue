import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ErrorDonutPanel from '@/features/dashboard/components/ErrorDonutPanel.vue'
import { i18n } from '@/features/i18n'

const fetchEquipmentAlarmSensorSummary = vi.hoisted(() => vi.fn())

vi.mock('@/features/dashboard/services/equipmentInsightApi', () => ({
  fetchEquipmentAlarmSensorSummary,
}))

class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback
  }

  disconnect() {}

  observe() {
    this.callback([{ contentRect: { height: 220, width: 320 } }])
  }
}

describe('ErrorDonutPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    fetchEquipmentAlarmSensorSummary.mockResolvedValue([
      { count: 4, metricId: 'temperature', metricLabelKey: 'metrics.temperature' },
      { count: 3, metricId: 'pressure', metricLabelKey: 'metrics.pressure' },
      { count: 2, metricId: 'rfPower', metricLabelKey: 'metrics.rfPower' },
      { count: 1, metricId: 'gasFlow', metricLabelKey: 'metrics.gasFlow' },
    ])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('비동기 데이터가 도착한 뒤 도넛 조각별 연결선을 생성한다', async () => {
    const wrapper = mount(ErrorDonutPanel, {
      props: { equipmentId: 'EQP-A01' },
      global: {
        plugins: [createPinia(), i18n],
      },
    })

    await flushPromises()

    const lines = wrapper.findAll('.error-donut-panel__callout-lines polyline')
    const groups = wrapper.findAll('.error-donut-panel__callout-lines g')

    expect(lines).toHaveLength(4)
    expect(lines.every((line) => !line.attributes('points').includes('NaN'))).toBe(true)
    expect(
      lines.every((line) => {
        const [start, end] = line
          .attributes('points')
          .split(' ')
          .map((point) => point.split(',').map(Number))

        return start[0] === end[0] || start[1] === end[1]
      }),
    ).toBe(true)
    expect(groups.every((group) => group.attributes('style').includes('--callout-length'))).toBe(
      true,
    )

    wrapper.unmount()
  })
})
