import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import { i18n } from '@/features/i18n'

import AssistantPanel from './AssistantPanel.vue'

function mountAssistantPanel(options = {}) {
  i18n.global.locale.value = 'ko'

  return mount(AssistantPanel, {
    props: {
      historyItems: [{ id: 'history-1', title: '최근 대화' }],
      messages: [],
      quickCommands: [],
      ...options.props,
    },
    global: {
      plugins: [i18n],
    },
  })
}

describe('AssistantPanel', () => {
  it('renders loose markdown table rows without a separator line', async () => {
    const wrapper = mountAssistantPanel({
      props: {
        messages: [
          {
            id: 'assistant-1',
            createdAt: '2026-07-10T08:12:00.000Z',
            role: 'assistant',
            text: [
              '## 조치(권장)',
              '전체 24시간 로그를 확인하세요.',
              '',
              '표 (요약 근거)',
              '| 항목 | 값 |',
              '| ERR-402 count / first / last | 155 / 2026-07-10T07:53:59.423038Z / 2026-07-10T08:07:29.435603Z |',
              '| Temperature (observed 샘플 범위) | 59.7 - 63.2 °C |',
              '| Pressure (observed 샘플 범위) | 15.9 - 42.9 (로그 단위) |',
            ].join('\n'),
          },
        ],
      },
    })

    await wrapper.find('.assistant-panel__history-select').trigger('click')
    await nextTick()

    const headers = wrapper.findAll('.assistant-panel__answer-table th').map((cell) => cell.text())
    const cells = wrapper.findAll('.assistant-panel__answer-table td').map((cell) => cell.text())

    expect(headers).toEqual(['항목', '값'])
    expect(cells).toContain('ERR-402 count / first / last')
    expect(cells).toContain('155 / 2026-07-10T07:53:59.423038Z / 2026-07-10T08:07:29.435603Z')
    expect(cells).toContain('Pressure (observed 샘플 범위)')
    expect(cells).toContain('15.9 - 42.9 (로그 단위)')
  })

  it('confirms before emitting delete-history', async () => {
    const wrapper = mountAssistantPanel()

    await wrapper.find('.assistant-panel__history-delete').trigger('click')
    expect(wrapper.emitted('delete-history')).toBeUndefined()
    expect(wrapper.find('.assistant-panel__delete-dialog').exists()).toBe(true)

    await wrapper.find('.assistant-panel__delete-confirm').trigger('click')

    expect(wrapper.emitted('delete-history')).toEqual([
      [
        {
          id: 'history-1',
          title: '최근 대화',
        },
      ],
    ])
  })

  it('moves a recommended question into the composer without sending it', async () => {
    const wrapper = mountAssistantPanel({
      props: {
        quickCommands: [{ id: 'quick-1', label: '압력 이력을 확인해줘' }],
      },
    })

    await wrapper.find('.assistant-panel__quick button').trigger('click')
    await nextTick()

    expect(wrapper.find('textarea').element.value).toBe('압력 이력을 확인해줘')
    expect(wrapper.emitted('send-message')).toBeUndefined()
  })

  it('keeps one loading animation while the recommendation rows stay blurred', () => {
    const wrapper = mountAssistantPanel({
      props: {
        isQuickCommandLoading: true,
      },
    })

    expect(wrapper.findAll('.assistant-panel__quick-dots span')).toHaveLength(3)
    expect(wrapper.findAll('.assistant-panel__quick-loading-row')).toHaveLength(3)
    expect(wrapper.findAll('.assistant-panel__quick-loading-row span')).toHaveLength(0)
    expect(wrapper.find('.assistant-panel__quick-list--loading').exists()).toBe(true)
  })

  it('uses the header itself as the shared widget divider', () => {
    const wrapper = mountAssistantPanel()

    expect(wrapper.find('.assistant-panel__header').exists()).toBe(true)
    expect(wrapper.find('.assistant-panel__divider').exists()).toBe(false)
  })

  it('reports chat and history view changes to the dashboard', async () => {
    const wrapper = mountAssistantPanel({
      props: {
        messages: [{ id: 'user-1', role: 'user', text: '설비 상태 확인' }],
      },
    })

    await wrapper.setProps({ openConversationRequest: 1 })
    await nextTick()
    expect(wrapper.emitted('view-change')).toContainEqual(['chat'])

    await wrapper.find('.assistant-panel__nav-button').trigger('click')
    expect(wrapper.emitted('view-change')).toContainEqual(['history'])
  })
})
