<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

import {
  equipmentStatusMap,
  equipmentStatusOrder,
  normalizeEquipmentStatus,
} from '@/constants/equipmentStatus'
import AssistantPanel from '@/features/dashboard/components/AssistantPanel.vue'
import DashboardAlertToast from '@/features/dashboard/components/DashboardAlertToast.vue'
import DashboardContentLoader from '@/features/dashboard/components/DashboardContentLoader.vue'
import DashboardEditableWidget from '@/features/dashboard/components/DashboardEditableWidget.vue'
import DashboardHeader from '@/features/dashboard/components/DashboardHeader.vue'
import DashboardSidebar from '@/features/dashboard/components/DashboardSidebar.vue'
import EquipmentAnalysisPanel from '@/features/dashboard/components/EquipmentAnalysisPanel.vue'
import EquipmentChartPanel from '@/features/dashboard/components/EquipmentChartPanel.vue'
import EquipmentDetailPanel from '@/features/dashboard/components/EquipmentDetailPanel.vue'
import ErrorDonutPanel from '@/features/dashboard/components/ErrorDonutPanel.vue'
import FactoryViewport from '@/features/dashboard/components/FactoryViewport.vue'
import RepairHistoryPanel from '@/features/dashboard/components/RepairHistoryPanel.vue'
import { dashboardNavigation } from '@/features/dashboard/constants/dashboardNavigation'
import { useDashboardEquipmentFocus } from '@/features/dashboard/composables/useDashboardEquipmentFocus'
import {
  createEmptyMetricChart,
  metricConfigs,
} from '@/features/dashboard/constants/equipmentMetrics'
import { useDashboardSidebar } from '@/features/dashboard/composables/useDashboardSidebar'
import {
  deleteChatSession,
  fetchChatSessionDetail,
  fetchChatSessions,
  streamChatQuery,
} from '@/features/dashboard/services/chatApi'
import {
  createEmptyEquipment,
  createEmptyFactoryScene,
  fetchEquipmentStatuses,
  fetchEquipmentTelemetry,
  fetchEquipmentSuggestions,
  fetchFactoryScene,
} from '@/features/dashboard/services/telemetryApi'
import {
  loadDashboardLayoutState,
  resolveDashboardWidgetVisibility,
  saveDashboardLayoutState,
} from '@/features/dashboard/utils/dashboardLayoutStorage'
import { useNotificationToast } from '@/features/notification/composables/useNotificationToast'
import { useIncidentResponse } from '@/features/incident/composables/useIncidentResponse'
import { useAssistantStore } from '@/stores/assistantStore'

const { isSidebarOpen, toggleSidebar } = useDashboardSidebar()
const { t } = useI18n()
const assistantStore = useAssistantStore()
const assistantStoreRefs = storeToRefs(assistantStore)
const {
  isLoading: isAssistantLoading,
  messages: assistantMessages,
  openConversationRequest: assistantOpenConversationRequest,
  sessionId: assistantSessionId,
} = assistantStoreRefs
const assistantSessionEquipmentId = assistantStoreRefs.sessionEquipmentId ?? ref('')
const {
  alertToasts,
  pauseAlertToast,
  resumeAlertToast,
  startAlertToastStream,
  stopAlertToastStream,
} = useNotificationToast()
const { consumeEquipmentFocusRequest, equipmentFocusRequest } = useDashboardEquipmentFocus()
const {
  activeNotificationId,
  incidentErrorMessage,
  incidentErrorNotificationId,
  isIncidentCreating,
  startIncidentResponse,
} = useIncidentResponse()
const layoutBoardRef = ref(null)
const hasCustomLayout = ref(false)
const assistantHistoryItems = ref([])
const isAssistantHistoryLoading = ref(false)
const isQuickCommandsLoading = ref(false)
const quickCommands = ref([])
const assistantPanelView = ref('history')
const shouldSkipDashboardApi = import.meta.env.MODE === 'test'
const initialFactoryScene = createEmptyFactoryScene()
const factoryScene = reactive({
  defaultEquipmentId: initialFactoryScene.defaultEquipmentId,
  equipmentList: initialFactoryScene.equipmentList,
  lineGroups: initialFactoryScene.lineGroups,
  statusSummary: initialFactoryScene.statusSummary,
})
const selectedEquipmentId = ref(factoryScene.defaultEquipmentId)
const selectedMetricId = ref('gasFlow')
const isMetricSelectionLockedByUser = ref(false)
const metricChartRange = reactive({
  end: '',
  minutes: 10,
  mode: 'live',
  start: '',
})
const isEquipmentSwitching = ref(false)
const realtimeRevision = ref(0)
const alertFocusRequest = ref(null)
const widgetGapPx = 15
const layoutGridColumns = 4
const layoutGridRows = 2
const realtimePollingInterval = 1000
const statusPollingInterval = 5000
let layoutResizeObserver
let contentLoadingFrame = 0
let realtimeSnapshotInterval = 0
let realtimeSnapshotRequestId = 0
let isRealtimePollPending = false
let nextStatusPollAt = 0
const realtimeNotificationRequestIds = new Map()
const realtimeNotificationRefreshStates = new Map()
const realtimeNotificationUpdatedAt = new Map()
const assistantSuggestionCache = new Map()
const assistantSuggestionRequests = new Map()
let equipmentSwitchRequestId = 0
let assistantHistoryRequestId = 0
let assistantSuggestionRequestId = 0
let assistantSuggestionEquipmentId = ''
let lastMetricSyncEquipmentId = ''
let isDashboardInitializing = false
const isContentLoading = ref(true)

const selectedEquipment = computed(
  () =>
    factoryScene.equipmentList.find((equipment) => equipment.id === selectedEquipmentId.value) ??
    factoryScene.equipmentList[0] ??
    createEmptyEquipment(),
)

const conversationEquipmentId = computed(() =>
  assistantPanelView.value === 'chat' ? assistantSessionEquipmentId.value : '',
)

const assistantContextEquipment = computed(() => {
  const equipmentId = conversationEquipmentId.value || selectedEquipmentId.value

  return factoryScene.equipmentList.find((equipment) => equipment.id === equipmentId)
})

const selectedChecklistItems = computed(() => selectedEquipment.value.checklist ?? [])

const selectedChart = computed(
  () =>
    selectedEquipment.value.charts?.[selectedMetricId.value] ??
    selectedEquipment.value.charts?.gasFlow ??
    createEmptyMetricChart(selectedMetricId.value),
)

function getEquipmentFocusMetricId(equipment) {
  const charts = equipment?.charts ?? {}
  const isAlarmStatus = ['warning', 'danger'].includes(equipment?.status?.tone)
  const alarmMetricId = isAlarmStatus
    ? (equipment.alarmMetricIds ?? []).find((metricId) => charts[metricId])
    : ''

  if (alarmMetricId) {
    return alarmMetricId
  }

  if (charts[selectedMetricId.value]) {
    return selectedMetricId.value
  }

  if (charts.gasFlow) {
    return 'gasFlow'
  }

  return Object.keys(charts)[0] ?? 'gasFlow'
}

function syncSelectedMetricWithEquipment(equipment) {
  const equipmentId = equipment?.id ?? ''
  const charts = equipment?.charts ?? {}
  const hasEquipmentChanged = Boolean(equipmentId) && equipmentId !== lastMetricSyncEquipmentId

  if (hasEquipmentChanged) {
    isMetricSelectionLockedByUser.value = false
    lastMetricSyncEquipmentId = equipmentId
  }

  if (isMetricSelectionLockedByUser.value && charts[selectedMetricId.value]) {
    return
  }

  const nextMetricId = getEquipmentFocusMetricId(equipment)

  if (selectedMetricId.value !== nextMetricId) {
    selectedMetricId.value = nextMetricId
  }
}

function selectMetric(metricId) {
  isMetricSelectionLockedByUser.value = true
  selectedMetricId.value = metricId
}

const widgetOrder = [
  'factory',
  'detail',
  'metricChart',
  'assistant',
  'equipmentAnalysis',
  'errorDonut',
  'repairHistory',
]
const widgetMeta = {
  assistant: {
    id: 'assistant',
    label: 'Tory',
    labelKey: 'dashboard.widgets.assistant',
    minHeight: 260,
    minWidth: 190,
  },
  detail: {
    id: 'detail',
    label: '상세 정보',
    labelKey: 'dashboard.widgets.detail',
    minHeight: 260,
    minWidth: 220,
  },
  equipmentAnalysis: {
    id: 'equipmentAnalysis',
    label: '센서 기준 범위 분석',
    labelKey: 'dashboard.widgets.equipmentAnalysis',
    minHeight: 260,
    minWidth: 240,
  },
  errorDonut: {
    id: 'errorDonut',
    label: '에러 발생 도넛 차트',
    labelKey: 'dashboard.widgets.errorDonut',
    minHeight: 180,
    minWidth: 220,
  },
  repairHistory: {
    id: 'repairHistory',
    label: '수리 이력',
    labelKey: 'dashboard.widgets.repairHistory',
    minHeight: 220,
    minWidth: 220,
  },
  factory: {
    id: 'factory',
    label: '3D 공장 화면',
    labelKey: 'dashboard.widgets.factory',
    minHeight: 240,
    minWidth: 340,
  },
  metricChart: {
    id: 'metricChart',
    label: '그래프',
    labelKey: 'dashboard.widgets.metricChart',
    minHeight: 150,
    minWidth: 220,
  },
}
const defaultWidgetVisibility = {
  assistant: true,
  detail: true,
  equipmentAnalysis: false,
  errorDonut: false,
  factory: true,
  metricChart: true,
  repairHistory: false,
}
const initialDashboardLayoutState = loadDashboardLayoutState()
const visibleWidgetMap = reactive(
  resolveDashboardWidgetVisibility(defaultWidgetVisibility, initialDashboardLayoutState),
)
const widgetLayouts = reactive({
  assistant: { x: 75, y: 0, w: 25, h: 100 },
  detail: { x: 50, y: 0, w: 25, h: 50 },
  equipmentAnalysis: { x: 0, y: 0, w: 25, h: 50 },
  errorDonut: { x: 25, y: 0, w: 25, h: 50 },
  factory: { x: 0, y: 0, w: 50, h: 100 },
  metricChart: { x: 50, y: 50, w: 25, h: 50 },
  repairHistory: { x: 50, y: 0, w: 25, h: 50 },
})
const previewLayouts = reactive({})
const defaultLayoutGrid = {
  assistant: { col: 3, cols: 1, row: 0, rows: 2 },
  detail: { col: 2, cols: 1, row: 0, rows: 1 },
  equipmentAnalysis: { col: 0, cols: 1, row: 0, rows: 1 },
  errorDonut: { col: 1, cols: 1, row: 0, rows: 1 },
  factory: { col: 0, cols: 2, row: 0, rows: 2 },
  metricChart: { col: 2, cols: 1, row: 1, rows: 1 },
  repairHistory: { col: 2, cols: 1, row: 0, rows: 1 },
}

const dockWidgets = computed(() =>
  widgetOrder
    .filter((widgetId) => !visibleWidgetMap[widgetId])
    .map((widgetId) => widgetMeta[widgetId]),
)

function createAssistantMessage(role, text, extra = {}) {
  return {
    createdAt: new Date().toISOString(),
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
    ...extra,
  }
}

function createAssistantHistoryMessage(message, index) {
  return {
    citations: message.citations ?? [],
    createdAt: message.createdAt || new Date().toISOString(),
    id: message.id ?? `history-message-${index + 1}`,
    reasoningSteps: message.reasoningSteps ?? [],
    role: message.role === 'user' ? 'user' : 'assistant',
    text: message.text ?? '',
  }
}

async function loadAssistantHistoryItems() {
  if (shouldSkipDashboardApi) {
    return
  }

  const requestId = ++assistantHistoryRequestId
  isAssistantHistoryLoading.value = true

  try {
    const sessions = await fetchChatSessions()

    if (requestId === assistantHistoryRequestId) {
      assistantHistoryItems.value = sessions
    }
  } catch {
    if (requestId === assistantHistoryRequestId) {
      assistantHistoryItems.value = []
    }
  } finally {
    if (requestId === assistantHistoryRequestId) {
      isAssistantHistoryLoading.value = false
    }
  }
}

async function selectAssistantHistory(history) {
  const sessionId = history?.sessionId ?? history?.id

  if (!sessionId || isAssistantHistoryLoading.value) {
    return
  }

  const requestId = ++assistantHistoryRequestId
  isAssistantHistoryLoading.value = true
  assistantSessionEquipmentId.value = ''

  try {
    const detail = await fetchChatSessionDetail(sessionId)

    if (requestId !== assistantHistoryRequestId) {
      return
    }

    assistantSessionId.value = detail.sessionId || sessionId
    assistantSessionEquipmentId.value = detail.equipmentId || ''
    assistantMessages.value = detail.messages.map(createAssistantHistoryMessage)

    if (
      detail.equipmentId &&
      factoryScene.equipmentList.some((equipment) => equipment.id === detail.equipmentId)
    ) {
      selectFactoryEquipment(detail.equipmentId)
    }
  } catch {
    if (requestId === assistantHistoryRequestId) {
      assistantMessages.value = [
        createAssistantMessage('assistant', t('assistant.loadConversationError'), {
          tone: 'error',
        }),
      ]
    }
  } finally {
    if (requestId === assistantHistoryRequestId) {
      isAssistantHistoryLoading.value = false
    }
  }
}

async function deleteAssistantHistory(history) {
  const sessionId = history?.sessionId ?? history?.id

  if (!sessionId || isAssistantHistoryLoading.value) {
    return
  }

  isAssistantHistoryLoading.value = true

  try {
    await deleteChatSession(sessionId)
    assistantHistoryItems.value = assistantHistoryItems.value.filter(
      (item) => (item.sessionId ?? item.id) !== sessionId,
    )

    if (assistantSessionId.value === sessionId) {
      assistantStore.startNewSession()
      assistantSessionEquipmentId.value = ''
    }
  } catch {
    return
  } finally {
    isAssistantHistoryLoading.value = false
  }
}

function updateAssistantMessage(messageId, updater) {
  assistantStore.updateMessage(messageId, updater)
}

function appendAssistantText(messageId, text) {
  assistantStore.appendStreamingText(messageId, text)
}

function flushAssistantTypingQueue(options = {}) {
  assistantStore.flushTypingQueue(options)
}

function addAssistantStreamEvent(messageId, streamEvent) {
  if (!streamEvent?.label) {
    return
  }

  const nextEvent = {
    detail: streamEvent.detail,
    id: `${streamEvent.type || 'status'}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: streamEvent.label,
    name: streamEvent.name,
    type: streamEvent.type ?? 'status',
  }

  updateAssistantMessage(messageId, (message) => ({
    ...message,
    streamEvents: [...(message.streamEvents ?? []), nextEvent].slice(-12),
  }))
}

function getAssistantErrorMessage(error) {
  if (error?.status === 401) {
    return t('assistant.sessionExpired')
  }

  if (error?.message && error.message !== 'Chat stream request failed') {
    return error.message
  }

  return t('assistant.responseError')
}

function createAssistantRequestMessage(message) {
  return message
}

function setAssistantPanelView(view) {
  assistantPanelView.value = view === 'chat' ? 'chat' : 'history'

  if (assistantPanelView.value === 'history') {
    loadAssistantSuggestions(selectedEquipment.value)
  }
}

function applySuggestedQuestions(suggestedQuestions = []) {
  quickCommands.value = suggestedQuestions.map((question, index) => ({
    id: `suggested-${index + 1}-${question}`,
    label: question,
    message: question,
  }))
}

async function loadAssistantSuggestions(equipment, { force = false } = {}) {
  const equipmentId = equipment?.id

  if (!equipmentId || shouldSkipDashboardApi) {
    assistantSuggestionEquipmentId = ''
    quickCommands.value = []
    isQuickCommandsLoading.value = false
    return
  }

  const didChangeEquipment = assistantSuggestionEquipmentId !== equipmentId
  assistantSuggestionEquipmentId = equipmentId

  if (didChangeEquipment) {
    const cachedSuggestions = assistantSuggestionCache.get(equipmentId)
    quickCommands.value = []

    if (cachedSuggestions) {
      applySuggestedQuestions(cachedSuggestions)
    }
  }

  if (isAssistantLoading.value) {
    isQuickCommandsLoading.value = false
    return
  }

  const cachedSuggestions = assistantSuggestionCache.get(equipmentId)

  if (!force && cachedSuggestions) {
    applySuggestedQuestions(cachedSuggestions)
    isQuickCommandsLoading.value = false
    return
  }

  const requestId = ++assistantSuggestionRequestId
  isQuickCommandsLoading.value = true
  let suggestionRequest = !force ? assistantSuggestionRequests.get(equipmentId) : null

  if (!suggestionRequest) {
    suggestionRequest = fetchEquipmentSuggestions(equipmentId)
    assistantSuggestionRequests.set(equipmentId, suggestionRequest)
  }

  try {
    const suggestions = await suggestionRequest
    assistantSuggestionCache.set(equipmentId, suggestions)

    if (
      requestId === assistantSuggestionRequestId &&
      assistantSuggestionEquipmentId === equipmentId &&
      assistantContextEquipment.value?.id === equipmentId
    ) {
      applySuggestedQuestions(suggestions)
    }
  } catch {
    if (
      requestId === assistantSuggestionRequestId &&
      assistantSuggestionEquipmentId === equipmentId &&
      !assistantSuggestionCache.has(equipmentId)
    ) {
      quickCommands.value = []
    }
  } finally {
    if (assistantSuggestionRequests.get(equipmentId) === suggestionRequest) {
      assistantSuggestionRequests.delete(equipmentId)
    }

    if (
      requestId === assistantSuggestionRequestId &&
      assistantSuggestionEquipmentId === equipmentId
    ) {
      isQuickCommandsLoading.value = false
    }
  }
}

async function sendAssistantMessage(message, options = {}) {
  const nextMessage = message.trim()

  if (!nextMessage || isAssistantLoading.value) {
    return
  }

  const selectedRequestEquipmentId = selectedEquipment.value.id || selectedEquipmentId.value

  if (options.startNewSession) {
    assistantStore.startNewSession({ equipmentId: selectedRequestEquipmentId })
    assistantSessionEquipmentId.value = selectedRequestEquipmentId
  }

  const requestEquipmentId = assistantSessionEquipmentId.value || selectedRequestEquipmentId

  if (!requestEquipmentId) {
    assistantMessages.value = [
      ...assistantMessages.value,
      createAssistantMessage('user', nextMessage),
      createAssistantMessage('assistant', t('assistant.noEquipment'), {
        tone: 'error',
      }),
    ]
    return
  }

  if (!assistantSessionEquipmentId.value) {
    assistantSessionEquipmentId.value = requestEquipmentId
  }

  const assistantMessage = createAssistantMessage('assistant', '', {
    isStreaming: true,
    streamEvents: [
      {
        id: `stream-start-${Date.now()}`,
        label: t('assistant.verifyRequest'),
        type: 'start',
      },
    ],
  })

  assistantMessages.value = [
    ...assistantMessages.value,
    createAssistantMessage('user', nextMessage),
  ]
  assistantMessages.value = [...assistantMessages.value, assistantMessage]
  const assistantRequest = assistantStore.beginRequest()
  let hasReceivedDelta = false
  let didCompleteAssistantResponse = false

  try {
    const response = await streamChatQuery({
      equipmentId: requestEquipmentId,
      message: createAssistantRequestMessage(nextMessage),
      onEvent: (streamEvent) => {
        if (!assistantStore.isRequestActive(assistantRequest.id)) {
          return
        }

        if (streamEvent.kind === 'delta') {
          hasReceivedDelta = true
          appendAssistantText(assistantMessage.id, streamEvent.text)
          return
        }

        if (streamEvent.kind === 'status') {
          addAssistantStreamEvent(assistantMessage.id, streamEvent)
          return
        }

        if (streamEvent.kind === 'error') {
          throw new Error(streamEvent.message)
        }

        if (streamEvent.kind === 'final') {
          if (streamEvent.answer && !hasReceivedDelta) {
            appendAssistantText(assistantMessage.id, streamEvent.answer)
          }

          updateAssistantMessage(assistantMessage.id, (nextAssistantMessage) => ({
            ...nextAssistantMessage,
            citations: streamEvent.citations,
            reasoningSteps: streamEvent.reasoningSteps,
          }))
        }
      },
      sessionId: assistantSessionId.value,
      signal: assistantRequest.signal,
    })

    if (!assistantStore.isRequestActive(assistantRequest.id)) {
      return
    }

    if (response.answer && !hasReceivedDelta) {
      appendAssistantText(assistantMessage.id, response.answer)
    }

    flushAssistantTypingQueue({ immediate: true })
    updateAssistantMessage(assistantMessage.id, (nextAssistantMessage) => ({
      ...nextAssistantMessage,
      createdAt: new Date().toISOString(),
      citations: response.citations,
      isStreaming: false,
      reasoningSteps: response.reasoningSteps,
      streamEvents: [],
      text: nextAssistantMessage.text || response.answer || t('assistant.noAnswer'),
    }))
    didCompleteAssistantResponse = true
    assistantStore.showCompletionToast({ equipmentId: requestEquipmentId })
  } catch (error) {
    if (!assistantStore.isRequestActive(assistantRequest.id)) {
      return
    }

    assistantStore.clearTypingQueue()
    updateAssistantMessage(assistantMessage.id, () =>
      createAssistantMessage('assistant', getAssistantErrorMessage(error), {
        tone: 'error',
      }),
    )
    if (error?.status !== 401) {
      assistantStore.showCompletionToast({
        equipmentId: requestEquipmentId,
        status: 'error',
      })
    }
  } finally {
    const shouldFinalizeRequest = assistantStore.completeRequest(assistantRequest.id)

    if (shouldFinalizeRequest) {
      loadAssistantHistoryItems()

      loadAssistantSuggestions(assistantContextEquipment.value, {
        force:
          didCompleteAssistantResponse &&
          assistantContextEquipment.value?.id === requestEquipmentId,
      })
    }
  }
}

function selectFactoryEquipment(equipmentId) {
  const nextEquipment = factoryScene.equipmentList.find((equipment) => equipment.id === equipmentId)

  if (!nextEquipment) {
    return
  }

  selectedEquipmentId.value = equipmentId
  syncSelectedMetricWithEquipment(nextEquipment)
}

function getNotificationMetricId(metric) {
  const normalizedMetric = String(metric ?? '')
    .trim()
    .toLowerCase()

  return (
    Object.entries(metricConfigs).find(
      ([metricId, config]) =>
        metricId.toLowerCase() === normalizedMetric || config.apiKey === normalizedMetric,
    )?.[0] ?? ''
  )
}

async function refreshRealtimeNotificationTelemetry(equipmentId) {
  const requestId = (realtimeNotificationRequestIds.get(equipmentId) ?? 0) + 1
  realtimeNotificationRequestIds.set(equipmentId, requestId)

  const baseEquipment = factoryScene.equipmentList.find((item) => item.id === equipmentId)

  if (!baseEquipment) {
    return false
  }

  try {
    const shouldMergeIncrementalTelemetry =
      metricChartRange.mode !== 'custom' && hasChartPoints(baseEquipment)
    const updatedEquipmentResponse = await fetchEquipmentTelemetry(
      equipmentId,
      baseEquipment,
      shouldMergeIncrementalTelemetry
        ? getIncrementalMetricChartQuery(baseEquipment)
        : getMetricChartQuery(),
    )

    if (realtimeNotificationRequestIds.get(equipmentId) !== requestId) {
      return false
    }

    const updatedEquipment = shouldMergeIncrementalTelemetry
      ? mergeIncrementalTelemetry(baseEquipment, updatedEquipmentResponse)
      : updatedEquipmentResponse

    updateEquipmentTelemetry(updatedEquipment)

    if (selectedEquipmentId.value === equipmentId) {
      realtimeRevision.value += 1
    }
    return true
  } catch {
    // The regular polling path retries transient telemetry refresh failures.
    return false
  }
}

function scheduleRealtimeNotificationTelemetryRefresh(equipmentId) {
  const activeState = realtimeNotificationRefreshStates.get(equipmentId)

  if (activeState) {
    activeState.shouldRefreshAgain = true
    return activeState.promise
  }

  const refreshState = {
    promise: null,
    shouldRefreshAgain: false,
  }

  refreshState.promise = (async () => {
    let didRefresh = false

    do {
      refreshState.shouldRefreshAgain = false
      const didRefreshCurrentRequest = await refreshRealtimeNotificationTelemetry(equipmentId)

      didRefresh ||= didRefreshCurrentRequest

      if (didRefreshCurrentRequest) {
        realtimeNotificationUpdatedAt.set(equipmentId, Date.now())
      }
    } while (refreshState.shouldRefreshAgain)

    return didRefresh
  })().finally(() => {
    if (realtimeNotificationRefreshStates.get(equipmentId) === refreshState) {
      realtimeNotificationRefreshStates.delete(equipmentId)
    }
  })

  realtimeNotificationRefreshStates.set(equipmentId, refreshState)
  return refreshState.promise
}

function applyRealtimeNotification(notification) {
  const equipmentId = notification?.equipmentId ?? notification?.equipmentCode
  const equipment = factoryScene.equipmentList.find((item) => item.id === equipmentId)

  if (!equipment || !['warning', 'danger'].includes(notification?.tone)) {
    return
  }

  const metricId = getNotificationMetricId(notification.metric)
  const nextAlarmMetricIds = metricId
    ? [metricId, ...(equipment.alarmMetricIds ?? []).filter((item) => item !== metricId)]
    : (equipment.alarmMetricIds ?? [])
  const updatedEquipment = {
    ...equipment,
    alarmCode: notification.code || equipment.alarmCode,
    alarmMetricIds: nextAlarmMetricIds,
    status: equipmentStatusMap[notification.tone],
  }

  realtimeSnapshotRequestId += 1
  updateEquipmentTelemetry(updatedEquipment)
  scheduleRealtimeNotificationTelemetryRefresh(equipmentId)
}

function focusActiveAlertToast(notification) {
  const equipmentId = notification?.equipmentId ?? notification?.equipmentCode

  if (!equipmentId || !['warning', 'danger'].includes(notification?.tone)) {
    return
  }

  alertFocusRequest.value = {
    equipmentId,
    key: `toast:${notification.toastKey ?? notification.id ?? Date.now()}:${equipmentId}`,
  }
}

function applyRequestedEquipmentFocus(request) {
  const equipmentId = request?.equipmentId ?? request?.equipmentCode

  if (!equipmentId) {
    return
  }

  alertFocusRequest.value = {
    equipmentId,
    force: true,
    key: request.key || `header-notification:${Date.now()}:${equipmentId}`,
  }
}

function hasChartPoints(equipment) {
  return Object.values(equipment?.charts ?? {}).some((chart) => chart.points?.length)
}

function mergeEquipmentWithPreviousTelemetry(equipment, previousEquipmentMap) {
  const previousEquipment = previousEquipmentMap.get(equipment.id)

  if (!previousEquipment) {
    return equipment
  }

  return {
    ...equipment,
    charts: hasChartPoints(previousEquipment) ? previousEquipment.charts : equipment.charts,
  }
}

function applyFactoryScene(nextFactoryScene) {
  const previousEquipmentMap = new Map(
    factoryScene.equipmentList.map((equipment) => [equipment.id, equipment]),
  )
  const nextEquipmentList = nextFactoryScene.equipmentList.map((equipment) =>
    mergeEquipmentWithPreviousTelemetry(equipment, previousEquipmentMap),
  )
  const nextEquipmentMap = new Map(nextEquipmentList.map((equipment) => [equipment.id, equipment]))
  const nextLineGroups = nextFactoryScene.lineGroups.map((line) => ({
    ...line,
    equipment: line.equipment.map((equipment) => nextEquipmentMap.get(equipment.id) ?? equipment),
  }))

  factoryScene.defaultEquipmentId = nextFactoryScene.defaultEquipmentId
  factoryScene.equipmentList = nextEquipmentList
  factoryScene.lineGroups = nextLineGroups
  factoryScene.statusSummary = nextFactoryScene.statusSummary

  if (
    !selectedEquipmentId.value ||
    !factoryScene.equipmentList.some((equipment) => equipment.id === selectedEquipmentId.value)
  ) {
    selectedEquipmentId.value = factoryScene.defaultEquipmentId
  }
}

function updateEquipmentTelemetry(updatedEquipment) {
  if (!updatedEquipment?.id) {
    return
  }

  const nextEquipmentList = factoryScene.equipmentList.map((equipment) =>
    equipment.id === updatedEquipment.id ? updatedEquipment : equipment,
  )
  factoryScene.equipmentList = nextEquipmentList
  factoryScene.lineGroups = factoryScene.lineGroups.map((line) => ({
    ...line,
    equipment: line.equipment.map((equipment) =>
      equipment.id === updatedEquipment.id ? updatedEquipment : equipment,
    ),
  }))
  factoryScene.statusSummary = createFactoryStatusSummary(nextEquipmentList)
}

function getEquipmentTelemetrySignature(equipment) {
  const chartSignature = Object.entries(equipment?.charts ?? {})
    .map(([metricId, chart]) => {
      const lastPoint = chart?.points?.at(-1)

      return [
        metricId,
        chart?.points?.length ?? 0,
        lastPoint?.timestamp ?? '',
        lastPoint?.value ?? '',
        lastPoint?.statusTone ?? '',
      ].join(':')
    })
    .join('|')

  return JSON.stringify({
    alarmCode: equipment?.alarmCode,
    alarmMetricIds: equipment?.alarmMetricIds,
    chartSignature,
    inspectedAt: equipment?.inspectedAt,
    metrics: equipment?.metrics,
    owner: equipment?.owner,
    statusTone: equipment?.status?.tone,
    updatedAt: equipment?.updatedAt,
  })
}

function updateEquipmentTelemetryIfChanged(updatedEquipment) {
  const currentEquipment = factoryScene.equipmentList.find(
    (equipment) => equipment.id === updatedEquipment?.id,
  )

  if (
    currentEquipment &&
    getEquipmentTelemetrySignature(currentEquipment) ===
      getEquipmentTelemetrySignature(updatedEquipment)
  ) {
    return false
  }

  updateEquipmentTelemetry(updatedEquipment)
  return true
}

function createFactoryStatusSummary(equipmentList) {
  return equipmentStatusOrder.map((statusTone) => ({
    count: equipmentList.filter((equipment) => equipment.status?.tone === statusTone).length,
    id: statusTone,
    label: equipmentStatusMap[statusTone].label,
    tone: statusTone,
  }))
}

function applyEquipmentStatusSnapshot(statusItems = []) {
  const statusByEquipmentId = new Map(
    statusItems
      .map((statusItem) => [statusItem.equipment_id ?? statusItem.equipmentId, statusItem])
      .filter(([equipmentId]) => equipmentId),
  )
  let hasChanges = false
  const nextEquipmentList = factoryScene.equipmentList.map((equipment) => {
    const statusItem = statusByEquipmentId.get(equipment.id)

    if (!statusItem) {
      return equipment
    }

    const nextStatus = normalizeEquipmentStatus(statusItem.status)
    const nextAlarmCode = statusItem.alarm_code || statusItem.alarmCode || equipment.alarmCode

    if (nextStatus.tone === equipment.status?.tone && nextAlarmCode === equipment.alarmCode) {
      return equipment
    }

    hasChanges = true
    return {
      ...equipment,
      alarmCode: nextAlarmCode,
      status: nextStatus,
    }
  })

  if (!hasChanges) {
    return
  }

  const nextEquipmentMap = new Map(nextEquipmentList.map((equipment) => [equipment.id, equipment]))
  factoryScene.equipmentList = nextEquipmentList
  factoryScene.lineGroups = factoryScene.lineGroups.map((line) => ({
    ...line,
    equipment: line.equipment.map((equipment) => nextEquipmentMap.get(equipment.id) ?? equipment),
  }))
  factoryScene.statusSummary = createFactoryStatusSummary(nextEquipmentList)
}

function getMetricChartQuery() {
  if (metricChartRange.mode === 'custom') {
    return {
      end: metricChartRange.end,
      start: metricChartRange.start,
    }
  }

  const end = new Date()
  const start = new Date(end.getTime() - metricChartRange.minutes * 60 * 1000)

  return {
    end: end.toISOString(),
    start: start.toISOString(),
  }
}

function getIncrementalMetricChartQuery(equipment) {
  const fullRange = getMetricChartQuery()

  if (metricChartRange.mode === 'custom') {
    return fullRange
  }

  const latestTimestamp = Object.values(equipment?.charts ?? {})
    .map((chart) => chart?.points?.at(-1)?.timestamp)
    .filter(Boolean)
    .toSorted()
    .at(-1)

  if (!latestTimestamp || !Number.isFinite(Date.parse(latestTimestamp))) {
    return fullRange
  }

  return {
    ...fullRange,
    start: new Date(latestTimestamp).toISOString(),
  }
}

function mergeIncrementalTelemetry(baseEquipment, updatedEquipment) {
  const rangeStart = Date.parse(getMetricChartQuery().start)
  const metricIds = new Set([
    ...Object.keys(baseEquipment?.charts ?? {}),
    ...Object.keys(updatedEquipment?.charts ?? {}),
  ])
  const charts = Object.fromEntries(
    [...metricIds].map((metricId) => {
      const currentChart = baseEquipment?.charts?.[metricId]
      const updatedChart = updatedEquipment?.charts?.[metricId]
      const pointMap = new Map(
        [...(currentChart?.points ?? []), ...(updatedChart?.points ?? [])].map((point) => [
          point.timestamp,
          point,
        ]),
      )
      const points = [...pointMap.values()]
        .filter(
          (point) => !Number.isFinite(rangeStart) || Date.parse(point.timestamp) >= rangeStart,
        )
        .toSorted((first, second) => Date.parse(first.timestamp) - Date.parse(second.timestamp))

      return [
        metricId,
        {
          ...currentChart,
          ...updatedChart,
          points,
        },
      ]
    }),
  )

  return {
    ...updatedEquipment,
    charts,
  }
}

async function loadRealtimeSnapshot({
  includeFactoryScene = false,
  includeStatusSnapshot = false,
  includeTelemetry = true,
  incrementalTelemetry = false,
} = {}) {
  const equipmentId = selectedEquipmentId.value

  if (!equipmentId && !includeFactoryScene && !includeStatusSnapshot) {
    return
  }

  const requestId = ++realtimeSnapshotRequestId
  const baseEquipment = selectedEquipment.value
  const shouldMergeIncrementalTelemetry =
    incrementalTelemetry && metricChartRange.mode !== 'custom' && hasChartPoints(baseEquipment)
  const chartQuery = shouldMergeIncrementalTelemetry
    ? getIncrementalMetricChartQuery(baseEquipment)
    : getMetricChartQuery()

  const [sceneResult, statusResult, telemetryResult] = await Promise.allSettled([
    includeFactoryScene ? fetchFactoryScene() : Promise.resolve(null),
    includeStatusSnapshot ? fetchEquipmentStatuses() : Promise.resolve(null),
    equipmentId && includeTelemetry
      ? fetchEquipmentTelemetry(equipmentId, baseEquipment, chartQuery)
      : Promise.resolve(null),
  ])

  if (requestId !== realtimeSnapshotRequestId) {
    return
  }

  if (sceneResult.status === 'fulfilled' && sceneResult.value) {
    applyFactoryScene(sceneResult.value)
  } else if (!factoryScene.equipmentList.length) {
    applyFactoryScene(createEmptyFactoryScene())
  }

  if (statusResult.status === 'fulfilled' && statusResult.value) {
    applyEquipmentStatusSnapshot(statusResult.value)
  }

  if (equipmentId && selectedEquipmentId.value === equipmentId) {
    if (telemetryResult.status === 'fulfilled' && telemetryResult.value) {
      const updatedEquipment = shouldMergeIncrementalTelemetry
        ? mergeIncrementalTelemetry(baseEquipment, telemetryResult.value)
        : telemetryResult.value

      updateEquipmentTelemetryIfChanged(updatedEquipment)
    }
  }
}

async function loadInitialRealtimeSnapshot() {
  isDashboardInitializing = true

  try {
    const nextFactoryScene = await fetchFactoryScene()

    applyFactoryScene(nextFactoryScene)
    await Promise.all([
      loadRealtimeSnapshot({ includeFactoryScene: false }),
      loadAssistantSuggestions(assistantContextEquipment.value),
    ])
  } catch {
    if (!factoryScene.equipmentList.length) {
      applyFactoryScene(createEmptyFactoryScene())
    }
  } finally {
    isDashboardInitializing = false
    isQuickCommandsLoading.value = false
  }
}

async function loadSelectedEquipmentSnapshot(equipmentId) {
  if (!equipmentId) {
    return
  }

  const requestId = ++equipmentSwitchRequestId
  const notificationRefreshState = realtimeNotificationRefreshStates.get(equipmentId)
  const wasRecentlyRefreshed =
    Date.now() - (realtimeNotificationUpdatedAt.get(equipmentId) ?? 0) < 800
  const telemetryRequest =
    notificationRefreshState?.promise.then((didRefresh) =>
      didRefresh ? undefined : loadRealtimeSnapshot({ includeFactoryScene: false }),
    ) ??
    (wasRecentlyRefreshed
      ? Promise.resolve()
      : loadRealtimeSnapshot({ includeFactoryScene: false }))

  isEquipmentSwitching.value = true
  loadAssistantSuggestions(assistantContextEquipment.value)

  try {
    await telemetryRequest
  } finally {
    if (requestId === equipmentSwitchRequestId) {
      isEquipmentSwitching.value = false
    }
  }
}

async function applyMetricChartRange(range) {
  metricChartRange.mode = range.mode === 'custom' ? 'custom' : 'live'
  metricChartRange.minutes = Number(range.minutes) || 10
  metricChartRange.start = range.start || ''
  metricChartRange.end = range.end || ''

  await loadRealtimeSnapshot({ includeFactoryScene: false })
}

async function returnMetricChartToLive() {
  await applyMetricChartRange({ mode: 'live', minutes: 10 })
}

function startRealtimePolling() {
  window.clearInterval(realtimeSnapshotInterval)
  nextStatusPollAt = Date.now() + statusPollingInterval
  realtimeSnapshotInterval = window.setInterval(async () => {
    if (document.hidden || isRealtimePollPending) {
      return
    }

    isRealtimePollPending = true

    try {
      const now = Date.now()
      const includeStatusSnapshot = now >= nextStatusPollAt

      if (includeStatusSnapshot) {
        nextStatusPollAt = now + statusPollingInterval
      }

      const includeTelemetry = metricChartRange.mode !== 'custom'

      if (!includeTelemetry && !includeStatusSnapshot) {
        return
      }

      await loadRealtimeSnapshot({
        includeStatusSnapshot,
        includeTelemetry,
        incrementalTelemetry: includeTelemetry,
      })
    } finally {
      isRealtimePollPending = false
    }
  }, realtimePollingInterval)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function normalizeLayout(layout) {
  const width = clamp(layout.w, 0, 100)
  const height = clamp(layout.h, 0, 100)

  return {
    h: height,
    w: width,
    x: clamp(layout.x, 0, 100 - width),
    y: clamp(layout.y, 0, 100 - height),
  }
}

function getBoardRect() {
  return layoutBoardRef.value?.getBoundingClientRect()
}

function getGridMetrics() {
  const boardRect = getBoardRect()

  if (!boardRect?.width || !boardRect?.height) {
    return null
  }

  const columnWidth = (boardRect.width - widgetGapPx * (layoutGridColumns - 1)) / layoutGridColumns
  const rowHeight = (boardRect.height - widgetGapPx * (layoutGridRows - 1)) / layoutGridRows

  return {
    boardRect,
    columnStride: columnWidth + widgetGapPx,
    columnWidth,
    rowHeight,
    rowStride: rowHeight + widgetGapPx,
  }
}

function gridToPercentLayout(grid, metrics = getGridMetrics()) {
  if (!metrics) {
    return normalizeLayout({
      h: (grid.rows / layoutGridRows) * 100,
      w: (grid.cols / layoutGridColumns) * 100,
      x: (grid.col / layoutGridColumns) * 100,
      y: (grid.row / layoutGridRows) * 100,
    })
  }

  return normalizeLayout({
    h:
      ((grid.rows * metrics.rowHeight + widgetGapPx * (grid.rows - 1)) / metrics.boardRect.height) *
      100,
    w:
      ((grid.cols * metrics.columnWidth + widgetGapPx * (grid.cols - 1)) /
        metrics.boardRect.width) *
      100,
    x: ((grid.col * metrics.columnStride) / metrics.boardRect.width) * 100,
    y: ((grid.row * metrics.rowStride) / metrics.boardRect.height) * 100,
  })
}

function getMinGridSize(id, metrics = getGridMetrics()) {
  const meta = widgetMeta[id]

  if (!metrics || !meta) {
    return { cols: 1, rows: 1 }
  }

  return {
    cols: clamp(
      Math.ceil((meta.minWidth + widgetGapPx) / metrics.columnStride),
      1,
      layoutGridColumns,
    ),
    rows: clamp(Math.ceil((meta.minHeight + widgetGapPx) / metrics.rowStride), 1, layoutGridRows),
  }
}

function percentToGrid(layout, id, metrics = getGridMetrics()) {
  if (!metrics) {
    return null
  }

  const minSize = getMinGridSize(id, metrics)
  const layoutWidth = (layout.w / 100) * metrics.boardRect.width
  const layoutHeight = (layout.h / 100) * metrics.boardRect.height
  const layoutX = (layout.x / 100) * metrics.boardRect.width
  const layoutY = (layout.y / 100) * metrics.boardRect.height
  const cols = clamp(
    Math.round((layoutWidth + widgetGapPx) / metrics.columnStride),
    minSize.cols,
    layoutGridColumns,
  )
  const rows = clamp(
    Math.round((layoutHeight + widgetGapPx) / metrics.rowStride),
    minSize.rows,
    layoutGridRows,
  )

  return {
    col: clamp(Math.round(layoutX / metrics.columnStride), 0, layoutGridColumns - cols),
    cols,
    row: clamp(Math.round(layoutY / metrics.rowStride), 0, layoutGridRows - rows),
    rows,
  }
}

function snapLayoutToGrid(layout, id) {
  const grid = percentToGrid(normalizeLayout(layout), id)

  if (!grid) {
    return normalizeLayout(layout)
  }

  return gridToPercentLayout(grid)
}

function getMovePreviewGrid(layout, id, metrics = getGridMetrics()) {
  const baseGrid = percentToGrid(widgetLayouts[id], id, metrics)
  const sizeGrid = percentToGrid(layout, id, metrics)

  if (!metrics || !baseGrid || !sizeGrid) {
    return null
  }

  const layoutX = (layout.x / 100) * metrics.boardRect.width
  const layoutY = (layout.y / 100) * metrics.boardRect.height
  const rawCol = layoutX / metrics.columnStride
  const rawRow = layoutY / metrics.rowStride
  const snapThreshold = 0.32
  let col = baseGrid.col
  let row = baseGrid.row

  if (rawCol > baseGrid.col + snapThreshold) {
    col = Math.ceil(rawCol - snapThreshold)
  } else if (rawCol < baseGrid.col - snapThreshold) {
    col = Math.floor(rawCol + snapThreshold)
  }

  if (rawRow > baseGrid.row + snapThreshold) {
    row = Math.ceil(rawRow - snapThreshold)
  } else if (rawRow < baseGrid.row - snapThreshold) {
    row = Math.floor(rawRow + snapThreshold)
  }

  return {
    col: clamp(col, 0, layoutGridColumns - sizeGrid.cols),
    cols: sizeGrid.cols,
    row: clamp(row, 0, layoutGridRows - sizeGrid.rows),
    rows: sizeGrid.rows,
  }
}

function layoutsAreEqual(firstLayout, secondLayout) {
  const threshold = 0.02

  return (
    Math.abs(firstLayout.x - secondLayout.x) <= threshold &&
    Math.abs(firstLayout.y - secondLayout.y) <= threshold &&
    Math.abs(firstLayout.w - secondLayout.w) <= threshold &&
    Math.abs(firstLayout.h - secondLayout.h) <= threshold
  )
}

function snapStoredLayoutsToGrid() {
  Object.entries(widgetLayouts).forEach(([widgetId, layout]) => {
    const snappedLayout = snapLayoutToGrid(layout, widgetId)

    if (!layoutsAreEqual(layout, snappedLayout)) {
      widgetLayouts[widgetId] = snappedLayout
    }
  })
}

function clearPreviewLayouts() {
  Object.keys(previewLayouts).forEach((widgetId) => {
    delete previewLayouts[widgetId]
  })
}

function setPreviewLayouts(layouts) {
  clearPreviewLayouts()

  if (!layouts) {
    return
  }

  Object.entries(layouts).forEach(([widgetId, layout]) => {
    if (widgetLayouts[widgetId]) {
      previewLayouts[widgetId] = snapLayoutToGrid(layout, widgetId)
    }
  })
}

function getWidgetLayout(id) {
  return previewLayouts[id] ?? widgetLayouts[id]
}

function applyDefaultLayouts() {
  const metrics = getGridMetrics()

  if (!metrics) {
    return
  }

  Object.entries(defaultLayoutGrid).forEach(([widgetId, grid]) => {
    widgetLayouts[widgetId] = gridToPercentLayout(grid, metrics)
  })
}

function normalizeStoredWidgetGrid(widgetId, grid, metrics) {
  if (!grid || typeof grid !== 'object') {
    return null
  }

  const values = [grid.col, grid.cols, grid.row, grid.rows].map(Number)

  if (!values.every(Number.isFinite)) {
    return null
  }

  const minSize = getMinGridSize(widgetId, metrics)
  const cols = clamp(Math.round(grid.cols), minSize.cols, layoutGridColumns)
  const rows = clamp(Math.round(grid.rows), minSize.rows, layoutGridRows)

  return {
    col: clamp(Math.round(grid.col), 0, layoutGridColumns - cols),
    cols,
    row: clamp(Math.round(grid.row), 0, layoutGridRows - rows),
    rows,
  }
}

function restoreDashboardLayout() {
  const state = initialDashboardLayoutState
  const metrics = getGridMetrics()

  if (!state || !metrics) {
    return false
  }

  const storedGridMap = Object.fromEntries(
    widgetOrder
      .map((widgetId) => [
        widgetId,
        normalizeStoredWidgetGrid(widgetId, state.layouts?.[widgetId], metrics),
      ])
      .filter(([, grid]) => grid),
  )
  const visibleWidgetIds = widgetOrder.filter(
    (widgetId) => state.visibleWidgets?.[widgetId] ?? visibleWidgetMap[widgetId],
  )
  const hasCollision = visibleWidgetIds.some((widgetId, index) =>
    visibleWidgetIds
      .slice(index + 1)
      .some(
        (targetId) =>
          storedGridMap[widgetId] &&
          storedGridMap[targetId] &&
          gridsOverlap(storedGridMap[widgetId], storedGridMap[targetId]),
      ),
  )

  if (!Object.keys(storedGridMap).length || hasCollision) {
    return false
  }

  Object.entries(storedGridMap).forEach(([widgetId, grid]) => {
    widgetLayouts[widgetId] = gridToPercentLayout(grid, metrics)
  })
  widgetOrder.forEach((widgetId) => {
    const storedVisibility = state.visibleWidgets?.[widgetId]

    if (typeof storedVisibility === 'boolean') {
      visibleWidgetMap[widgetId] = storedVisibility
    }
  })
  hasCustomLayout.value = true

  return true
}

function persistDashboardLayout() {
  const metrics = getGridMetrics()

  if (!metrics) {
    return
  }

  const layouts = Object.fromEntries(
    widgetOrder.map((widgetId) => [
      widgetId,
      percentToGrid(widgetLayouts[widgetId], widgetId, metrics),
    ]),
  )
  const visibleWidgets = Object.fromEntries(
    widgetOrder.map((widgetId) => [widgetId, visibleWidgetMap[widgetId]]),
  )

  saveDashboardLayoutState({ layouts, visibleWidgets })
}

function getLayoutGap() {
  const boardRect = getBoardRect()

  return {
    x: boardRect?.width ? (widgetGapPx / boardRect.width) * 100 : 1.5,
    y: boardRect?.height ? (widgetGapPx / boardRect.height) * 100 : 2.5,
  }
}

function overlapsGap(firstLayout, secondLayout, gap) {
  const threshold = 0.02

  return !(
    firstLayout.x + firstLayout.w + gap.x <= secondLayout.x + threshold ||
    secondLayout.x + secondLayout.w + gap.x <= firstLayout.x + threshold ||
    firstLayout.y + firstLayout.h + gap.y <= secondLayout.y + threshold ||
    secondLayout.y + secondLayout.h + gap.y <= firstLayout.y + threshold
  )
}

function hasLayoutCollision(id, layout, layoutMap = widgetLayouts, visibleMap = visibleWidgetMap) {
  const gap = getLayoutGap()

  return Object.entries(layoutMap).some(
    ([targetId, targetLayout]) =>
      targetId !== id && visibleMap[targetId] && overlapsGap(layout, targetLayout, gap),
  )
}

function getFallbackLayout(id) {
  const minSize = getMinGridSize(id)

  return gridToPercentLayout({
    col: layoutGridColumns - minSize.cols,
    cols: minSize.cols,
    row: layoutGridRows - minSize.rows,
    rows: minSize.rows,
  })
}

function findAvailableLayout(id, layoutMap = widgetLayouts, visibleMap = visibleWidgetMap) {
  const metrics = getGridMetrics()
  const currentLayout = snapLayoutToGrid(layoutMap[id] ?? getFallbackLayout(id), id)
  const preferredLayout = snapLayoutToGrid(currentLayout, id)

  if (!hasLayoutCollision(id, preferredLayout, layoutMap, visibleMap)) {
    return preferredLayout
  }

  if (!metrics) {
    return null
  }

  const preferredGrid = percentToGrid(preferredLayout, id, metrics)
  const minSize = getMinGridSize(id, metrics)
  const candidateSpans = [
    { cols: preferredGrid.cols, rows: preferredGrid.rows },
    { cols: minSize.cols, rows: minSize.rows },
  ]

  for (const span of candidateSpans) {
    for (let row = 0; row <= layoutGridRows - span.rows; row += 1) {
      for (let col = 0; col <= layoutGridColumns - span.cols; col += 1) {
        const candidateLayout = gridToPercentLayout(
          { col, cols: span.cols, row, rows: span.rows },
          metrics,
        )

        if (!hasLayoutCollision(id, candidateLayout, layoutMap, visibleMap)) {
          return candidateLayout
        }
      }
    }
  }

  return null
}

function getCompactedLayoutMap() {
  return Object.fromEntries(
    Object.entries(widgetLayouts).map(([widgetId, layout]) => {
      if (!visibleWidgetMap[widgetId]) {
        return [widgetId, layout]
      }

      const metrics = getGridMetrics()
      const minSize = getMinGridSize(widgetId, metrics)
      const grid = percentToGrid(layout, widgetId, metrics) ?? {
        col: 0,
        cols: minSize.cols,
        row: 0,
        rows: minSize.rows,
      }

      return [
        widgetId,
        gridToPercentLayout({
          col: clamp(grid.col, 0, layoutGridColumns - minSize.cols),
          cols: minSize.cols,
          row: clamp(grid.row, 0, layoutGridRows - minSize.rows),
          rows: minSize.rows,
        }),
      ]
    }),
  )
}

function createRoomForWidget(id) {
  const compactedLayouts = getCompactedLayoutMap()
  const restoreLayout = findAvailableLayout(id, compactedLayouts)

  if (!restoreLayout) {
    return null
  }

  Object.entries(compactedLayouts).forEach(([widgetId, layout]) => {
    if (visibleWidgetMap[widgetId]) {
      widgetLayouts[widgetId] = layout
    }
  })

  return restoreLayout
}

function fitResizeLayout(id, nextLayout) {
  const metrics = getGridMetrics()
  const snappedLayout = snapLayoutToGrid(nextLayout, id)
  const snappedGrid = percentToGrid(snappedLayout, id, metrics)
  const minSize = getMinGridSize(id, metrics)
  const currentLayout = snapLayoutToGrid(widgetLayouts[id], id)

  if (!metrics || !snappedGrid) {
    return currentLayout
  }

  for (let rows = snappedGrid.rows; rows >= minSize.rows; rows -= 1) {
    for (let cols = snappedGrid.cols; cols >= minSize.cols; cols -= 1) {
      const candidateLayout = gridToPercentLayout(
        {
          col: clamp(snappedGrid.col, 0, layoutGridColumns - cols),
          cols,
          row: clamp(snappedGrid.row, 0, layoutGridRows - rows),
          rows,
        },
        metrics,
      )

      if (!hasLayoutCollision(id, candidateLayout)) {
        return candidateLayout
      }
    }
  }

  return gridToPercentLayout(
    percentToGrid(currentLayout, id, metrics) ?? {
      col: clamp(snappedGrid.col, 0, layoutGridColumns - minSize.cols),
      cols: minSize.cols,
      row: clamp(snappedGrid.row, 0, layoutGridRows - minSize.rows),
      rows: minSize.rows,
    },
    metrics,
  )
}

function gridsOverlap(firstGrid, secondGrid) {
  return !(
    firstGrid.col + firstGrid.cols <= secondGrid.col ||
    secondGrid.col + secondGrid.cols <= firstGrid.col ||
    firstGrid.row + firstGrid.rows <= secondGrid.row ||
    secondGrid.row + secondGrid.rows <= firstGrid.row
  )
}

function getGridDistance(firstGrid, secondGrid) {
  return Math.hypot(firstGrid.col - secondGrid.col, firstGrid.row - secondGrid.row)
}

function getCandidatePushCost(candidateGrid, baseGrid, fixedGrid) {
  if (!gridsOverlap(baseGrid, fixedGrid)) {
    return 0
  }

  const baseCenterX = baseGrid.col + baseGrid.cols / 2
  const baseCenterY = baseGrid.row + baseGrid.rows / 2
  const fixedCenterX = fixedGrid.col + fixedGrid.cols / 2
  const fixedCenterY = fixedGrid.row + fixedGrid.rows / 2
  const deltaX = baseCenterX - fixedCenterX
  const deltaY = baseCenterY - fixedCenterY
  const isHorizontalPush = Math.abs(deltaX) >= Math.abs(deltaY)

  if (isHorizontalPush) {
    const sameRowCost = candidateGrid.row === baseGrid.row ? 0 : 0.75
    const directionCost =
      deltaX >= 0
        ? candidateGrid.col >= fixedGrid.col + fixedGrid.cols
          ? 0
          : 0.45
        : candidateGrid.col + candidateGrid.cols <= fixedGrid.col
          ? 0
          : 0.45

    return sameRowCost + directionCost
  }

  const sameColumnCost = candidateGrid.col === baseGrid.col ? 0 : 0.75
  const directionCost =
    deltaY >= 0
      ? candidateGrid.row >= fixedGrid.row + fixedGrid.rows
        ? 0
        : 0.45
      : candidateGrid.row + candidateGrid.rows <= fixedGrid.row
        ? 0
        : 0.45

  return sameColumnCost + directionCost
}

function getGridCandidates(baseGrid, fixedGrid) {
  const candidates = []

  for (let row = 0; row <= layoutGridRows - baseGrid.rows; row += 1) {
    for (let col = 0; col <= layoutGridColumns - baseGrid.cols; col += 1) {
      candidates.push({
        col,
        cols: baseGrid.cols,
        row,
        rows: baseGrid.rows,
      })
    }
  }

  return candidates.sort((first, second) => {
    const distanceDiff =
      getGridDistance(first, baseGrid) +
      getCandidatePushCost(first, baseGrid, fixedGrid) -
      (getGridDistance(second, baseGrid) + getCandidatePushCost(second, baseGrid, fixedGrid))

    if (distanceDiff !== 0) {
      return distanceDiff
    }

    return first.row - second.row || first.col - second.col
  })
}

function createPushedGridLayouts(id, fixedGrid, metrics) {
  const visibleIds = widgetOrder.filter((widgetId) => visibleWidgetMap[widgetId])
  const baseGrids = Object.fromEntries(
    visibleIds.map((widgetId) => [
      widgetId,
      widgetId === id
        ? fixedGrid
        : (percentToGrid(widgetLayouts[widgetId], widgetId, metrics) ??
          percentToGrid(getFallbackLayout(widgetId), widgetId, metrics)),
    ]),
  )
  const movingIds = visibleIds
    .filter((widgetId) => widgetId !== id)
    .sort((firstId, secondId) => {
      const firstCollides = gridsOverlap(fixedGrid, baseGrids[firstId]) ? 0 : 1
      const secondCollides = gridsOverlap(fixedGrid, baseGrids[secondId]) ? 0 : 1

      return (
        firstCollides - secondCollides ||
        getGridDistance(baseGrids[firstId], fixedGrid) -
          getGridDistance(baseGrids[secondId], fixedGrid)
      )
    })
  let bestSolution = null
  let bestScore = Number.POSITIVE_INFINITY

  function placeWidget(index, placedGrids, score) {
    if (score >= bestScore) {
      return
    }

    if (index >= movingIds.length) {
      bestSolution = placedGrids
      bestScore = score
      return
    }

    const widgetId = movingIds[index]
    const baseGrid = baseGrids[widgetId]

    getGridCandidates(baseGrid, fixedGrid).forEach((candidateGrid) => {
      const hasCollision = Object.values(placedGrids).some((placedGrid) =>
        gridsOverlap(candidateGrid, placedGrid),
      )

      if (hasCollision) {
        return
      }

      const movementCost = getGridDistance(candidateGrid, baseGrid)
      const changedCost = movementCost === 0 ? 0 : 0.35
      const pushCost = getCandidatePushCost(candidateGrid, baseGrid, fixedGrid)

      placeWidget(
        index + 1,
        { ...placedGrids, [widgetId]: candidateGrid },
        score + movementCost + changedCost + pushCost,
      )
    })
  }

  placeWidget(0, { [id]: fixedGrid }, 0)

  return bestSolution
}

function resolveMoveLayout(id, nextLayout) {
  const visualLayout = normalizeLayout(nextLayout)
  const metrics = getGridMetrics()
  const fixedGrid = getMovePreviewGrid(visualLayout, id, metrics)
  const resolvedLayout = fixedGrid
    ? gridToPercentLayout(fixedGrid, metrics)
    : snapLayoutToGrid(nextLayout, id)
  const currentLayout = snapLayoutToGrid(widgetLayouts[id], id)

  if (!metrics || !fixedGrid) {
    return {
      layout: currentLayout,
      layouts: { [id]: currentLayout },
      state: 'valid',
    }
  }

  const resolvedGridMap = createPushedGridLayouts(id, fixedGrid, metrics)

  if (!resolvedGridMap) {
    return {
      layout: currentLayout,
      layouts: { [id]: currentLayout },
      state: 'invalid',
    }
  }

  const resolvedLayouts = Object.fromEntries(
    Object.entries(resolvedGridMap).map(([widgetId, grid]) => [
      widgetId,
      gridToPercentLayout(grid, metrics),
    ]),
  )

  return {
    layout: resolvedLayout,
    layouts: resolvedLayouts,
    state: 'valid',
  }
}

function resolveLayoutChange(id, nextLayout, mode) {
  if (mode === 'move') {
    return resolveMoveLayout(id, nextLayout)
  }

  const fittedLayout = fitResizeLayout(id, nextLayout)

  return {
    layout: fittedLayout,
    layouts: { [id]: fittedLayout },
    state: 'valid',
  }
}

function restoreWidget(id) {
  const restoreLayout = findAvailableLayout(id) ?? createRoomForWidget(id)

  if (!restoreLayout) {
    return
  }

  hasCustomLayout.value = true
  widgetLayouts[id] = restoreLayout
  visibleWidgetMap[id] = true
  persistDashboardLayout()
}

function stashWidget(id) {
  hasCustomLayout.value = true
  visibleWidgetMap[id] = false
  persistDashboardLayout()
}

function updateWidgetLayout(id, nextLayout) {
  const nextLayouts = nextLayout?.[id] ? nextLayout : { [id]: nextLayout }

  hasCustomLayout.value = true
  clearPreviewLayouts()

  Object.entries(nextLayouts).forEach(([widgetId, layout]) => {
    if (widgetLayouts[widgetId]) {
      widgetLayouts[widgetId] = snapLayoutToGrid(layout, widgetId)
    }
  })
  persistDashboardLayout()
}

function requestContentRenderFrame(callback) {
  return typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame(callback)
    : window.setTimeout(callback, 16)
}

function cancelContentLoadingFrame() {
  if (!contentLoadingFrame) {
    return
  }

  if (typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(contentLoadingFrame)
  } else {
    window.clearTimeout(contentLoadingFrame)
  }

  contentLoadingFrame = 0
}

function hideContentLoadingAfterRender() {
  cancelContentLoadingFrame()

  nextTick(() => {
    contentLoadingFrame = requestContentRenderFrame(() => {
      contentLoadingFrame = requestContentRenderFrame(() => {
        contentLoadingFrame = 0
        isContentLoading.value = false
      })
    })
  })
}

async function loadInitialDashboardContent() {
  cancelContentLoadingFrame()
  isContentLoading.value = true

  if (!shouldSkipDashboardApi) {
    await Promise.allSettled([
      loadInitialRealtimeSnapshot(),
      startAlertToastStream({
        onActiveToast: focusActiveAlertToast,
        onNotification: applyRealtimeNotification,
      }),
      loadAssistantHistoryItems(),
    ])
    startRealtimePolling()
  }

  hideContentLoadingAfterRender()
}

onMounted(() => {
  loadInitialDashboardContent()

  if (!restoreDashboardLayout()) {
    applyDefaultLayouts()
  }

  if (typeof ResizeObserver === 'undefined') {
    return
  }

  layoutResizeObserver = new ResizeObserver(() => {
    if (!hasCustomLayout.value) {
      applyDefaultLayouts()
      return
    }

    snapStoredLayoutsToGrid()
  })

  if (layoutBoardRef.value) {
    layoutResizeObserver.observe(layoutBoardRef.value)
  }
})

onBeforeUnmount(() => {
  cancelContentLoadingFrame()
  window.clearInterval(realtimeSnapshotInterval)
  isRealtimePollPending = false
  realtimeNotificationRequestIds.clear()
  realtimeNotificationRefreshStates.clear()
  realtimeNotificationUpdatedAt.clear()
  assistantSuggestionCache.clear()
  assistantSuggestionRequests.clear()
  stopAlertToastStream()
  layoutResizeObserver?.disconnect()
})

watch(selectedEquipment, (equipment) => {
  syncSelectedMetricWithEquipment(equipment)
})

watch(selectedEquipmentId, (equipmentId) => {
  if (!isDashboardInitializing) {
    loadSelectedEquipmentSnapshot(equipmentId)
  }
})

watch(
  equipmentFocusRequest,
  () => {
    const request = consumeEquipmentFocusRequest()

    if (request) {
      applyRequestedEquipmentFocus(request)
    }
  },
  { immediate: true },
)
</script>

<template>
  <main class="dashboard-page" :class="{ 'dashboard-page--sidebar-open': isSidebarOpen }">
    <DashboardHeader />
    <DashboardSidebar
      :dock-widgets="dockWidgets"
      :items="dashboardNavigation"
      :open="isSidebarOpen"
      @restore-widget="restoreWidget"
      @toggle="toggleSidebar"
    />

    <DashboardAlertToast
      :active-notification-id="activeNotificationId"
      :is-responding="isIncidentCreating"
      :response-error="incidentErrorMessage"
      :response-error-notification-id="incidentErrorNotificationId"
      :toasts="alertToasts"
      @pause="pauseAlertToast"
      @respond="startIncidentResponse"
      @resume="resumeAlertToast"
    />

    <section class="dashboard-content" :aria-label="t('dashboard.editArea')">
      <Transition name="dashboard-content-loader">
        <DashboardContentLoader v-if="isContentLoading" :label="t('dashboard.loading')" />
      </Transition>

      <div
        class="dashboard-content__body"
        :class="{ 'dashboard-content__body--loading': isContentLoading }"
      >
        <div ref="layoutBoardRef" class="dashboard-layout-board" data-test="dashboard-layout-board">
          <DashboardEditableWidget
            v-if="visibleWidgetMap.factory"
            id="factory"
            :layout="getWidgetLayout('factory')"
            :min-width="widgetMeta.factory.minWidth"
            :min-height="widgetMeta.factory.minHeight"
            :resolve-layout="resolveLayoutChange"
            @preview:layout="setPreviewLayouts"
            @stash="stashWidget('factory')"
            @update:layout="updateWidgetLayout('factory', $event)"
          >
            <FactoryViewport
              :alert-focus-request="alertFocusRequest"
              :checklist-items="selectedChecklistItems"
              :conversation-equipment-id="conversationEquipmentId"
              :is-equipment-switching="isEquipmentSwitching"
              :lines="factoryScene.lineGroups"
              :selected-equipment-id="selectedEquipmentId"
              @select-equipment="selectFactoryEquipment"
            />
          </DashboardEditableWidget>

          <DashboardEditableWidget
            v-if="visibleWidgetMap.detail"
            id="detail"
            :layout="getWidgetLayout('detail')"
            :min-width="widgetMeta.detail.minWidth"
            :min-height="widgetMeta.detail.minHeight"
            :resolve-layout="resolveLayoutChange"
            @preview:layout="setPreviewLayouts"
            @stash="stashWidget('detail')"
            @update:layout="updateWidgetLayout('detail', $event)"
          >
            <EquipmentDetailPanel
              :equipment="selectedEquipment"
              :selected-metric-id="selectedMetricId"
              @update:selected-metric-id="selectMetric"
            />
          </DashboardEditableWidget>

          <DashboardEditableWidget
            v-if="visibleWidgetMap.metricChart"
            id="metricChart"
            :layout="getWidgetLayout('metricChart')"
            :min-width="widgetMeta.metricChart.minWidth"
            :min-height="widgetMeta.metricChart.minHeight"
            :resolve-layout="resolveLayoutChange"
            @preview:layout="setPreviewLayouts"
            @stash="stashWidget('metricChart')"
            @update:layout="updateWidgetLayout('metricChart', $event)"
          >
            <EquipmentChartPanel
              :chart="selectedChart"
              :metrics="selectedEquipment.metrics"
              :range="metricChartRange"
              :selected-metric-id="selectedMetricId"
              @request-range="applyMetricChartRange"
              @return-live="returnMetricChartToLive"
              @update:selected-metric-id="selectMetric"
            />
          </DashboardEditableWidget>

          <DashboardEditableWidget
            v-if="visibleWidgetMap.assistant"
            id="assistant"
            :layout="getWidgetLayout('assistant')"
            :min-width="widgetMeta.assistant.minWidth"
            :min-height="widgetMeta.assistant.minHeight"
            :resolve-layout="resolveLayoutChange"
            @preview:layout="setPreviewLayouts"
            @stash="stashWidget('assistant')"
            @update:layout="updateWidgetLayout('assistant', $event)"
          >
            <AssistantPanel
              :history-items="assistantHistoryItems"
              :is-history-loading="isAssistantHistoryLoading"
              :is-loading="isAssistantLoading"
              :is-quick-command-loading="isQuickCommandsLoading"
              :messages="assistantMessages"
              :open-conversation-request="assistantOpenConversationRequest"
              :quick-commands="quickCommands"
              @delete-history="deleteAssistantHistory"
              @select-history="selectAssistantHistory"
              @send-message="sendAssistantMessage"
              @view-change="setAssistantPanelView"
            />
          </DashboardEditableWidget>

          <DashboardEditableWidget
            v-if="visibleWidgetMap.equipmentAnalysis"
            id="equipmentAnalysis"
            :layout="getWidgetLayout('equipmentAnalysis')"
            :min-width="widgetMeta.equipmentAnalysis.minWidth"
            :min-height="widgetMeta.equipmentAnalysis.minHeight"
            :resolve-layout="resolveLayoutChange"
            @preview:layout="setPreviewLayouts"
            @stash="stashWidget('equipmentAnalysis')"
            @update:layout="updateWidgetLayout('equipmentAnalysis', $event)"
          >
            <EquipmentAnalysisPanel
              :equipment-id="selectedEquipmentId"
              :start-at="selectedEquipment.inspectionStartedAt"
            />
          </DashboardEditableWidget>

          <DashboardEditableWidget
            v-if="visibleWidgetMap.errorDonut"
            id="errorDonut"
            :layout="getWidgetLayout('errorDonut')"
            :min-width="widgetMeta.errorDonut.minWidth"
            :min-height="widgetMeta.errorDonut.minHeight"
            :resolve-layout="resolveLayoutChange"
            @preview:layout="setPreviewLayouts"
            @stash="stashWidget('errorDonut')"
            @update:layout="updateWidgetLayout('errorDonut', $event)"
          >
            <ErrorDonutPanel
              :equipment-id="selectedEquipmentId"
              :refresh-key="realtimeRevision"
              :start-at="selectedEquipment.inspectionStartedAt"
            />
          </DashboardEditableWidget>

          <DashboardEditableWidget
            v-if="visibleWidgetMap.repairHistory"
            id="repairHistory"
            :layout="getWidgetLayout('repairHistory')"
            :min-width="widgetMeta.repairHistory.minWidth"
            :min-height="widgetMeta.repairHistory.minHeight"
            :resolve-layout="resolveLayoutChange"
            @preview:layout="setPreviewLayouts"
            @stash="stashWidget('repairHistory')"
            @update:layout="updateWidgetLayout('repairHistory', $event)"
          >
            <RepairHistoryPanel :equipment-id="selectedEquipmentId" />
          </DashboardEditableWidget>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.dashboard-page {
  --dashboard-scale: 0.8;
  --dashboard-header-height: 72px;
  --dashboard-sidebar-width: 90px;
  --dashboard-assistant-width: clamp(288px, 17.92vw, 344px);
  --dashboard-page-gutter: 15px;
  --agentory-spacing-4: 3px;
  --agentory-spacing-5: 4px;
  --agentory-spacing-6: 5px;
  --agentory-spacing-8: 6px;
  --agentory-spacing-10: 8px;
  --agentory-spacing-12: 10px;
  --agentory-spacing-14: 11px;
  --agentory-spacing-15: 12px;
  --agentory-spacing-16: 13px;
  --agentory-spacing-17: 14px;
  --agentory-spacing-20: 16px;
  --agentory-spacing-24: 19px;
  --agentory-spacing-25: 20px;
  --agentory-spacing-30: 24px;
  --agentory-spacing-40: 32px;
  --agentory-font-size-h2: 19px;
  --agentory-line-height-h2: 29px;
  --agentory-font-size-body-lg: 16px;
  --agentory-line-height-body-lg: 24px;
  --agentory-font-size-body: 13px;
  --agentory-line-height-body: 19px;
  --agentory-font-size-body-sm: 11px;
  --agentory-line-height-body-sm: 17px;
  --agentory-font-size-caption: 10px;
  --agentory-line-height-caption: 14px;

  min-width: 1024px;
  height: 100vh;
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-app);
}

.dashboard-page--sidebar-open {
  --dashboard-sidebar-width: 162px;
}

.dashboard-content {
  position: fixed;
  top: var(--dashboard-header-height);
  right: 0;
  bottom: 0;
  left: var(--dashboard-sidebar-width);
  padding: var(--dashboard-page-gutter);
  transition: left 260ms ease;
}

.dashboard-content__body {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  transition:
    opacity 260ms var(--agentory-ease-soft),
    filter 360ms var(--agentory-ease-soft),
    transform 440ms var(--agentory-ease-elastic);
}

.dashboard-content__body--loading {
  opacity: 0.38;
  filter: blur(1px);
  transform: translateY(8px) scale(0.992);
}

.dashboard-layout-board {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.dashboard-content-loader-enter-active,
.dashboard-content-loader-leave-active {
  transition:
    opacity 220ms var(--agentory-ease-soft),
    transform 380ms var(--agentory-ease-elastic);
}

.dashboard-content-loader-enter-from,
.dashboard-content-loader-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-content,
  .dashboard-content__body,
  .dashboard-content-loader-enter-active,
  .dashboard-content-loader-leave-active {
    transition: none;
  }
}
</style>
