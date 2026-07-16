import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DashboardAlertToast from '@/features/dashboard/components/DashboardAlertToast.vue'
import { i18n } from '@/features/i18n'

describe('DashboardAlertToast', () => {
  it('대기열의 앞 두 알림을 계단식 스택으로 렌더링한다', async () => {
    const toasts = [
      {
        code: 'WRN-701',
        id: 10,
        message: '첫 번째 알림',
        occurredAt: '2026-07-16 15:00',
        toastKey: 'toast-10',
        tone: 'warning',
      },
      {
        code: 'ERR-301',
        id: 11,
        message: '두 번째 알림',
        occurredAt: '2026-07-16 15:01',
        toastKey: 'toast-11',
        tone: 'danger',
      },
      {
        code: 'WRN-702',
        id: 12,
        message: '대기 중인 알림',
        occurredAt: '2026-07-16 15:02',
        toastKey: 'toast-12',
        tone: 'warning',
      },
    ]
    const wrapper = mount(DashboardAlertToast, {
      global: { plugins: [i18n] },
      props: { toasts },
    })

    const renderedToasts = wrapper.findAll('.dashboard-alert-toast')

    expect(renderedToasts).toHaveLength(2)
    expect(wrapper.text()).toContain('첫 번째 알림')
    expect(wrapper.text()).toContain('두 번째 알림')
    expect(wrapper.text()).not.toContain('대기 중인 알림')

    await wrapper.get('.dashboard-alert-toast-stack').trigger('mouseenter')
    await wrapper.get('.dashboard-alert-toast-stack').trigger('mouseleave')

    expect(wrapper.emitted('pause')).toHaveLength(1)
    expect(wrapper.emitted('resume')).toHaveLength(1)
  })
})
