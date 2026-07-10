import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import AssistantPanel from './AssistantPanel.vue'

function mountAssistantPanel(options = {}) {
  return mount(AssistantPanel, {
    props: {
      historyItems: [{ id: 'history-1', title: '최근 대화' }],
      messages: [],
      quickCommands: [],
      ...options.props,
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

  it('emits delete-history from the history delete action', async () => {
    const wrapper = mountAssistantPanel()

    await wrapper.find('.assistant-panel__history-delete').trigger('click')

    expect(wrapper.emitted('delete-history')).toEqual([
      [
        {
          id: 'history-1',
          title: '최근 대화',
        },
      ],
    ])
  })
})
