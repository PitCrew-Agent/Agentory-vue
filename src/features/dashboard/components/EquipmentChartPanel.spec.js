import { describe, expect, it, vi } from 'vitest'

import { mount } from '@vue/test-utils'

import EquipmentChartPanel from '@/features/dashboard/components/EquipmentChartPanel.vue'
import { i18n } from '@/features/i18n'

const chart = {
  metricId: 'temperature',
  points: [],
  title: '온도',
  unit: '°C',
}
const metrics = [
  { id: 'gasFlow', labelKey: 'metrics.gasFlow', unit: 'sccm' },
  { id: 'temperature', labelKey: 'metrics.temperature', unit: '°C' },
]

function mountPanel(range = { end: '', minutes: 10, mode: 'live', start: '' }) {
  i18n.global.locale.value = 'ko'

  return mount(EquipmentChartPanel, {
    props: { chart, metrics, range, selectedMetricId: 'temperature' },
    attachTo: document.body,
    global: {
      plugins: [i18n],
      stubs: {
        LineChart: {
          emits: ['return-live'],
          template:
            '<button data-test="line-chart-live" @click="$emit(\'return-live\')">LIVE</button>',
        },
      },
    },
  })
}

function createRect({ height, left, top, width }) {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
    x: left,
    y: top,
    toJSON() {},
  }
}

describe('EquipmentChartPanel', () => {
  it('기본 조회 범위를 최근 10분으로 표시한다', () => {
    const wrapper = mountPanel()

    expect(wrapper.get('[data-test="chart-range-trigger"]').text()).toContain('최근 10분')

    wrapper.unmount()
  })

  it('최근 조회 범위를 선택하면 재조회 이벤트를 전달한다', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-test="chart-range-trigger"]').trigger('click')
    const options = wrapper.findAll('.chart-panel__recent-options button')
    await options[1].trigger('click')

    expect(wrapper.emitted('request-range')).toEqual([[{ mode: 'live', minutes: 30 }]])

    wrapper.unmount()
  })

  it('그래프 헤더에서 표시할 센서 데이터를 선택한다', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-test="chart-metric-trigger"]').trigger('click')
    await wrapper.get('[data-test="chart-metric-option-gasFlow"]').trigger('click')

    expect(wrapper.emitted('update:selectedMetricId')).toEqual([['gasFlow']])

    wrapper.unmount()
  })

  it('브라우저 기본 입력 대신 자체 날짜와 시간 선택기를 표시한다', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-test="chart-range-trigger"]').trigger('click')

    expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(false)

    await wrapper.get('[data-test="chart-range-start"]').trigger('click')

    expect(document.body.querySelector('.chart-date-time-field__picker')).not.toBeNull()

    wrapper.unmount()
  })

  it('하단 공간이 부족하면 날짜와 시간 선택기를 위쪽으로 배치한다', async () => {
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function getBoundingClientRect() {
        if (this.classList?.contains('chart-date-time-field__trigger')) {
          return createRect({ height: 34, left: 100, top: 720, width: 160 })
        }

        if (this.classList?.contains('chart-date-time-field__picker')) {
          return createRect({ height: 352, left: 0, top: 0, width: 268 })
        }

        return createRect({ height: 0, left: 0, top: 0, width: 0 })
      })
    const wrapper = mountPanel()

    try {
      await wrapper.get('[data-test="chart-range-trigger"]').trigger('click')
      await wrapper.get('[data-test="chart-range-start"]').trigger('click')
      await new Promise((resolve) => window.setTimeout(resolve, 0))

      const picker = document.body.querySelector('.chart-date-time-field__picker')

      expect(Number.parseFloat(picker.style.top)).toBeLessThan(720)
    } finally {
      wrapper.unmount()
      rectSpy.mockRestore()
    }
  })

  it('LIVE 요청을 상위 대시보드로 전달한다', async () => {
    const wrapper = mountPanel({
      end: '2026-07-13T10:00:00.000Z',
      minutes: 10,
      mode: 'custom',
      start: '2026-07-13T09:00:00.000Z',
    })

    await wrapper.get('[data-test="line-chart-live"]').trigger('click')

    expect(wrapper.emitted('return-live')).toHaveLength(1)

    wrapper.unmount()
  })
})
