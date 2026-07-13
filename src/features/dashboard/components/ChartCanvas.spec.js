import { Chart } from 'chart.js'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ChartCanvas from '@/features/dashboard/components/ChartCanvas.vue'

describe('ChartCanvas', () => {
  it('대시보드 위젯에서 사용하는 차트 컨트롤러를 등록한다', () => {
    mount(ChartCanvas, {
      props: {
        data: { datasets: [], labels: [] },
        type: 'doughnut',
      },
    })

    expect(Chart.registry.getController('line')).toBeTruthy()
    expect(Chart.registry.getController('bar')).toBeTruthy()
    expect(Chart.registry.getController('doughnut')).toBeTruthy()
    expect(Chart.registry.getController('scatter')).toBeTruthy()
  })
})
