import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import LineChart from '@/features/dashboard/components/LineChart.vue'
import { i18n } from '@/features/i18n'

const chart = {
  band: { half: 2.5, lsl: 1, usl: 10 },
  max: 12,
  min: 0,
  points: [
    // prettier-ignore
    { bandLower: 3, bandUpper: 8, center: 5.5, statusTone: 'normal', time: '12:00', timestamp: '2026-07-10T12:00:00', value: 3 },
    // prettier-ignore
    { bandLower: 3, bandUpper: 8, center: 5.5, statusTone: 'warning', time: '12:01', timestamp: '2026-07-10T12:01:00', value: 6 },
    // prettier-ignore
    { bandLower: null, bandUpper: null, center: null, statusTone: 'danger', time: '12:02', timestamp: '2026-07-10T12:02:00', value: 9 },
  ],
  precision: 1,
  thresholds: { lcl: 3, lsl: 1, ucl: 8, usl: 10 },
  title: 'Temperature(C)',
  unit: 'C',
}

const rfPowerChart = {
  band: { half: 0.08, lsl: 2.45, usl: 3.05 },
  max: 3.05,
  min: 2.45,
  points: [
    // prettier-ignore
    { bandLower: 2.71, bandUpper: 2.87, center: 2.79, statusTone: 'normal', time: '12:00', timestamp: '2026-07-10T12:00:00', value: 2.75 },
  ],
  precision: 3,
  thresholds: { lcl: 2.71, lsl: 2.45, ucl: 2.87, usl: 3.05 },
  title: 'RF Power(kW)',
  unit: 'kW',
}

function mountLineChart(chartData, props = {}) {
  i18n.global.locale.value = 'ko'

  return mount(LineChart, {
    props: { chart: chartData, ...props },
    global: {
      plugins: [createPinia(), i18n],
      stubs: {
        ChartCanvas: {
          name: 'ChartCanvas',
          props: ['data', 'options', 'type'],
          template: '<div data-test="chart-canvas-stub"></div>',
        },
      },
    },
  })
}

describe('LineChart', () => {
  it('passes status point styles to Chart.js', () => {
    const wrapper = mountLineChart(chart)
    const chartCanvas = wrapper.findComponent({ name: 'ChartCanvas' })
    const metricDataset = chartCanvas.props('data').datasets[0]

    expect(chartCanvas.props('type')).toBe('line')
    expect(metricDataset.pointStyle).toEqual(['circle', 'triangle', 'rectRot'])
  })

  it('renders a dynamic SPC band, center line, and hard limits with streaming controls', () => {
    const wrapper = mountLineChart(chart)
    const datasets = wrapper.findComponent({ name: 'ChartCanvas' }).props('data').datasets
    const options = wrapper.findComponent({ name: 'ChartCanvas' }).props('options')
    const bandDatasets = datasets.filter((dataset) => dataset.kind === 'band')
    const hardLimitDatasets = datasets.filter((dataset) => dataset.kind === 'threshold')
    const bandFill = bandDatasets.find((dataset) => dataset.fill === '-1')

    // ±3σ 밴드(하단/상단/중심) 3개 + 하드리밋 상·하한 2개
    expect(bandDatasets).toHaveLength(3)
    expect(hardLimitDatasets).toHaveLength(2)
    expect(bandFill.label).toBe('정상 밴드 ±3σ')
    expect(bandFill.data.map((point) => point.y)).toEqual([8, 8, null])
    expect(hardLimitDatasets[0].data.every((point) => point.y === 10)).toBe(true)
    // 밴드는 측정값 선과 함께 부드럽게 이동하고, 하드리밋 수평선만 애니메이션을 끈다.
    expect(options.animations.x.duration({ dataset: { kind: 'threshold' } })).toBe(0)
    expect(options.animations.x.duration({ dataset: { kind: 'band' } })).toBe(360)
    expect(options.animations.x.duration({ dataset: { kind: 'metric' } })).toBe(360)
    expect(options.scales.x.ticks.count).toBe(6)
    expect(wrapper.find('input[type="range"]').exists()).toBe(true)
    expect(wrapper.find('.line-chart__live').text()).toBe('LIVE')
  })

  it('uses the hard-limit range for the Chart.js y axis', () => {
    const wrapper = mountLineChart(rfPowerChart)
    const options = wrapper.findComponent({ name: 'ChartCanvas' }).props('options')

    expect(options.scales.y.min).toBe(2.45)
    expect(options.scales.y.max).toBe(3.05)
  })

  it('requests the recent live range when the LIVE button is pressed', async () => {
    const wrapper = mountLineChart(chart, { isLiveRange: false })

    await wrapper.find('.line-chart__live').trigger('click')

    expect(wrapper.emitted('return-live')).toHaveLength(1)
  })
})
