import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'

import LineChart from '@/features/dashboard/components/LineChart.vue'

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

describe('LineChart', () => {
  it('renders warning and danger points at chart coordinates', () => {
    const wrapper = mount(LineChart, {
      props: { chart },
    })
    const alertPoints = wrapper.findAll('.line-chart__point-alert')

    expect(alertPoints).toHaveLength(2)
    expect(alertPoints[0].attributes('cx')).not.toBeUndefined()
    expect(alertPoints[0].attributes('cy')).not.toBeUndefined()
    expect(alertPoints[0].classes()).toContain('line-chart__point-alert--warning')
    expect(alertPoints[1].classes()).toContain('line-chart__point-alert--danger')
  })

  it('renders rail controls and aligns vertical grid lines to chart points', () => {
    const wrapper = mount(LineChart, {
      props: { chart },
    })
    const verticalGridLines = wrapper
      .findAll('.line-chart__grid line')
      .filter((line) => line.attributes('x1') === line.attributes('x2'))

    expect(wrapper.find('.line-chart__footer').exists()).toBe(true)
    expect(verticalGridLines).toHaveLength(chart.points.length)
  })

  it('uses the actual decimal value range for RF power charts', () => {
    const wrapper = mount(LineChart, {
      props: { chart: rfPowerChart },
    })
    const pointY = Number(wrapper.find('.line-chart__point').attributes('cy'))

    expect(pointY).toBeGreaterThan(120)
    expect(pointY).toBeLessThan(150)
  })
})
