<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import chatBackIcon from '@/assets/icons/dashboard/chat-back.svg'
import sendIcon from '@/assets/icons/dashboard/send-up.png'

const props = defineProps({
  historyItems: {
    type: Array,
    default: () => [],
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  isQuickCommandLoading: {
    type: Boolean,
    default: false,
  },
  messages: {
    type: Array,
    default: () => [],
  },
  quickCommands: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['select-history', 'send-message'])
const activePanelView = ref('history')
const inputMessage = ref('')
const messageListRef = ref(null)
const thinkingTextMap = ref({})
const thinkingTypingTimers = new Map()

const isHistoryView = computed(() => activePanelView.value === 'history')

const historyListItems = computed(() =>
  props.historyItems.map((item, index) => {
    const date = createMessageDate(item.updatedAt ?? item.createdAt)

    return {
      id: item.id ?? `history-${index + 1}`,
      meta: item.updatedAt || item.createdAt ? `${formatMessageDate(date)} ${formatMessageTime(date)}` : '',
      preview: item.preview ?? item.lastMessage ?? '',
      title: item.title ?? item.name ?? `대화 ${index + 1}`,
      value: item,
    }
  }),
)

const quickCommandItems = computed(() =>
  props.quickCommands.map((command, index) => ({
    id: command.id ?? `quick-command-${index + 1}`,
    label: command.label ?? command.message ?? command,
    message: command.message ?? command.label ?? command,
  })),
)

const shouldShowQuickCommands = computed(
  () => props.isQuickCommandLoading || quickCommandItems.value.length > 0,
)

const messageItems = computed(() => {
  let previousDateLabel = ''

  return props.messages.map((message) => {
    const date = createMessageDate(message.createdAt)
    const dateLabel = formatMessageDate(date)
    const shouldShowDateLabel = dateLabel !== previousDateLabel

    previousDateLabel = dateLabel

    const isAssistantAnswer = message.role === 'assistant' && message.tone !== 'error'

    return {
      ...message,
      answerSections: isAssistantAnswer ? parseAssistantAnswer(message.text) : [],
      dateLabel: shouldShowDateLabel ? dateLabel : '',
      sentTime: formatMessageTime(date),
    }
  })
})

const hasStreamingMessage = computed(() => props.messages.some((message) => message.isStreaming))

const canSubmit = computed(() => inputMessage.value.trim().length > 0 && !props.isLoading)

const messageScrollSignature = computed(() =>
  props.messages
    .map(
      (message) =>
        `${message.id}:${message.text?.length ?? 0}:${message.streamEvents?.length ?? 0}:${message.isStreaming}`,
    )
    .join('|'),
)

function getPreviousStreamEvents(events = []) {
  const previousEvents = events.slice(0, -1).filter((event) => event.type !== 'start')

  return previousEvents
    .filter((event, index, eventList) => event.label !== eventList[index - 1]?.label)
    .slice(-7)
}

function getThinkingEvent(message) {
  return message.streamEvents?.at(-1)
}

function getThinkingEventLabel(message) {
  return getThinkingEvent(message)?.label ?? 'Tory가 생각 중입니다'
}

function getThinkingTypingKey(message) {
  const event = getThinkingEvent(message)

  if (!message.isStreaming || !event) {
    return ''
  }

  return `${message.id}:${event.id ?? event.label}`
}

function getThinkingDisplayText(message) {
  const typingKey = getThinkingTypingKey(message)

  return typingKey ? (thinkingTextMap.value[typingKey] ?? '') : getThinkingEventLabel(message)
}

function setThinkingText(typingKey, text) {
  thinkingTextMap.value = {
    ...thinkingTextMap.value,
    [typingKey]: text,
  }
}

function animateThinkingText(typingKey, label) {
  if (!typingKey || thinkingTypingTimers.has(typingKey)) {
    return
  }

  let textIndex = 0

  setThinkingText(typingKey, '')

  function tick() {
    textIndex += 1
    setThinkingText(typingKey, label.slice(0, textIndex))

    if (textIndex < label.length) {
      thinkingTypingTimers.set(typingKey, window.setTimeout(tick, 34))
      return
    }

    thinkingTypingTimers.delete(typingKey)
  }

  thinkingTypingTimers.set(typingKey, window.setTimeout(tick, 34))
}

function syncThinkingTypewriter() {
  const activeTypingKeys = new Set()

  props.messages.forEach((message) => {
    const typingKey = getThinkingTypingKey(message)

    if (!typingKey) {
      return
    }

    activeTypingKeys.add(typingKey)

    if (!(typingKey in thinkingTextMap.value)) {
      animateThinkingText(typingKey, getThinkingEventLabel(message))
    }
  })

  thinkingTypingTimers.forEach((timer, typingKey) => {
    if (!activeTypingKeys.has(typingKey)) {
      window.clearTimeout(timer)
      thinkingTypingTimers.delete(typingKey)
    }
  })

  const nextTextMap = Object.fromEntries(
    Object.entries(thinkingTextMap.value).filter(([typingKey]) => activeTypingKeys.has(typingKey)),
  )

  if (Object.keys(nextTextMap).length !== Object.keys(thinkingTextMap.value).length) {
    thinkingTextMap.value = nextTextMap
  }
}

function createMessageDate(value) {
  const date = new Date(value ?? Date.now())

  return Number.isNaN(date.getTime()) ? new Date() : date
}

function formatMessageDate(date) {
  return date.toLocaleDateString('ko-KR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatMessageTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function cleanAnswerTitle(value) {
  return String(value ?? '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\*\*|\*\*$/g, '')
    .replace(/[:：]\s*$/, '')
    .trim()
}

function createAnswerSection(title = '답변 요약') {
  return {
    bodyLines: [],
    items: [],
    tableLines: [],
    tables: [],
    title,
  }
}

function getAnswerSectionTone(title, index) {
  return index === 0 ? 'summary' : 'default'
}

function normalizeAnswerBody(lines) {
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function splitAnswerParagraphs(value) {
  return String(value ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function createAnswerBlock({ body = '', index, items = [], tables = [], title, tone }) {
  return {
    body,
    id: `answer-section-${index + 1}-${title}`,
    items,
    tables,
    title,
    tone: tone ?? getAnswerSectionTone(title, index),
  }
}

function splitDefaultAnswerSection(section) {
  const paragraphs = splitAnswerParagraphs(section.body)
  const nextSections = []

  if (paragraphs[0]) {
    nextSections.push(
      createAnswerBlock({
        body: paragraphs[0],
        index: nextSections.length,
        title: '핵심 요약',
        tone: 'summary',
      }),
    )
  }

  if (section.items.length) {
    nextSections.push(
      createAnswerBlock({
        index: nextSections.length,
        items: section.items,
        title: '확인 항목',
        tone: 'action',
      }),
    )
  }

  if (section.tables.length) {
    nextSections.push(
      createAnswerBlock({
        index: nextSections.length,
        tables: section.tables,
        title: '데이터 표',
        tone: 'default',
      }),
    )
  }

  if (paragraphs.length > 1) {
    nextSections.push(
      createAnswerBlock({
        body: paragraphs.slice(1).join('\n\n'),
        index: nextSections.length,
        title: '상세 내용',
        tone: 'default',
      }),
    )
  }

  return nextSections.length
    ? nextSections
    : [createAnswerBlock({ body: section.body, index: 0, items: section.items, title: '핵심 요약', tone: 'summary' })]
}

function parseAssistantAnswer(text = '') {
  const trimmedText = String(text ?? '').trim()

  if (!trimmedText) {
    return []
  }

  const sections = []
  let currentSection = createAnswerSection()

  function normalizeMarkdownTableLine(line) {
    return String(line ?? '')
      .trim()
      .replace(/^\s{0,3}>\s?/, '')
      .replace(/^[-*]\s+(?=\|)/, '')
      .trim()
  }

  function cleanMarkdownCell(value) {
    return String(value ?? '')
      .replace(/^\*\*|\*\*$/g, '')
      .replace(/`/g, '')
      .trim()
  }

  function splitMarkdownTableRow(line) {
    return normalizeMarkdownTableLine(line)
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cleanMarkdownCell)
  }

  function isMarkdownTableSeparator(line) {
    const cells = splitMarkdownTableRow(line)

    return cells.length > 1 && cells.every((cell) => /^:?-{2,}:?$/.test(cell))
  }

  function isMarkdownTableLine(line) {
    return line.includes('|') && splitMarkdownTableRow(line).length > 1
  }

  function parseMarkdownTable(lines) {
    const tableLines = lines.map(normalizeMarkdownTableLine).filter(Boolean)
    const separatorIndex = tableLines.findIndex(
      (line, index) => index > 0 && isMarkdownTableSeparator(line),
    )

    if (separatorIndex < 1) {
      return null
    }

    const headers = splitMarkdownTableRow(tableLines[separatorIndex - 1])
    const rows = tableLines
      .slice(separatorIndex + 1)
      .map(splitMarkdownTableRow)
      .filter((row) => row.some(Boolean))
      .map((row) => headers.map((_, index) => row[index] ?? ''))

    if (!headers.length || !rows.length) {
      return null
    }

    return {
      headers,
      id: `answer-table-${currentSection.tables.length + 1}-${headers.join('-')}`,
      rows,
    }
  }

  function flushTableLines() {
    if (!currentSection.tableLines.length) {
      return
    }

    const table = parseMarkdownTable(currentSection.tableLines)

    if (table) {
      currentSection.tables.push(table)
    } else {
      currentSection.bodyLines.push(...currentSection.tableLines)
    }

    currentSection.tableLines = []
  }

  function commitSection() {
    flushTableLines()

    const body = normalizeAnswerBody(currentSection.bodyLines)
    const items = currentSection.items.map((item) => item.trim()).filter(Boolean)
    const tables = currentSection.tables

    if (!body && !items.length && !tables.length) {
      return
    }

    const index = sections.length

    sections.push({
      body,
      id: `answer-section-${index + 1}-${currentSection.title}`,
      items,
      tables,
      title: currentSection.title,
      tone: getAnswerSectionTone(currentSection.title, index),
    })
  }

  trimmedText.split('\n').forEach((rawLine) => {
    const line = rawLine.trim()
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/) ?? line.match(/^\*\*(.+)\*\*:?\s*$/)
    const colonHeadingMatch = line.match(/^(.{2,24})[:：]\s*(.+)?$/)
    const listMatch = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/)

    if (headingMatch) {
      commitSection()
      currentSection = createAnswerSection(cleanAnswerTitle(headingMatch[2] ?? headingMatch[1]))
      return
    }

    if (colonHeadingMatch && /요약|원인|위험|주의|대응|조치|근거|확인|결론|분석/.test(colonHeadingMatch[1])) {
      commitSection()
      currentSection = createAnswerSection(cleanAnswerTitle(colonHeadingMatch[1]))

      if (colonHeadingMatch[2]) {
        currentSection.bodyLines.push(colonHeadingMatch[2])
      }

      return
    }

    if (isMarkdownTableLine(line)) {
      currentSection.tableLines.push(line)
      return
    }

    if (currentSection.tableLines.length && !line) {
      return
    }

    flushTableLines()

    if (listMatch) {
      currentSection.items.push(listMatch[1])
      return
    }

    if (line || currentSection.bodyLines.length) {
      currentSection.bodyLines.push(line)
    }
  })

  commitSection()

  if (!sections.length) {
    return [
      createAnswerBlock({
        body: trimmedText,
        index: 0,
        title: '핵심 요약',
        tone: 'summary',
      }),
    ]
  }

  if (sections.length === 1 && sections[0].title === '답변 요약') {
    return splitDefaultAnswerSection(sections[0])
  }

  return sections
}

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

function openHistoryView() {
  activePanelView.value = 'history'
}

function closeHistoryView() {
  activePanelView.value = 'chat'
  scrollToBottom()
}

function selectHistoryItem(item) {
  emit('select-history', item.value)
  closeHistoryView()
}

function submitMessage(message = inputMessage.value) {
  const nextMessage = message.trim()

  if (!nextMessage || props.isLoading) {
    return
  }

  if (isHistoryView.value) {
    closeHistoryView()
  }

  emit('send-message', nextMessage)
  inputMessage.value = ''
}

function submitQuickCommand(command) {
  submitMessage(command.message)
}

function handleInputKeydown(event) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
    return
  }

  event.preventDefault()
  submitMessage()
}

watch(() => [messageScrollSignature.value, props.isLoading], scrollToBottom)

watch(
  () =>
    props.messages
      .map((message) => {
        const event = getThinkingEvent(message)

        return message.isStreaming && event ? `${message.id}:${event.id ?? event.label}` : ''
      })
      .join('|'),
  syncThinkingTypewriter,
  { immediate: true },
)

onBeforeUnmount(() => {
  thinkingTypingTimers.forEach((timer) => window.clearTimeout(timer))
  thinkingTypingTimers.clear()
})
</script>

<template>
  <aside class="assistant-panel" aria-labelledby="assistant-panel-title">
    <div class="assistant-panel__header">
      <button
        v-if="!isHistoryView"
        type="button"
        class="assistant-panel__nav-button"
        aria-label="대화 히스토리 보기"
        @click="openHistoryView"
      >
        <img :src="chatBackIcon" alt="" width="20" height="20" />
      </button>
      <div class="assistant-panel__title">
        <h2 id="assistant-panel-title">Tory</h2>
        <span class="assistant-panel__role">
          {{ isHistoryView ? '대화 히스토리' : 'AI 어시스턴트' }}
        </span>
      </div>
    </div>

    <div class="assistant-panel__divider"></div>

    <div
      v-if="isHistoryView"
      class="assistant-panel__history"
      data-test="assistant-history"
    >
      <button
        v-for="item in historyListItems"
        :key="item.id"
        type="button"
        class="assistant-panel__history-item"
        @click="selectHistoryItem(item)"
      >
        <span class="assistant-panel__history-title">{{ item.title }}</span>
        <span v-if="item.preview" class="assistant-panel__history-preview">{{ item.preview }}</span>
        <small v-if="item.meta">{{ item.meta }}</small>
      </button>

      <div v-if="historyListItems.length === 0" class="assistant-panel__history-empty">
        <strong>저장된 대화가 없습니다.</strong>
      </div>
    </div>

    <div
      v-else
      ref="messageListRef"
      class="assistant-panel__messages"
      data-test="assistant-messages"
    >
      <template v-for="message in messageItems" :key="message.id">
        <time v-if="message.dateLabel" class="assistant-panel__date">{{ message.dateLabel }}</time>
        <article
          class="assistant-panel__message"
          :class="[
            `assistant-panel__message--${message.role ?? 'assistant'}`,
            { 'assistant-panel__message--error': message.tone === 'error' },
          ]"
        >
          <div v-if="message.isStreaming" class="assistant-panel__thinking">
            <div class="assistant-panel__thinking-copy">
              <div class="assistant-panel__thinking-current">
                <span v-if="message.streamEvents?.at(-1)?.name" class="assistant-panel__thinking-agent">
                  {{ message.streamEvents.at(-1).name }}
                </span>
                <strong class="assistant-panel__thinking-status">
                  {{ getThinkingDisplayText(message) }}
                </strong>
                <small v-if="message.streamEvents?.at(-1)?.detail" class="assistant-panel__thinking-detail">
                  {{ message.streamEvents.at(-1).detail }}
                </small>
              </div>
              <ol
                v-if="getPreviousStreamEvents(message.streamEvents).length"
                class="assistant-panel__thinking-trace"
              >
                <li
                  v-for="event in getPreviousStreamEvents(message.streamEvents)"
                  :key="event.id"
                >
                  <span class="assistant-panel__thinking-step-dot"></span>
                  <span class="assistant-panel__thinking-step-label">{{ event.label }}</span>
                </li>
              </ol>
            </div>
          </div>

          <div v-if="message.answerSections?.length" class="assistant-panel__answer">
            <section
              v-for="section in message.answerSections"
              :key="section.id"
              class="assistant-panel__answer-section"
              :class="`assistant-panel__answer-section--${section.tone}`"
            >
              <div class="assistant-panel__answer-heading">
                <strong>{{ section.title }}</strong>
              </div>
              <p v-if="section.body">{{ section.body }}</p>
              <div
                v-for="table in section.tables"
                :key="table.id"
                class="assistant-panel__answer-table-wrap"
              >
                <table class="assistant-panel__answer-table">
                  <thead>
                    <tr>
                      <th v-for="header in table.headers" :key="header" scope="col">
                        {{ header }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in table.rows" :key="`${table.id}-${rowIndex}`">
                      <td v-for="(cell, cellIndex) in row" :key="`${table.id}-${rowIndex}-${cellIndex}`">
                        {{ cell }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ul v-if="section.items.length">
                <li v-for="item in section.items" :key="item">{{ item }}</li>
              </ul>
            </section>
          </div>

          <p v-else-if="message.text" :class="{ 'assistant-panel__streaming-text': message.isStreaming }">
            {{ message.text }}
          </p>

          <div v-if="message.citations?.length" class="assistant-panel__citations">
            <strong>근거 문서</strong>
            <ul>
              <li v-for="citation in message.citations" :key="citation.docId">
                <span>{{ citation.docId }}</span>
                <small v-if="citation.snippet">{{ citation.snippet }}</small>
              </li>
            </ul>
          </div>

          <time
            v-if="message.role !== 'assistant' || !message.isStreaming"
            class="assistant-panel__message-meta"
          >
            {{ message.sentTime }} 전송됨
          </time>
        </article>
      </template>

      <article
        v-if="isLoading && !hasStreamingMessage"
        class="assistant-panel__message assistant-panel__message--assistant"
      >
        <span class="assistant-panel__typing" aria-label="Tory 응답 생성 중">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </article>
    </div>

    <div class="assistant-panel__composer">
      <div
        v-if="shouldShowQuickCommands"
        class="assistant-panel__quick"
        :class="{ 'assistant-panel__quick--loading': isQuickCommandLoading }"
        data-test="quick-commands"
      >
        <div class="assistant-panel__quick-header">
          <span class="assistant-panel__quick-title">추천 대화</span>
          <small
            v-if="isQuickCommandLoading"
            class="assistant-panel__quick-dots"
            aria-label="추천 대화 불러오는 중"
          >
            <span></span>
            <span></span>
            <span></span>
          </small>
        </div>
        <div
          v-if="quickCommandItems.length > 0"
          class="assistant-panel__quick-list"
          :class="{ 'assistant-panel__quick-list--loading': isQuickCommandLoading }"
        >
          <button
            v-for="command in quickCommandItems"
            :key="command.id"
            type="button"
            :disabled="isQuickCommandLoading"
            @click="submitQuickCommand(command)"
          >
            <span>{{ command.label }}</span>
          </button>
        </div>
        <div v-else class="assistant-panel__quick-list" aria-hidden="true">
          <div
            v-for="item in 3"
            :key="`quick-loading-${item}`"
            class="assistant-panel__quick-loading-row"
          >
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>

      <div class="assistant-panel__input-row">
        <textarea
          v-model="inputMessage"
          rows="2"
          placeholder="Tory에게 메시지를 입력해주세요."
          aria-label="Tory 메시지"
          @keydown="handleInputKeydown"
        />
        <button type="button" aria-label="메시지 전송" :disabled="!canSubmit" @click="submitMessage()">
          <img :src="sendIcon" alt="" width="24" height="24" />
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.assistant-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  padding: 0 var(--agentory-spacing-15) var(--agentory-spacing-15);
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel);
}

.assistant-panel__header {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-8);
  min-height: 28px;
  width: 100%;
  padding: var(--agentory-spacing-20) var(--agentory-spacing-20) var(--agentory-spacing-10);
}

.assistant-panel__title {
  display: inline-flex;
  align-items: center;
  gap: var(--agentory-spacing-8);
  min-width: 0;
}

.assistant-panel__header h2 {
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body-lg);
}

.assistant-panel__nav-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-6);
  cursor: pointer;
  flex: 0 0 auto;
  transition:
    opacity 180ms var(--agentory-ease-soft),
    transform 220ms var(--agentory-ease-elastic);
}

.assistant-panel__nav-button:hover,
.assistant-panel__nav-button:focus-visible {
  opacity: 0.74;
  outline: none;
  transform: translateY(-1px);
}

.assistant-panel__nav-button img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.assistant-panel__role {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
  white-space: nowrap;
}

.assistant-panel__divider {
  height: 2px;
  margin-inline: var(--agentory-spacing-5);
  background: var(--agentory-color-bg-primary);
}

.assistant-panel__history {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--agentory-spacing-8);
  min-height: 0;
  padding: var(--agentory-spacing-16) var(--agentory-spacing-5);
  overflow-y: auto;
  scrollbar-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 58%) transparent;
  scrollbar-width: thin;
}

.assistant-panel__history::-webkit-scrollbar {
  width: 6px;
}

.assistant-panel__history::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

.assistant-panel__history::-webkit-scrollbar-track {
  background: transparent;
}

.assistant-panel__history::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 60%);
  border-radius: var(--agentory-radius-pill);
}

.assistant-panel__history-item {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-5);
  width: 100%;
  padding: var(--agentory-spacing-12);
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-surface);
  border: 1px solid color-mix(in srgb, var(--agentory-color-border-primary), transparent 72%);
  border-radius: var(--agentory-radius-12);
  text-align: left;
  cursor: pointer;
  transition:
    background-color 180ms var(--agentory-ease-soft),
    border-color 180ms var(--agentory-ease-soft),
    transform 220ms var(--agentory-ease-elastic);
}

.assistant-panel__history-item:hover,
.assistant-panel__history-item:focus-visible {
  background: var(--agentory-color-bg-app);
  border-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 66%);
  outline: none;
  transform: translateY(-1px);
}

.assistant-panel__history-title,
.assistant-panel__history-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assistant-panel__history-title {
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body);
}

.assistant-panel__history-preview {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
}

.assistant-panel__history-item small {
  color: var(--agentory-color-text-subtle);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-caption);
}

.assistant-panel__history-empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--agentory-spacing-6);
  min-height: 150px;
  color: var(--agentory-color-text-muted);
  text-align: center;
}

.assistant-panel__history-empty strong {
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body);
}

.assistant-panel__history-empty span {
  max-width: 220px;
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
}

.assistant-panel__messages {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--agentory-spacing-16);
  min-height: 0;
  padding: var(--agentory-spacing-16) var(--agentory-spacing-5);
  overflow-y: auto;
  scrollbar-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 52%) transparent;
  scrollbar-width: thin;
}

.assistant-panel__messages::-webkit-scrollbar {
  width: 6px;
}

.assistant-panel__messages::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

.assistant-panel__thinking-trace::-webkit-scrollbar-button,
.assistant-panel__input-row textarea::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

.assistant-panel__messages::-webkit-scrollbar-track {
  background: transparent;
}

.assistant-panel__messages::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 58%);
  border-radius: var(--agentory-radius-pill);
}

.assistant-panel__date {
  align-self: center;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-8);
  color: var(--agentory-color-text-muted);
  background: color-mix(in srgb, var(--agentory-color-bg-surface), transparent 16%);
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-caption);
}

.assistant-panel__message {
  width: 100%;
  padding: var(--agentory-spacing-12);
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-surface);
  border-radius: var(--agentory-radius-16);
  font-size: var(--agentory-font-size-body);
  line-height: var(--agentory-line-height-body);
  animation: assistant-message-in 280ms var(--agentory-ease-soft);
}

.assistant-panel__message--user {
  width: fit-content;
  max-width: min(266px, 82%);
  margin-left: auto;
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border-bottom-right-radius: var(--agentory-radius-5);
}

.assistant-panel__message--assistant {
  width: 100%;
  margin-right: auto;
  border-bottom-left-radius: var(--agentory-radius-5);
}

.assistant-panel__message--error {
  color: var(--agentory-color-status-danger-text);
  background: color-mix(in srgb, var(--agentory-color-status-danger-text), transparent 88%);
}

.assistant-panel__message p {
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.assistant-panel__answer {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-8);
}

.assistant-panel__answer-section {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-8);
  padding: var(--agentory-spacing-12);
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-12);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--agentory-color-border-primary), transparent 72%),
    0 8px 18px color-mix(in srgb, var(--agentory-color-text-primary), transparent 94%);
}

.assistant-panel__answer-heading {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-6);
  min-width: 0;
}

.assistant-panel__answer-section strong {
  min-width: 0;
  overflow: hidden;
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assistant-panel__answer-section p {
  margin: 0;
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  line-height: 1.56;
}

.assistant-panel__answer-section ul {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.assistant-panel__answer-section li {
  position: relative;
  padding-left: var(--agentory-spacing-14);
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  line-height: 1.5;
}

.assistant-panel__answer-section li::before {
  position: absolute;
  top: 0.72em;
  left: 0;
  width: 5px;
  height: 5px;
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  content: '';
  transform: translateY(-50%);
}

.assistant-panel__answer-section--alert,
.assistant-panel__answer-section--action,
.assistant-panel__answer-section--evidence {
  background: var(--agentory-color-bg-app);
}

.assistant-panel__answer-table-wrap {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  border-radius: var(--agentory-radius-10);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--agentory-color-border-primary), transparent 68%);
  scrollbar-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 56%) transparent;
  scrollbar-width: thin;
}

.assistant-panel__answer-table-wrap::-webkit-scrollbar {
  height: 6px;
}

.assistant-panel__answer-table-wrap::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

.assistant-panel__answer-table-wrap::-webkit-scrollbar-track {
  background: transparent;
}

.assistant-panel__answer-table-wrap::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 56%);
  border-radius: var(--agentory-radius-pill);
}

.assistant-panel__answer-table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body-sm);
  line-height: var(--agentory-line-height-body-sm);
}

.assistant-panel__answer-table th,
.assistant-panel__answer-table td {
  max-width: 220px;
  padding: var(--agentory-spacing-8) var(--agentory-spacing-10);
  border-bottom: 1px solid color-mix(in srgb, var(--agentory-color-border-primary), transparent 72%);
  overflow-wrap: anywhere;
  text-align: left;
  vertical-align: top;
  white-space: normal;
}

.assistant-panel__answer-table th {
  color: var(--agentory-color-bg-primary);
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 92%);
  font-weight: var(--agentory-font-weight-bold);
  white-space: nowrap;
}

.assistant-panel__answer-table tbody tr:last-child td {
  border-bottom: 0;
}

.assistant-panel__answer-section--alert li::before,
.assistant-panel__answer-section--action li::before,
.assistant-panel__answer-section--evidence li::before {
  background: var(--agentory-color-bg-primary);
}

.assistant-panel__answer-section--alert strong,
.assistant-panel__answer-section--action strong,
.assistant-panel__answer-section--evidence strong {
  color: var(--agentory-color-bg-primary);
}

.assistant-panel__thinking {
  display: flex;
  align-items: center;
  margin-bottom: var(--agentory-spacing-8);
  padding: var(--agentory-spacing-8) var(--agentory-spacing-10);
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 92%);
  border-radius: var(--agentory-radius-12);
  color: var(--agentory-color-bg-primary);
}

.assistant-panel__thinking-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--agentory-spacing-8);
}

.assistant-panel__thinking-current {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--agentory-spacing-4);
}

.assistant-panel__thinking-agent {
  width: fit-content;
  max-width: 100%;
  padding: 0 var(--agentory-spacing-6);
  overflow: hidden;
  color: color-mix(in srgb, var(--agentory-color-bg-primary), var(--agentory-color-text-primary) 18%);
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 88%);
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assistant-panel__thinking-copy strong {
  display: inline-flex;
  align-items: center;
  min-height: var(--agentory-line-height-body-sm);
  overflow: hidden;
  color: transparent;
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--agentory-color-bg-primary), var(--agentory-color-text-primary) 22%) 0%,
      var(--agentory-color-bg-primary) 38%,
      color-mix(in srgb, var(--agentory-color-text-inverse), var(--agentory-color-bg-primary) 12%) 50%,
      var(--agentory-color-bg-primary) 62%,
      color-mix(in srgb, var(--agentory-color-bg-primary), var(--agentory-color-text-primary) 22%) 100%
    );
  background-clip: text;
  background-size: 220% 100%;
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-body-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
  animation: assistant-thinking-shimmer 1.35s linear infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.assistant-panel__thinking-status::after {
  display: inline-block;
  width: 5px;
  height: 1em;
  margin-left: var(--agentory-spacing-4);
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  content: '';
  transform: translateY(1px);
  animation: assistant-stream-caret 820ms steps(2, jump-none) infinite;
}

.assistant-panel__thinking-detail {
  display: -webkit-box;
  overflow: hidden;
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.assistant-panel__thinking-trace {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-5);
  max-height: 126px;
  margin: 0;
  padding: 0;
  color: var(--agentory-color-text-subtle);
  font-size: var(--agentory-font-size-caption);
  line-height: 1.35;
  list-style: none;
  overflow-y: auto;
  scrollbar-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 64%) transparent;
  scrollbar-width: thin;
}

.assistant-panel__thinking-trace li {
  display: flex;
  align-items: flex-start;
  gap: var(--agentory-spacing-6);
  min-width: 0;
}

.assistant-panel__thinking-step-dot {
  width: 7px;
  height: 7px;
  margin-top: 4px;
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 66%);
  border-radius: var(--agentory-radius-pill);
  flex: 0 0 auto;
}

.assistant-panel__thinking-step-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assistant-panel__streaming-text::after {
  display: inline-block;
  width: 6px;
  height: 1em;
  margin-left: var(--agentory-spacing-4);
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  content: '';
  transform: translateY(2px);
  animation: assistant-stream-caret 820ms steps(2, jump-none) infinite;
}

.assistant-panel__message-meta {
  display: block;
  margin-top: var(--agentory-spacing-6);
  color: color-mix(in srgb, currentColor, transparent 36%);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
  line-height: 1.2;
}

.assistant-panel__message--user .assistant-panel__message-meta {
  text-align: right;
}

.assistant-panel__citations {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-6);
  margin-top: var(--agentory-spacing-10);
  padding-top: var(--agentory-spacing-8);
  border-top: 1px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 72%);
}

.assistant-panel__citations strong {
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-body-sm);
}

.assistant-panel__citations ul {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-6);
  margin: 0;
  padding: 0;
  list-style: none;
}

.assistant-panel__citations li {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-4);
  min-width: 0;
}

.assistant-panel__citations span {
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  font-weight: var(--agentory-font-weight-semi-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assistant-panel__citations small {
  display: -webkit-box;
  overflow: hidden;
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
  line-height: var(--agentory-line-height-caption);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.assistant-panel__typing {
  display: inline-flex;
  align-items: center;
  gap: var(--agentory-spacing-4);
  min-height: 18px;
}

.assistant-panel__typing span {
  width: 6px;
  height: 6px;
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  animation: assistant-typing 960ms ease-in-out infinite;
}

.assistant-panel__typing span:nth-child(2) {
  animation-delay: 140ms;
}

.assistant-panel__typing span:nth-child(3) {
  animation-delay: 280ms;
}

.assistant-panel__composer {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-12);
  box-shadow: var(--agentory-shadow-control);
}

.assistant-panel__quick {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-8);
  margin: var(--agentory-spacing-10);
  padding: var(--agentory-spacing-10);
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 94%);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 82%);
  border-radius: var(--agentory-radius-12);
}

.assistant-panel__quick-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--agentory-spacing-8);
}

.assistant-panel__quick-header small {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-caption);
  white-space: nowrap;
}

.assistant-panel__quick-title {
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-body-sm);
}

.assistant-panel__quick-dots,
.assistant-panel__quick-loading-row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--agentory-spacing-4);
}

.assistant-panel__quick-dots {
  min-width: 28px;
  height: var(--agentory-line-height-caption);
}

.assistant-panel__quick-dots span,
.assistant-panel__quick-loading-row span {
  width: 5px;
  height: 5px;
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 28%);
  border-radius: var(--agentory-radius-pill);
  animation: assistant-quick-dot-dance 820ms ease-in-out infinite;
}

.assistant-panel__quick-dots span:nth-child(2),
.assistant-panel__quick-loading-row span:nth-child(2) {
  animation-delay: 120ms;
}

.assistant-panel__quick-dots span:nth-child(3),
.assistant-panel__quick-loading-row span:nth-child(3) {
  animation-delay: 240ms;
}

.assistant-panel__quick-list {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-6);
}

.assistant-panel__quick-list--loading {
  filter: blur(1.2px);
  opacity: 0.58;
  pointer-events: none;
}

.assistant-panel__quick button:disabled {
  cursor: progress;
}

.assistant-panel__quick-loading-row {
  min-height: 34px;
  background: color-mix(in srgb, var(--agentory-color-bg-app), transparent 4%);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 88%);
  border-radius: var(--agentory-radius-10);
}

.assistant-panel__quick button {
  position: relative;
  min-width: 0;
  padding: var(--agentory-spacing-8) var(--agentory-spacing-10) var(--agentory-spacing-8)
    var(--agentory-spacing-20);
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  background: color-mix(in srgb, var(--agentory-color-bg-app), transparent 2%);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 88%);
  border-radius: var(--agentory-radius-10);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
  text-align: left;
  text-wrap: balance;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    transform 220ms var(--agentory-ease-elastic);
}

.assistant-panel__quick button::before {
  position: absolute;
  top: 50%;
  left: var(--agentory-spacing-8);
  width: 5px;
  height: 5px;
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  content: '';
  transform: translateY(-50%);
}

.assistant-panel__quick button span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.assistant-panel__quick button:hover {
  color: var(--agentory-color-bg-primary);
  background: var(--agentory-color-bg-app);
  border-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 62%);
  transform: translateY(-1px);
}

.assistant-panel__input-row {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-10);
  min-height: 61px;
  padding: var(--agentory-spacing-8) var(--agentory-spacing-10);
}

.assistant-panel__input-row textarea {
  width: 100%;
  height: 48px;
  padding: var(--agentory-spacing-8);
  resize: none;
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-app);
  border: 0;
  border-radius: var(--agentory-radius-4);
  outline: none;
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  line-height: 1.5;
}

.assistant-panel__input-row button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  padding: var(--agentory-spacing-5);
  background: var(--agentory-color-bg-primary);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  flex: 0 0 auto;
  cursor: pointer;
  transition:
    opacity 180ms ease,
    transform 220ms var(--agentory-ease-elastic);
}

.assistant-panel__input-row button:disabled {
  opacity: 0.36;
  cursor: default;
  transform: scale(0.94);
}

.assistant-panel__input-row img {
  width: 19px;
  height: 19px;
  object-fit: contain;
}

@keyframes assistant-message-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes assistant-typing {
  0%,
  100% {
    opacity: 0.34;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

@keyframes assistant-thinking-shimmer {
  0% {
    background-position: 140% 0;
  }

  100% {
    background-position: -80% 0;
  }
}

@keyframes assistant-quick-dot-dance {
  0%,
  100% {
    opacity: 0.42;
    transform: translateY(0) scale(0.88);
  }

  45% {
    opacity: 1;
    transform: translateY(-4px) scale(1);
  }
}

@keyframes assistant-stream-caret {
  0%,
  48% {
    opacity: 1;
  }

  49%,
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .assistant-panel__message,
  .assistant-panel__quick-dots span,
  .assistant-panel__quick-loading-row span,
  .assistant-panel__thinking-copy strong,
  .assistant-panel__thinking-status::after,
  .assistant-panel__streaming-text::after,
  .assistant-panel__typing span {
    animation: none;
  }
}
</style>
