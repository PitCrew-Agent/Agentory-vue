import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import RollingMetricValue from '@/features/dashboard/components/RollingMetricValue.vue'

describe('RollingMetricValue', () => {
  it('변경된 측정값을 자리 단위 슬롯으로 갱신한다', async () => {
    const wrapper = mount(RollingMetricValue, {
      props: { value: '60.18' },
    })

    expect(wrapper.attributes('aria-label')).toBe('60.18')
    expect(wrapper.findAll('.rolling-metric-value__slot')).toHaveLength(4)

    await wrapper.setProps({ value: '60.28' })

    expect(wrapper.attributes('aria-label')).toBe('60.28')
    expect(wrapper.text()).toBe('60.28')
  })
})
