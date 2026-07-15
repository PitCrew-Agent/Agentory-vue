import { ref } from 'vue'
import { defineStore } from 'pinia'

const COMPLETION_TOAST_DURATION = 6200

function createAssistantSessionId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (character) =>
        (Number(character) ^ ((Math.random() * 16) >> (Number(character) / 4))).toString(16),
      )
}

export const useAssistantStore = defineStore('assistant', () => {
  const completionToast = ref(null)
  const isLoading = ref(false)
  const messages = ref([])
  const openConversationRequest = ref(0)
  const sessionId = ref(createAssistantSessionId())
  let activeRequestController = null
  let activeRequestId = 0
  let completionToastExpiresAt = 0
  let completionToastRemaining = COMPLETION_TOAST_DURATION
  let completionToastTimer = 0
  let typingMessageId = ''
  let typingQueue = ''
  let typingTimer = 0

  function beginRequest() {
    activeRequestController?.abort()
    activeRequestController = typeof AbortController === 'undefined' ? null : new AbortController()
    activeRequestId += 1
    isLoading.value = true

    return {
      id: activeRequestId,
      signal: activeRequestController?.signal,
    }
  }

  function isRequestActive(requestId) {
    return isLoading.value && requestId === activeRequestId
  }

  function completeRequest(requestId) {
    if (requestId !== activeRequestId) {
      return false
    }

    activeRequestController = null
    isLoading.value = false
    return true
  }

  function cancelActiveRequest() {
    activeRequestController?.abort()
    activeRequestController = null
    activeRequestId += 1
    isLoading.value = false
  }

  function updateMessage(messageId, updater) {
    messages.value = messages.value.map((message) =>
      message.id === messageId ? updater(message) : message,
    )
  }

  function flushTypingQueue({ immediate = false } = {}) {
    if (typeof window !== 'undefined') {
      window.clearTimeout(typingTimer)
    }
    typingTimer = 0

    if (!typingQueue || !typingMessageId) {
      return
    }

    const characterCount = immediate
      ? typingQueue.length
      : Math.min(
          typingQueue.length,
          typingQueue.length > 240 ? 32 : typingQueue.length > 80 ? 18 : 8,
        )
    const nextText = typingQueue.slice(0, characterCount)

    typingQueue = typingQueue.slice(characterCount)
    updateMessage(typingMessageId, (message) => ({
      ...message,
      text: `${message.text ?? ''}${nextText}`,
    }))

    if (typingQueue && typeof window !== 'undefined') {
      typingTimer = window.setTimeout(flushTypingQueue, 18)
    }
  }

  function appendStreamingText(messageId, text) {
    if (!text) {
      return
    }

    if (typingMessageId !== messageId) {
      if (typeof window !== 'undefined') {
        window.clearTimeout(typingTimer)
      }
      typingMessageId = messageId
      typingQueue = ''
      typingTimer = 0
    }

    typingQueue += text

    if (!typingTimer) {
      flushTypingQueue()
    }
  }

  function clearTypingQueue() {
    if (typeof window !== 'undefined') {
      window.clearTimeout(typingTimer)
    }
    typingMessageId = ''
    typingQueue = ''
    typingTimer = 0
  }

  function dismissCompletionToast() {
    if (typeof window !== 'undefined') {
      window.clearTimeout(completionToastTimer)
    }
    completionToastTimer = 0
    completionToast.value = null
    completionToastExpiresAt = 0
    completionToastRemaining = COMPLETION_TOAST_DURATION
  }

  function scheduleCompletionToastDismiss(duration) {
    if (typeof window !== 'undefined') {
      window.clearTimeout(completionToastTimer)
    }

    completionToastRemaining = duration
    completionToastTimer = 0

    if (typeof window === 'undefined') {
      return
    }

    completionToastExpiresAt = Date.now() + duration
    completionToastTimer = window.setTimeout(dismissCompletionToast, duration)
  }

  function showCompletionToast({ equipmentId = '', status = 'success' } = {}) {
    dismissCompletionToast()
    completionToast.value = {
      equipmentId,
      id: `assistant-completion-${Date.now()}`,
      sessionId: sessionId.value,
      status,
    }

    scheduleCompletionToastDismiss(COMPLETION_TOAST_DURATION)
  }

  function pauseCompletionToast() {
    if (!completionToast.value || !completionToastTimer) {
      return
    }

    completionToastRemaining = Math.max(0, completionToastExpiresAt - Date.now())

    if (typeof window !== 'undefined') {
      window.clearTimeout(completionToastTimer)
    }
    completionToastTimer = 0
  }

  function resumeCompletionToast() {
    if (!completionToast.value || completionToastTimer) {
      return
    }

    if (completionToastRemaining <= 0) {
      dismissCompletionToast()
      return
    }

    scheduleCompletionToastDismiss(completionToastRemaining)
  }

  function requestConversationOpen() {
    openConversationRequest.value += 1
  }

  function startNewSession() {
    clearTypingQueue()
    sessionId.value = createAssistantSessionId()
    messages.value = []
  }

  function reset() {
    cancelActiveRequest()
    clearTypingQueue()
    dismissCompletionToast()
    messages.value = []
    openConversationRequest.value = 0
    sessionId.value = createAssistantSessionId()
  }

  return {
    appendStreamingText,
    beginRequest,
    cancelActiveRequest,
    clearTypingQueue,
    completeRequest,
    completionToast,
    dismissCompletionToast,
    flushTypingQueue,
    isLoading,
    isRequestActive,
    messages,
    openConversationRequest,
    pauseCompletionToast,
    requestConversationOpen,
    reset,
    resumeCompletionToast,
    sessionId,
    showCompletionToast,
    startNewSession,
    updateMessage,
  }
})
