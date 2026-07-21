import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import EquipmentAnalysisPanel from '@/features/dashboard/components/EquipmentAnalysisPanel.vue'
import { i18n } from '@/features/i18n'

function createChart(value, thresholds = {}) {
  return {
    points: [{ timestamp: '2026-07-21T08:00:00+09:00', value }],
    thresholds: {
      lcl: 597,
      lsl: 540,
      ucl: 615,
      usl: 660,
      ...thresholds,
    },
  }
}

describe('EquipmentAnalysisPanel', () => {
  it('대시보드가 제공한 실시간 시계열로 분석 값을 표시한다', () => {
    const wrapper = mount(EquipmentAnalysisPanel, {
      props: {
        charts: { gasFlow: createChart(606) },
        equipmentId: 'EQP-A01',
      },
      global: { plugins: [i18n] },
    })

    expect(wrapper.find('.equipment-analysis-panel__metrics').exists()).toBe(true)
    expect(wrapper.findAll('.equipment-analysis-panel__value > strong')[0].text()).toBe('606')
  })

  it('실시간 시계열이 갱신되면 별도 요청 없이 현재값을 즉시 반영한다', async () => {
    const wrapper = mount(EquipmentAnalysisPanel, {
      props: {
        charts: { gasFlow: createChart(606) },
        equipmentId: 'EQP-A01',
      },
      global: { plugins: [i18n] },
    })

    await wrapper.setProps({ charts: { gasFlow: createChart(610) } })

    expect(wrapper.findAll('.equipment-analysis-panel__value > strong')[0].text()).toBe('610')
  })

  it('설비 공정에 맞춰 전달된 센서 기준치를 사용한다', () => {
    const wrapper = mount(EquipmentAnalysisPanel, {
      props: {
        charts: {
          gasFlow: createChart(400, { lcl: 392.5, lsl: 350, ucl: 407.5, usl: 450 }),
        },
        equipmentId: 'EQP-B01',
      },
      global: { plugins: [i18n] },
    })

    expect(wrapper.find('.equipment-analysis-panel__scale span:nth-child(2)').text()).toContain(
      '393 - 408',
    )
  })
})
