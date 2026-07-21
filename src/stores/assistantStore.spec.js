import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAssistantStore } from '@/stores/assistantStore'

describe('useAssistantStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps an active conversation in the store until it is explicitly reset', () => {
    const store = useAssistantStore()

    store.messages = [{ id: 'assistant-1', role: 'assistant', text: 'answer' }]
    store.isLoading = true

    expect(useAssistantStore().messages).toHaveLength(1)
    expect(useAssistantStore().isLoading).toBe(true)

    store.reset()

    expect(store.messages).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  it('shows a completion toast and dismisses it automatically', () => {
    const store = useAssistantStore()

    store.showCompletionToast({ equipmentId: 'EQP-A01' })

    expect(store.completionToast.equipmentId).toBe('EQP-A01')
    expect(store.completionToast.status).toBe('success')

    vi.advanceTimersByTime(6200)

    expect(store.completionToast).toBeNull()
  })

  it('pauses the completion toast timer while the toast is hovered', () => {
    const store = useAssistantStore()

    store.showCompletionToast({ equipmentId: 'EQP-A01' })
    vi.advanceTimersByTime(2200)
    store.pauseCompletionToast()
    vi.advanceTimersByTime(8000)

    expect(store.completionToast).not.toBeNull()

    store.resumeCompletionToast()
    vi.advanceTimersByTime(3999)
    expect(store.completionToast).not.toBeNull()

    vi.advanceTimersByTime(1)
    expect(store.completionToast).toBeNull()
  })

  it('keeps streamed text updates outside a component lifecycle', () => {
    const store = useAssistantStore()
    store.messages = [{ id: 'assistant-1', role: 'assistant', text: '' }]

    store.appendStreamingText('assistant-1', 'background response')
    store.flushTypingQueue({ immediate: true })

    expect(store.messages[0].text).toBe('background response')
  })

  it('keeps a request active across views and cancels it when the store resets', () => {
    const store = useAssistantStore()
    const request = store.beginRequest()

    expect(store.isRequestActive(request.id)).toBe(true)
    expect(request.signal.aborted).toBe(false)

    store.reset()

    expect(request.signal.aborted).toBe(true)
    expect(store.isRequestActive(request.id)).toBe(false)
  })

  it('keeps one equipment context for each conversation session', () => {
    const store = useAssistantStore()

    store.startNewSession({ equipmentId: 'EQP-A05' })

    expect(store.sessionEquipmentId).toBe('EQP-A05')

    store.startNewSession({ equipmentId: 'EQP-B03' })

    expect(store.sessionEquipmentId).toBe('EQP-B03')

    store.reset()

    expect(store.sessionEquipmentId).toBe('')
  })
})
