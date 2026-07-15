import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'

import { i18n } from '@/features/i18n'
import WorkLogPanel from '@/features/workLog/components/WorkLogPanel.vue'

describe('WorkLogPanel', () => {
  it('keeps the application root free from dark mode image filters', () => {
    const previousTheme = document.documentElement.dataset.theme
    document.documentElement.dataset.theme = 'dark'

    const wrapper = mount(WorkLogPanel, {
      global: {
        plugins: [createPinia(), i18n],
      },
      props: {
        groups: [],
      },
    })

    expect(getComputedStyle(document.documentElement).filter).not.toContain('invert')

    wrapper.unmount()

    if (previousTheme) {
      document.documentElement.dataset.theme = previousTheme
    } else {
      delete document.documentElement.dataset.theme
    }
  })

  it('대응 계획 생성 중 작업 로그 모달 위에 로딩 오버레이를 표시한다', () => {
    i18n.global.locale.value = 'ko'

    const wrapper = mount(WorkLogPanel, {
      global: {
        plugins: [createPinia(), i18n],
      },
      props: {
        groups: [],
        isIncidentPlanLoading: true,
      },
    })

    expect(wrapper.find('[data-test="work-log-create-modal"]').exists()).toBe(true)
    expect(wrapper.find('.work-log-panel__incident-loading').exists()).toBe(true)
    expect(wrapper.find('.work-log-panel__incident-workflow').exists()).toBe(true)
    expect(wrapper.find('.work-log-panel__incident-loader').exists()).toBe(false)
    expect(wrapper.find('#work-log-create-title').text()).toBe('작업 로그 작성')
    expect(wrapper.find('.work-log-panel__incident-plan').exists()).toBe(false)
    expect(wrapper.find('[data-test="work-log-form-plan"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="work-log-form-record"]').exists()).toBe(true)
  })

  it('목록에서 작업 계획은 보기 동작으로 제공하고 작업 내용은 별도 열에 표시한다', async () => {
    i18n.global.locale.value = 'ko'

    const wrapper = mount(WorkLogPanel, {
      global: {
        plugins: [createPinia(), i18n],
      },
      props: {
        groups: [
          {
            date: '2026-07-15',
            id: '2026-07-15',
            logs: [
              {
                date: '2026-07-15',
                id: 1,
                operator: '김억산',
                status: 'complete',
                time: '09:30',
                workPlan: '1. 압력 센서를 격리합니다.\n2. 밸브 누설 여부를 점검합니다.',
                workRecord: '압력 센서 교체 및 재가동 확인 완료',
                workType: '수리점검',
              },
            ],
          },
        ],
      },
    })

    expect(wrapper.text()).toContain('작업 계획')
    expect(wrapper.text()).toContain('작업 내용')
    expect(wrapper.text()).toContain('계획 보기')
    expect(wrapper.text()).toContain('압력 센서 교체 및 재가동 확인 완료')
    expect(wrapper.text()).not.toContain('밸브 누설 여부를 점검합니다.')

    await wrapper.get('.work-log-panel__plan-trigger').trigger('click')

    expect(wrapper.get('[data-test="work-log-plan-preview"]').text()).toContain(
      '밸브 누설 여부를 점검합니다.',
    )

    wrapper.unmount()
  })
})
