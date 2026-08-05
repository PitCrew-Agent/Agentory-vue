import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'

import DashboardCalendarPicker from '@/features/dashboard/components/DashboardCalendarPicker.vue'
import { i18n } from '@/features/i18n'

function mountCalendar(props = {}) {
  i18n.global.locale.value = 'ko'

  return mount(DashboardCalendarPicker, {
    props: {
      ariaLabel: '날짜 선택',
      dataTestPrefix: 'notification',
      dates: ['2026-07-01'],
      ...props,
    },
    global: {
      plugins: [i18n],
    },
  })
}

describe('DashboardCalendarPicker', () => {
  it('keeps unavailable dates disabled in the default mode', async () => {
    const wrapper = mountCalendar()

    await wrapper.get('[data-test="notification-calendar-toggle"]').trigger('click')

    expect(wrapper.find('[data-test="notification-calendar-date-2026-07-02"]').exists()).toBe(false)
  })

  it('allows the notification calendar to select a date without prefetched history', async () => {
    const wrapper = mountCalendar({ selectAnyDate: true })

    await wrapper.get('[data-test="notification-calendar-toggle"]').trigger('click')
    await wrapper.get('[data-test="notification-calendar-date-2026-07-02"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([['2026-07-02']])
  })
})
