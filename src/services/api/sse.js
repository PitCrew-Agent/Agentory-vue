import { createApiResponseError } from '@/services/api/apiResponse'

const DEFAULT_RECONNECT_DELAY_MS = 1_500

async function createStreamError(response) {
  let payload

  try {
    payload = await response.json()
  } catch {
    return createApiResponseError(null, response.status)
  }

  return createApiResponseError(payload, response.status)
}

async function consumeSseResponse(response, onEvent) {
  if (!response.body) {
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let eventDataLines = []
  let eventId = ''
  let eventName = ''

  function flushEvent() {
    if (!eventDataLines.length) {
      eventId = ''
      eventName = ''
      return
    }

    onEvent?.({
      data: eventDataLines.join('\n'),
      event: eventName || 'message',
      id: eventId,
    })

    eventDataLines = []
    eventId = ''
    eventName = ''
  }

  function processLine(line) {
    const normalizedLine = line.replace(/\r$/, '')

    if (!normalizedLine) {
      flushEvent()
      return
    }

    if (normalizedLine.startsWith(':')) {
      return
    }

    const separatorIndex = normalizedLine.indexOf(':')
    const field = separatorIndex >= 0 ? normalizedLine.slice(0, separatorIndex) : normalizedLine
    const rawValue = separatorIndex >= 0 ? normalizedLine.slice(separatorIndex + 1) : ''
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

    if (field === 'data') {
      eventDataLines.push(value)
    } else if (field === 'event') {
      eventName = value
    } else if (field === 'id') {
      eventId = value
    }
  }

  while (true) {
    const { done, value } = await reader.read()

    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    lines.forEach(processLine)

    if (done) {
      if (buffer) {
        processLine(buffer)
      }
      flushEvent()
      return
    }
  }
}

export function subscribeToSse({
  getUrl,
  headers = {},
  onError,
  onEvent,
  reconnectDelayMs = DEFAULT_RECONNECT_DELAY_MS,
}) {
  if (typeof fetch === 'undefined' || typeof AbortController === 'undefined') {
    return () => {}
  }

  const controller = new AbortController()
  let reconnectTimer = 0
  let isStopped = false

  async function connect() {
    try {
      const response = await fetch(getUrl(), {
        credentials: 'include',
        headers,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw await createStreamError(response)
      }

      await consumeSseResponse(response, onEvent)
    } catch (error) {
      if (!isStopped && error?.name !== 'AbortError') {
        onError?.(error)
      }
    }

    if (!isStopped) {
      reconnectTimer = window.setTimeout(connect, reconnectDelayMs)
    }
  }

  void connect()

  return () => {
    isStopped = true
    window.clearTimeout(reconnectTimer)
    controller.abort()
  }
}
