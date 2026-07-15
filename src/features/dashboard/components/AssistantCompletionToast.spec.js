import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import AssistantCompletionToast from '@/features/dashboard/components/AssistantCompletionToast.vue'
import { i18n } from '@/features/i18n'

describe('AssistantCompletionToast', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme
  })

  it('shows a distinct assistant completion message and opens the conversation', async () => {
    const toast = {
      equipmentId: 'EQP-A01',
      id: 'assistant-completion-1',
      sessionId: 'session-1',
      status: 'success',
    }
    const wrapper = mount(AssistantCompletionToast, {
      global: {
        plugins: [i18n],
      },
      props: { toast },
    })

    expect(wrapper.get('[data-test="assistant-completion-toast"]').text()).toContain('Tory')
    expect(wrapper.get('[data-test="assistant-completion-toast"]').text()).toContain('EQP-A01')

    await wrapper.get('[data-test="assistant-completion-toast-open"]').trigger('click')

    expect(wrapper.get('[data-test="assistant-completion-toast-open"] img').exists()).toBe(true)
    expect(wrapper.emitted('open')).toEqual([[toast]])

    await wrapper.get('[data-test="assistant-completion-toast"]').trigger('mouseenter')
    await wrapper.get('[data-test="assistant-completion-toast"]').trigger('mouseleave')

    expect(wrapper.emitted('pause')).toHaveLength(1)
    expect(wrapper.emitted('resume')).toHaveLength(1)
  })

  it('does not apply an inversion filter to the dark theme root', () => {
    document.documentElement.dataset.theme = 'dark'

    mount(AssistantCompletionToast, {
      global: {
        plugins: [i18n],
      },
      props: {
        toast: {
          equipmentId: 'EQP-A01',
          id: 'assistant-completion-2',
          sessionId: 'session-2',
          status: 'success',
        },
      },
    })

    expect(getComputedStyle(document.documentElement).filter).not.toBe('invert(1)')
  })
})
