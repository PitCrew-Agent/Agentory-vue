import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import LineChart from '@/features/dashboard/components/LineChart.vue'
import { i18n } from '@/features/i18n'

const chart = {
  max: 12,
  min: 0,
  points: [
    { statusTone: 'normal', time: '12:00', timestamp: '2026-07-10T12:00:00', value: 3 },
    { statusTone: 'warning', time: '12:01', timestamp: '2026-07-10T12:01:00', value: 6 },
    { statusTone: 'danger', time: '12:02', timestamp: '2026-07-10T12:02:00', value: 9 },
  ],
  precision: 1,
  thresholds: { lcl: 3, lsl: 1, ucl: 8, usl: 10 },
  title: 'Temperature(C)',
  unit: 'C',
}

const rfPowerChart = {
  max: 3.05,
  min: 2.45,
  points: [
    { statusTone: 'normal', time: '12:00', timestamp: '2026-07-10T12:00:00', value: 2.75 },
  ],
  precision: 3,
  thresholds: { lcl: 2.71, lsl: 2.45, ucl: 2.87, usl: 3.05 },
  title: 'RF Power(kW)',
  unit: 'kW',
}

function mountLineChart(chartData) {
  i18n.global.locale.value = 'ko'

  return mount(LineChart, {
    props: { chart: chartData },
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

  it('provides Chart.js threshold datasets and streaming controls', () => {
    const wrapper = mountLineChart(chart)
    const datasets = wrapper.findComponent({ name: 'ChartCanvas' }).props('data').datasets

    expect(datasets.filter((dataset) => dataset.kind === 'threshold')).toHaveLength(4)
    expect(wrapper.find('input[type="range"]').exists()).toBe(true)
    expect(wrapper.find('.line-chart__live').text()).toBe('LIVE')
  })

  it('uses the actual RF power range for the Chart.js y axis', () => {
    const wrapper = mountLineChart(rfPowerChart)
    const options = wrapper.findComponent({ name: 'ChartCanvas' }).props('options')

    expect(options.scales.y.min).toBe(2.45)
    expect(options.scales.y.max).toBe(3.05)
  })
})
