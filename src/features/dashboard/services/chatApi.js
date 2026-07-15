import { AUTH_SESSION_EXPIRED_EVENT } from '@/features/auth/constants/authEvents'
import { translate } from '@/features/i18n'
import { buildApiUrl, http } from '@/services/api/http'
import { getAcceptLanguage } from '@/features/i18n/services/localePreference'

function normalizeCitation(citation, index) {
  return {
    dataAsOf: citation.data_as_of ?? '',
    docId: citation.doc_id ?? `document-${index + 1}`,
    snippet: citation.snippet ?? '',
  }
}

function normalizeReasoningStep(step, index) {
  return {
    id: step.step ?? index + 1,
    observation: step.observation ?? null,
    thought: step.thought ?? '',
    tool: step.tool ?? '',
    toolInput: step.tool_input ?? null,
  }
}

function normalizeSuggestedQuestions(questions = []) {
  return questions
    .map((question) => String(question ?? '').trim())
    .filter(Boolean)
    .slice(0, 4)
}

function normalizeChatTrace(trace = {}) {
  if (!trace || typeof trace !== 'object') {
    return {
      citations: [],
      reasoningSteps: [],
      suggestedQuestions: [],
    }
  }

  const citations = trace.citations ?? trace.sources ?? []
  const reasoningSteps = trace.reasoning_steps ?? trace.reasoningSteps ?? trace.steps ?? []
  const suggestedQuestions = trace.suggested_questions ?? trace.suggestedQuestions ?? []

  return {
    citations: Array.isArray(citations) ? citations.map(normalizeCitation) : [],
    reasoningSteps: Array.isArray(reasoningSteps) ? reasoningSteps.map(normalizeReasoningStep) : [],
    suggestedQuestions: normalizeSuggestedQuestions(suggestedQuestions),
  }
}

function normalizeChatSessionSummary(session = {}, index = 0) {
  const sessionId = session.session_id ?? session.sessionId ?? session.id ?? ''
  const equipmentId = session.equipment_id ?? session.equipmentId ?? ''
  const title = String(session.title ?? '').trim()
  const messageCount = Number(session.message_count ?? session.messageCount ?? 0)

  return {
    createdAt: session.created_at ?? session.createdAt ?? '',
    equipmentId,
    id: sessionId || `chat-session-${index + 1}`,
    messageCount: Number.isFinite(messageCount) ? messageCount : 0,
    preview: equipmentId
      ? `${equipmentId} · ${translate('assistant.messageCount', { count: messageCount || 0 })}`
      : translate('assistant.messageCount', { count: messageCount || 0 }),
    sessionId,
    title: title || translate('assistant.conversation', { index: index + 1 }),
    updatedAt:
      session.last_message_at ??
      session.lastMessageAt ??
      session.created_at ??
      session.createdAt ??
      '',
  }
}

function normalizeChatMessage(message = {}, index = 0) {
  const role = String(message.role ?? '').toLowerCase() === 'user' ? 'user' : 'assistant'
  const trace = normalizeChatTrace(message.trace)
  const messageId = message.message_id ?? message.messageId ?? message.id ?? `${role}-${index + 1}`

  return {
    citations: trace.citations,
    createdAt: message.created_at ?? message.createdAt ?? '',
    id: `history-${messageId}`,
    reasoningSteps: trace.reasoningSteps,
    role,
    suggestedQuestions: trace.suggestedQuestions,
    text: message.content ?? message.message ?? message.answer ?? '',
  }
}

function normalizeChatSessionDetail(detail = {}) {
  const messages = Array.isArray(detail.messages) ? detail.messages : []

  return {
    createdAt: detail.created_at ?? detail.createdAt ?? '',
    equipmentId: detail.equipment_id ?? detail.equipmentId ?? '',
    messages: messages.map(normalizeChatMessage),
    sessionId: detail.session_id ?? detail.sessionId ?? '',
    title: detail.title ?? '',
  }
}

function parseSuggestedQuestionsFromAnswer(answer = '') {
  const trimmedAnswer = String(answer ?? '').trim()

  if (!trimmedAnswer) {
    return []
  }

  try {
    const parsedAnswer = JSON.parse(trimmedAnswer)
    const parsedQuestions = parsedAnswer.suggested_questions ?? parsedAnswer.suggestedQuestions

    if (Array.isArray(parsedQuestions)) {
      return normalizeSuggestedQuestions(parsedQuestions)
    }
  } catch {
    // 추천 질문 전용 요청에서 JSON 대신 목록형 답변이 오는 경우 아래에서 다시 해석한다.
  }

  return normalizeSuggestedQuestions(
    trimmedAnswer
      .split('\n')
      .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim())
      .filter((line) => line.endsWith('?') || line.endsWith('까') || line.endsWith('줘')),
  )
}

function parseStreamPayload(payload) {
  const trimmedPayload = String(payload ?? '').trim()

  if (!trimmedPayload) {
    return null
  }

  if (trimmedPayload === '[DONE]') {
    return { type: 'done' }
  }

  try {
    return JSON.parse(trimmedPayload)
  } catch {
    return {
      content: trimmedPayload,
      type: 'delta',
    }
  }
}

function dispatchSessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT))
  }
}

function getErrorPayloadMessage(payload) {
  if (!payload) {
    return ''
  }

  if (typeof payload === 'string') {
    return payload
  }

  if (Array.isArray(payload.detail)) {
    return payload.detail
      .map((item) => item.msg ?? item.message)
      .filter(Boolean)
      .join('\n')
  }

  return payload.detail ?? payload.message ?? payload.error ?? ''
}

async function createStreamRequestError(response) {
  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')
  const error = new Error(getErrorPayloadMessage(payload) || 'Chat stream request failed')

  error.status = response.status
  error.data = payload

  if (response.status === 401) {
    dispatchSessionExpired()
  }

  return error
}

const STREAM_AGENT_KEYS = {
  data_analysis: 'assistant.agents.data_analysis',
  knowledge: 'assistant.agents.knowledge',
  rediagnosis: 'assistant.agents.rediagnosis',
  supervisor: 'assistant.agents.supervisor',
}

const STREAM_TOOL_KEYS = {
  get_alarm_history: 'assistant.tools.get_alarm_history',
  get_equipment_metadata: 'assistant.tools.get_equipment_metadata',
  get_sensor_logs: 'assistant.tools.get_sensor_logs',
  search_manuals: 'assistant.tools.search_manuals',
}

function formatStreamAgent(agent) {
  const agentKey = String(agent ?? '').trim()

  return STREAM_AGENT_KEYS[agentKey] ? translate(STREAM_AGENT_KEYS[agentKey]) : agentKey
}

function formatStreamTool(tool) {
  const toolKey = String(tool ?? '').trim()

  if (!toolKey) {
    return ''
  }

  return STREAM_TOOL_KEYS[toolKey]
    ? translate(STREAM_TOOL_KEYS[toolKey])
    : toolKey.replaceAll('_', ' ')
}

function createReasoningStep(data, index = 0) {
  const eventType = data.type ?? data.event ?? ''

  if (eventType === 'thought') {
    return {
      id: data.step ?? index + 1,
      observation: null,
      thought: data.content ?? '',
      tool: '',
      toolInput: null,
    }
  }

  if (eventType === 'action') {
    return {
      id: data.step ?? index + 1,
      observation: null,
      thought: data.reason ?? '',
      tool: data.tool ?? '',
      toolInput: data.tool_input ?? null,
    }
  }

  if (eventType === 'observation') {
    return {
      id: data.step ?? index + 1,
      observation: data.content ?? null,
      thought: '',
      tool: data.tool ?? '',
      toolInput: null,
    }
  }

  return normalizeReasoningStep(data, index)
}

function createStatusEvent(data, eventType) {
  const agentLabel = formatStreamAgent(data.agent)
  const toolLabel = formatStreamTool(data.tool ?? data.tool_name)

  if (eventType.includes('thought')) {
    return {
      detail: '',
      label: translate('assistant.stream.thought', { agent: agentLabel || 'Tory' }),
      name: agentLabel,
      type: 'thought',
    }
  }

  if (eventType.includes('action')) {
    return {
      detail: '',
      label: translate('assistant.stream.action', {
        tool: toolLabel || translate('assistant.stream.fallbackData'),
      }),
      name: agentLabel,
      type: 'action',
    }
  }

  if (eventType.includes('observation')) {
    return {
      detail: '',
      label: translate('assistant.stream.observation', {
        tool: toolLabel || translate('assistant.stream.fallbackResult'),
      }),
      name: agentLabel,
      type: 'observation',
    }
  }

  if (eventType.includes('ground')) {
    return {
      detail: '',
      label: translate('assistant.stream.grounding'),
      name: agentLabel,
      type: 'grounding',
    }
  }

  if (eventType.includes('suggest')) {
    return {
      detail: '',
      label: translate('assistant.stream.suggest'),
      name: agentLabel,
      type: 'suggest',
    }
  }

  return {
    detail: '',
    label: translate('assistant.stream.answer'),
    name: agentLabel,
    type: eventType || 'status',
  }
}

function normalizeStreamEvent(rawEvent) {
  const eventName = String(rawEvent?.event ?? '').toLowerCase()
  const rawData = rawEvent?.data ?? rawEvent

  if (eventName === 'ping') {
    return null
  }

  const data =
    typeof rawData === 'string' ? parseStreamPayload(rawData) : (rawData ?? { type: eventName })

  if (!data) {
    return null
  }

  const nestedData =
    data.data && typeof data.data === 'object'
      ? {
          ...data.data,
          agent: data.agent,
          event: data.event ?? eventName,
          name: data.name,
          node: data.node,
          tool: data.tool,
          type: data.type ?? data.event ?? eventName,
        }
      : data
  const eventType = String(
    nestedData.type ?? nestedData.event ?? nestedData.kind ?? eventName ?? '',
  ).toLowerCase()
  const deltaText =
    nestedData.delta ??
    nestedData.answer_delta ??
    nestedData.answerDelta ??
    nestedData.token ??
    nestedData.chunk?.content ??
    nestedData.output ??
    nestedData.content ??
    nestedData.text
  const isAnswerDeltaEvent =
    eventType === 'answer' ||
    eventName === 'answer' ||
    eventType.includes('delta') ||
    eventType.includes('token') ||
    eventType.includes('chunk') ||
    eventType === 'message'

  if (eventType === 'error' || eventName === 'error') {
    return {
      code: nestedData.code ?? '',
      kind: 'error',
      message: nestedData.message ?? translate('assistant.responseError'),
    }
  }

  if (deltaText && isAnswerDeltaEvent) {
    return {
      kind: 'delta',
      text: String(deltaText),
    }
  }

  if (eventType === 'thought' || eventType === 'action' || eventType === 'observation') {
    return {
      ...createStatusEvent(nestedData, eventType),
      kind: 'status',
      reasoningStep: createReasoningStep(nestedData),
    }
  }

  if (
    nestedData.answer ||
    nestedData.citations ||
    nestedData.reasoning_steps ||
    nestedData.suggested_questions
  ) {
    return {
      answer: nestedData.answer ?? '',
      citations: (nestedData.citations ?? []).map(normalizeCitation),
      kind: 'final',
      reasoningSteps: (nestedData.reasoning_steps ?? []).map(normalizeReasoningStep),
      suggestedQuestions: normalizeSuggestedQuestions(nestedData.suggested_questions),
    }
  }

  if (eventType === 'done' || eventType.includes('done') || eventType.includes('end')) {
    return { kind: 'done' }
  }

  const statusEvent = createStatusEvent(nestedData, eventType)

  return {
    ...statusEvent,
    kind: 'status',
  }
}

function applyStreamEventToResult(result, event) {
  if (!event) {
    return
  }

  if (event.kind === 'delta') {
    result.answer += event.text
    return
  }

  if (event.kind === 'status' && event.reasoningStep) {
    result.reasoningSteps = [...result.reasoningSteps, event.reasoningStep]
    return
  }

  if (event.kind === 'final') {
    result.answer = event.answer || result.answer
    result.citations = event.citations?.length ? event.citations : result.citations
    result.reasoningSteps = event.reasoningSteps?.length
      ? event.reasoningSteps
      : result.reasoningSteps
    result.suggestedQuestions = event.suggestedQuestions?.length
      ? event.suggestedQuestions
      : result.suggestedQuestions
  }
}

function createEmptyChatResult() {
  return {
    answer: '',
    citations: [],
    reasoningSteps: [],
    suggestedQuestions: [],
  }
}

function emitStreamPayload(rawEvent, result, onEvent) {
  const event = normalizeStreamEvent(rawEvent)

  if (!event) {
    return
  }

  applyStreamEventToResult(result, event)
  onEvent?.(event, result)
}

export async function sendChatQuery({
  equipmentId = '',
  includeAnswerSuggestions = false,
  message,
  sessionId,
}) {
  const response = await http.post('/api/v1/chat/query', {
    equipment_id: equipmentId || null,
    message,
    session_id: sessionId,
  })
  const suggestedQuestions = normalizeSuggestedQuestions(response.suggested_questions)
  const answer = response.answer ?? ''

  return {
    answer,
    citations: (response.citations ?? []).map(normalizeCitation),
    reasoningSteps: (response.reasoning_steps ?? []).map(normalizeReasoningStep),
    suggestedQuestions:
      suggestedQuestions.length || !includeAnswerSuggestions
        ? suggestedQuestions
        : parseSuggestedQuestionsFromAnswer(answer),
  }
}

export async function fetchChatSessions() {
  const sessions = await http.get('/api/v1/chat/sessions')

  return Array.isArray(sessions) ? sessions.map(normalizeChatSessionSummary) : []
}

export async function fetchChatSessionDetail(sessionId) {
  const detail = await http.get(`/api/v1/chat/sessions/${encodeURIComponent(sessionId)}`)

  return normalizeChatSessionDetail(detail)
}

export function deleteChatSession(sessionId) {
  return http.remove(`/api/v1/chat/sessions/${encodeURIComponent(sessionId)}`)
}

export async function streamChatQuery({ equipmentId = '', message, onEvent, sessionId, signal }) {
  const response = await fetch(buildApiUrl('/api/v1/chat/stream'), {
    body: JSON.stringify({
      equipment_id: equipmentId || null,
      message,
      session_id: sessionId,
    }),
    credentials: 'include',
    headers: {
      Accept: 'text/event-stream, application/x-ndjson, application/json',
      'Accept-Language': getAcceptLanguage(),
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal,
  })

  if (!response.ok) {
    throw await createStreamRequestError(response)
  }

  const result = createEmptyChatResult()

  if (!response.body) {
    const payload = await response.text()
    emitStreamPayload({ data: payload }, result, onEvent)
    return result
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let sseEventName = ''
  let sseDataLines = []

  function flushSseEvent() {
    const eventName = sseEventName
    const dataLines = sseDataLines

    sseEventName = ''
    sseDataLines = []

    if (!dataLines.length || eventName.toLowerCase() === 'ping') {
      return
    }

    emitStreamPayload(
      {
        data: dataLines.join('\n'),
        event: eventName,
      },
      result,
      onEvent,
    )
  }

  function processLine(line) {
    const normalizedLine = line.replace(/\r$/, '')

    if (!normalizedLine.trim()) {
      flushSseEvent()
      return
    }

    if (
      normalizedLine.startsWith(':') ||
      normalizedLine.startsWith('id:') ||
      normalizedLine.startsWith('retry:')
    ) {
      return
    }

    if (normalizedLine.startsWith('event:')) {
      sseEventName = normalizedLine.slice(6).trim()
      return
    }

    if (normalizedLine.startsWith('data:')) {
      sseDataLines.push(normalizedLine.slice(5).trimStart())
      return
    }

    emitStreamPayload({ data: normalizedLine }, result, onEvent)
  }

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    while (buffer.includes('\n')) {
      const lineBreakIndex = buffer.indexOf('\n')
      const line = buffer.slice(0, lineBreakIndex)
      buffer = buffer.slice(lineBreakIndex + 1)

      processLine(line)
    }
  }

  buffer += decoder.decode()

  if (buffer.trim()) {
    processLine(buffer)
  }

  flushSseEvent()

  return result
}
