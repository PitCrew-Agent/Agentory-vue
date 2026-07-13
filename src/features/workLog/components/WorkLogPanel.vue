<script setup>
import { computed, reactive, ref, watch } from 'vue'

import closeIcon from '@/assets/icons/dashboard/close.svg'
import pencilIcon from '@/assets/icons/dashboard/action-pencil.png'
import trashIcon from '@/assets/icons/dashboard/action-trash.svg'
import { workLogStatusMap } from '@/constants/workLogStatus'
import { useAuthStore } from '@/stores/authStore'
import DashboardCalendarPicker from '@/features/dashboard/components/DashboardCalendarPicker.vue'
import DashboardTablePanel from '@/features/dashboard/components/DashboardTablePanel.vue'

const props = defineProps({
  errorMessage: {
    type: String,
    default: '',
  },
  groups: {
    type: Array,
    required: true,
  },
  incidentPlan: {
    type: Object,
    default: null,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['create-log', 'delete-log', 'incident-draft-consumed', 'update-log'])
const authStore = useAuthStore()
const tablePanelRef = ref(null)
const isDeleteConfirmOpen = ref(false)
const isLogModalOpen = ref(false)
const logModalMode = ref('create')
const selectedDeleteLog = ref(null)
const activeIncidentPlan = ref(null)
const createLogForm = reactive({
  date: '',
  endedDate: '',
  endedTime: '',
  id: null,
  operator: authStore.currentUser.name,
  sourceNotificationId: null,
  status: 'waiting',
  task: '',
  time: '',
  workType: '기타',
})

const workLogColumns = [
  { key: 'time', label: '작업 시간', cellClass: 'dashboard-table-panel__cell--light' },
  { key: 'operator', label: '작업 진행자', cellClass: 'dashboard-table-panel__cell--strong' },
  { key: 'workType', label: '작업 유형' },
  { key: 'task', label: '작업 내용', cellClass: 'dashboard-table-panel__cell--strong' },
  {
    key: 'status',
    label: '상태',
    cellClass: 'dashboard-table-panel__cell--center work-log-panel__status-cell',
    headerClass: 'dashboard-table-panel__header-cell--center',
  },
  {
    key: 'actions',
    label: '관리',
    cellClass: 'dashboard-table-panel__cell--center work-log-panel__actions-cell',
    headerClass: 'dashboard-table-panel__header-cell--center',
  },
]

const tableGroups = computed(() =>
  props.groups.map((group) => ({
    ...group,
    rows: group.logs,
  })),
)

const statusOptions = computed(() =>
  ['waiting', 'complete', 'progress'].map((value) => ({
    ...workLogStatusMap[value],
    value,
  })),
)
const workTypeOptions = ['정기점검', '수리점검', '예방점검', '긴급수리', '기타']

const operatorName = computed(() => authStore.currentUserName || '사용자')
const isEditMode = computed(() => logModalMode.value === 'edit')
const logModalTitle = computed(() => (isEditMode.value ? '작업 로그 수정' : '작업 로그 작성'))
const logSubmitLabel = computed(() => {
  if (props.isSubmitting) {
    return isEditMode.value ? '수정 중' : '저장 중'
  }

  return isEditMode.value ? '수정 저장' : '작업 로그 저장'
})

function getToday() {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getCurrentTime() {
  const now = new Date()

  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function splitDateTime(value) {
  if (!value) {
    return { date: '', time: '' }
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    const [datePart = '', timePart = ''] = String(value).split('T')

    return {
      date: datePart.slice(0, 10),
      time: timePart.slice(0, 5),
    }
  }

  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`,
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  }
}

function openCreateModal() {
  activeIncidentPlan.value = null
  createLogForm.date = getToday()
  createLogForm.endedDate = ''
  createLogForm.endedTime = ''
  createLogForm.id = null
  createLogForm.operator = operatorName.value
  createLogForm.sourceNotificationId = null
  createLogForm.status = 'waiting'
  createLogForm.task = ''
  createLogForm.time = getCurrentTime()
  createLogForm.workType = '기타'
  logModalMode.value = 'create'
  isLogModalOpen.value = true
}

function openIncidentDraft(plan) {
  const draft = plan.workLogDraft ?? {}
  const startedAt = splitDateTime(draft.startedAt)
  const endedAt = splitDateTime(draft.endedAt)

  activeIncidentPlan.value = plan
  createLogForm.date = startedAt.date || getToday()
  createLogForm.endedDate = endedAt.date
  createLogForm.endedTime = endedAt.time
  createLogForm.id = null
  createLogForm.operator = operatorName.value
  createLogForm.sourceNotificationId = draft.sourceNotificationId ?? plan.notificationId
  createLogForm.status = draft.status || 'waiting'
  createLogForm.task = draft.content || plan.summary
  createLogForm.time = startedAt.time || getCurrentTime()
  createLogForm.workType = draft.workType || '긴급수리'
  logModalMode.value = 'create'
  isLogModalOpen.value = true
  emit('incident-draft-consumed')
}

function openEditModal(log) {
  activeIncidentPlan.value = null
  createLogForm.date = log.date
  createLogForm.endedDate = log.endedDate || ''
  createLogForm.endedTime = log.endedTime || ''
  createLogForm.id = log.id
  createLogForm.operator = log.operator || operatorName.value
  createLogForm.sourceNotificationId = log.sourceNotificationId ?? null
  createLogForm.status = log.status
  createLogForm.task = log.task
  createLogForm.time = log.time
  createLogForm.workType = log.workType || '기타'
  logModalMode.value = 'edit'
  isLogModalOpen.value = true
}

function closeLogModal() {
  isLogModalOpen.value = false
  activeIncidentPlan.value = null
}

function submitLogForm() {
  if (props.isSubmitting) {
    return
  }

  const eventName = isEditMode.value ? 'update-log' : 'create-log'

  emit(
    eventName,
    {
      date: createLogForm.date || getToday(),
      endedDate: createLogForm.endedDate,
      endedTime: createLogForm.endedTime,
      id: createLogForm.id ?? `log-${getToday().replaceAll('-', '')}-${Date.now()}`,
      operator: createLogForm.operator,
      sourceNotificationId: createLogForm.sourceNotificationId,
      status: createLogForm.status,
      task: createLogForm.task.trim() || '작업 내용 미입력',
      time: createLogForm.time,
      workType: createLogForm.workType,
    },
    {
      onSuccess: closeLogModal,
    },
  )
}

function openDeleteConfirm(log) {
  selectedDeleteLog.value = log
  isDeleteConfirmOpen.value = true
}

function closeDeleteConfirm() {
  isDeleteConfirmOpen.value = false
  selectedDeleteLog.value = null
}

function confirmDeleteLog() {
  if (!selectedDeleteLog.value || props.isSubmitting) {
    return
  }

  emit('delete-log', selectedDeleteLog.value.id, {
    onSuccess: closeDeleteConfirm,
  })
}

function scrollToDate(date) {
  tablePanelRef.value?.scrollToGroup(date)
}

watch(
  () => props.incidentPlan,
  (plan) => {
    if (plan) {
      openIncidentDraft(plan)
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="work-log-panel">
    <DashboardTablePanel
      ref="tablePanelRef"
      title="작업 로그"
      data-test="work-log-panel"
      row-test-prefix="work-log-row"
      action-label="작업 로그 작성"
      :action-icon="pencilIcon"
      :columns="workLogColumns"
      :groups="tableGroups"
      grid-template-columns="minmax(82px, 104px) minmax(92px, 118px) minmax(84px, 108px) minmax(220px, 1fr) minmax(78px, 90px) minmax(70px, 84px)"
      @action="openCreateModal"
    >
      <template #title-actions>
        <DashboardCalendarPicker
          aria-label="작업 로그 날짜 선택"
          data-test-prefix="work-log"
          :dates="tableGroups.map((group) => group.date)"
          @select="scrollToDate"
        />
      </template>

      <template #cell-status="{ row }">
        <span
          class="work-log-panel__status"
          :class="`work-log-panel__status--${workLogStatusMap[row.status].tone}`"
        >
          {{ workLogStatusMap[row.status].label }}
        </span>
      </template>

      <template #cell-task="{ row }">
        <div class="work-log-panel__task-cell">
          <strong>{{ row.task }}</strong>
          <span v-if="row.equipmentId || row.alarmCode">
            {{ [row.equipmentId, row.alarmCode].filter(Boolean).join(' · ') }}
          </span>
        </div>
      </template>

      <template #cell-actions="{ row }">
        <div class="work-log-panel__row-actions">
          <button
            class="work-log-panel__row-action"
            type="button"
            aria-label="작업 로그 수정"
            :disabled="isSubmitting"
            @click="openEditModal(row)"
          >
            <img :src="pencilIcon" alt="" width="16" height="16" />
          </button>
          <button
            class="work-log-panel__row-action work-log-panel__row-action--danger"
            type="button"
            aria-label="작업 로그 삭제"
            :disabled="isSubmitting"
            @click="openDeleteConfirm(row)"
          >
            <img :src="trashIcon" alt="" width="16" height="16" />
          </button>
        </div>
      </template>
    </DashboardTablePanel>

    <p v-if="isLoading" class="work-log-panel__state" data-test="work-log-loading">
      작업 로그를 불러오는 중입니다.
    </p>
    <p v-else-if="errorMessage" class="work-log-panel__state work-log-panel__state--error" data-test="work-log-error">
      {{ errorMessage }}
    </p>

    <Transition name="work-log-modal">
      <div
        v-if="isLogModalOpen"
        class="work-log-panel__overlay"
        data-test="work-log-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-log-create-title"
      >
        <form
          class="work-log-panel__modal"
          :class="{ 'work-log-panel__modal--incident': activeIncidentPlan }"
          @submit.prevent="submitLogForm"
        >
          <header class="work-log-panel__modal-header">
            <div>
              <h2 id="work-log-create-title">{{ activeIncidentPlan ? '대응 작업 로그 작성' : logModalTitle }}</h2>
            </div>
            <button
              class="work-log-panel__modal-close"
              type="button"
              aria-label="작업 로그 모달 닫기"
              :disabled="isSubmitting"
              @click="closeLogModal"
            >
              <img :src="closeIcon" alt="" width="20" height="20" />
            </button>
          </header>

          <section v-if="activeIncidentPlan" class="work-log-panel__incident-plan">
            <header>
              <div>
                <strong>{{ activeIncidentPlan.equipmentId }}</strong>
                <span>{{ activeIncidentPlan.alarmCode }}</span>
              </div>
              <time>{{ activeIncidentPlan.occurredAt?.replace('T', ' ').slice(0, 16) }}</time>
            </header>
            <p>{{ activeIncidentPlan.summary }}</p>
            <div v-if="activeIncidentPlan.deviations.length" class="work-log-panel__deviations">
              <div v-for="deviation in activeIncidentPlan.deviations" :key="deviation.metric">
                <span>{{ deviation.label }}</span>
                <strong>{{ deviation.incident }} {{ deviation.unit }}</strong>
                <small v-if="deviation.delta !== null">기준 대비 {{ deviation.delta > 0 ? '+' : '' }}{{ deviation.delta }}</small>
              </div>
            </div>
            <div v-if="activeIncidentPlan.citations.length" class="work-log-panel__citations">
              <span>근거 문서</span>
              <strong v-for="citation in activeIncidentPlan.citations" :key="citation.docId">
                {{ citation.docId }}
              </strong>
            </div>
            <p v-if="activeIncidentPlan.warnings.length" class="work-log-panel__incident-warning">
              {{ activeIncidentPlan.warnings.join(' · ') }}
            </p>
          </section>

          <div class="work-log-panel__modal-toolbar">
            <label class="work-log-panel__field work-log-panel__field--type">
              <span>작업 유형</span>
              <select v-model="createLogForm.workType" :disabled="isSubmitting">
                <option v-for="workType in workTypeOptions" :key="workType" :value="workType">
                  {{ workType }}
                </option>
              </select>
            </label>

            <fieldset class="work-log-panel__status-field">
              <legend>작업 상태</legend>
              <div class="work-log-panel__status-options">
                <button
                  v-for="option in statusOptions"
                  :key="option.value"
                  class="work-log-panel__status-option"
                  :class="{
                    'work-log-panel__status-option--active': createLogForm.status === option.value,
                  }"
                  type="button"
                  :data-test="`work-log-form-status-${option.value}`"
                  :disabled="isSubmitting"
                  @click="createLogForm.status = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </fieldset>
          </div>

          <div class="work-log-panel__editor-layout">
            <aside class="work-log-panel__schedule-panel" aria-label="작업 일정">
              <label class="work-log-panel__field">
                <span>작업 진행자</span>
                <input
                  v-model="createLogForm.operator"
                  type="text"
                  data-test="work-log-form-operator"
                  readonly
                />
              </label>

              <section class="work-log-panel__schedule-group">
                <strong>시작</strong>
                <label class="work-log-panel__field">
                  <span>날짜</span>
                  <input v-model="createLogForm.date" type="date" data-test="work-log-form-date" />
                </label>
                <label class="work-log-panel__field">
                  <span>시간</span>
                  <input v-model="createLogForm.time" type="time" data-test="work-log-form-time" />
                </label>
              </section>

              <section class="work-log-panel__schedule-group">
                <strong>종료 <small>선택</small></strong>
                <label class="work-log-panel__field">
                  <span>날짜</span>
                  <input v-model="createLogForm.endedDate" type="date" :disabled="isSubmitting" />
                </label>
                <label class="work-log-panel__field">
                  <span>시간</span>
                  <input
                    v-model="createLogForm.endedTime"
                    type="time"
                    :disabled="isSubmitting || !createLogForm.endedDate"
                  />
                </label>
              </section>
            </aside>

            <label class="work-log-panel__field work-log-panel__field--content">
              <span>작업 내용</span>
              <textarea
                v-model="createLogForm.task"
                data-test="work-log-form-task"
                placeholder="설비 상태, 확인 항목과 조치 내용을 입력하세요"
                :disabled="isSubmitting"
              ></textarea>
            </label>
          </div>

          <p v-if="errorMessage" class="work-log-panel__modal-error" data-test="work-log-form-error">
            {{ errorMessage }}
          </p>

          <footer class="work-log-panel__modal-actions">
            <button
              class="work-log-panel__cancel"
              type="button"
              :disabled="isSubmitting"
              @click="closeLogModal"
            >
              취소
            </button>
            <button
              class="work-log-panel__submit"
              type="submit"
              data-test="work-log-form-submit"
              :disabled="isSubmitting"
            >
              {{ logSubmitLabel }}
            </button>
          </footer>
        </form>
      </div>
    </Transition>

    <Transition name="work-log-modal">
      <div
        v-if="isDeleteConfirmOpen"
        class="work-log-panel__overlay"
        data-test="work-log-delete-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-log-delete-title"
      >
        <section class="work-log-panel__confirm">
          <header class="work-log-panel__modal-header">
            <div>
              <h2 id="work-log-delete-title">작업 로그를 삭제할까요?</h2>
              <p>삭제한 작업 로그는 목록에서 제거됩니다.</p>
            </div>
            <button
              class="work-log-panel__modal-close"
              type="button"
              aria-label="작업 로그 삭제 취소"
              :disabled="isSubmitting"
              @click="closeDeleteConfirm"
            >
              <img :src="closeIcon" alt="" width="20" height="20" />
            </button>
          </header>

          <div class="work-log-panel__delete-summary">
            <span>{{ selectedDeleteLog?.date }} {{ selectedDeleteLog?.time }}</span>
            <strong>{{ selectedDeleteLog?.task }}</strong>
          </div>

          <div class="work-log-panel__confirm-actions">
            <button
              class="work-log-panel__confirm-button work-log-panel__confirm-button--ghost"
              type="button"
              :disabled="isSubmitting"
              @click="closeDeleteConfirm"
            >
              취소
            </button>
            <button
              class="work-log-panel__confirm-button work-log-panel__confirm-button--danger"
              type="button"
              :disabled="isSubmitting"
              @click="confirmDeleteLog"
            >
              {{ isSubmitting ? '삭제 중' : '삭제' }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.work-log-panel {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.work-log-panel__state {
  position: absolute;
  right: var(--agentory-spacing-24);
  bottom: var(--agentory-spacing-20);
  z-index: 6;
  margin: 0;
  padding: var(--agentory-spacing-8) var(--agentory-spacing-12);
  color: var(--agentory-color-text-primary);
  background: color-mix(in srgb, var(--agentory-color-bg-app), transparent 8%);
  border-radius: var(--agentory-radius-pill);
  box-shadow: var(--agentory-shadow-control);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
}

.work-log-panel__state--error,
.work-log-panel__modal-error {
  color: var(--agentory-color-status-danger-text);
}

.work-log-panel__task-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--agentory-spacing-2);
}

.work-log-panel__task-cell strong {
  overflow: hidden;
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-semi-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-log-panel__task-cell span {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
}

:global(.work-log-panel__actions-cell) {
  overflow: visible;
}

.work-log-panel__row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--agentory-spacing-6);
}

.work-log-panel__row-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--agentory-color-text-muted);
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 84%);
  border: 0;
  border-radius: var(--agentory-radius-8);
  cursor: pointer;
  transition:
    background-color 160ms var(--agentory-ease-soft),
    color 160ms var(--agentory-ease-soft),
    transform 180ms var(--agentory-ease-soft);
}

.work-log-panel__row-action:hover {
  color: var(--agentory-color-bg-primary);
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 88%);
  transform: translateY(-1px);
}

.work-log-panel__row-action--danger:hover {
  color: var(--agentory-color-status-danger-text);
  background: color-mix(in srgb, var(--agentory-color-status-danger-text), transparent 90%);
}

.work-log-panel__row-action:disabled {
  opacity: 0.42;
  cursor: default;
  transform: none;
}

.work-log-panel__row-action img {
  width: 16px;
  height: 16px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(49%) sepia(5%) saturate(91%) hue-rotate(20deg) brightness(96%)
    contrast(88%);
}

.work-log-panel__row-action:hover img {
  filter: brightness(0) saturate(100%) invert(43%) sepia(85%) saturate(2682%) hue-rotate(197deg)
    brightness(93%) contrast(91%);
}

.work-log-panel__row-action--danger:hover img {
  filter: brightness(0) saturate(100%) invert(38%) sepia(88%) saturate(2601%) hue-rotate(337deg)
    brightness(99%) contrast(91%);
}

.work-log-modal-enter-active,
.work-log-modal-leave-active {
  transition:
    opacity 180ms ease,
    transform 200ms ease;
}

.work-log-panel__overlay {
  position: absolute;
  z-index: 20;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--agentory-spacing-16);
  background: color-mix(in srgb, var(--agentory-color-text-primary), transparent 78%);
  border-radius: var(--agentory-radius-8);
  backdrop-filter: var(--agentory-blur-glass);
}

.work-log-panel__modal {
  display: flex;
  width: min(100%, 1040px);
  max-height: calc(100% - var(--agentory-spacing-8));
  padding: var(--agentory-spacing-30);
  flex-direction: column;
  gap: var(--agentory-spacing-16);
  overflow-y: auto;
  background: var(--agentory-color-bg-app);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-muted), transparent 42%);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel-soft);
  scrollbar-color: color-mix(in srgb, var(--agentory-color-text-muted), transparent 34%) transparent;
  scrollbar-width: thin;
}

.work-log-panel__modal::-webkit-scrollbar {
  width: 7px;
  background: transparent;
}

.work-log-panel__modal::-webkit-scrollbar-track {
  background: transparent;
}

.work-log-panel__modal::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--agentory-color-text-muted), transparent 34%);
  border: 2px solid transparent;
  border-radius: var(--agentory-radius-pill);
  background-clip: padding-box;
}

.work-log-panel__modal::-webkit-scrollbar-thumb:hover {
  background: var(--agentory-color-text-muted);
  border: 2px solid transparent;
  background-clip: padding-box;
}

.work-log-panel__modal::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

.work-log-panel__modal--incident {
  width: min(100%, 1120px);
}

.work-log-panel__confirm {
  display: flex;
  width: min(100%, 460px);
  padding: var(--agentory-spacing-24);
  flex-direction: column;
  gap: var(--agentory-spacing-20);
  background: var(--agentory-color-bg-app);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-muted), transparent 42%);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel-soft);
}

.work-log-modal-enter-from,
.work-log-modal-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.work-log-panel__modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--agentory-spacing-12);
}

.work-log-panel__modal-header h2 {
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-h2);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-h2);
}

.work-log-panel__incident-plan {
  display: flex;
  padding: var(--agentory-spacing-16);
  flex-direction: column;
  gap: var(--agentory-spacing-10);
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 94%);
  border-radius: var(--agentory-radius-8);
}

.work-log-panel__incident-plan header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--agentory-spacing-12);
}

.work-log-panel__incident-plan header > div {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-8);
}

.work-log-panel__incident-plan header strong {
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-semi-bold);
}

.work-log-panel__incident-plan header span {
  color: var(--agentory-color-status-danger-text);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-bold);
}

.work-log-panel__incident-plan time,
.work-log-panel__incident-plan p,
.work-log-panel__deviations small {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  line-height: var(--agentory-line-height-body-sm);
}

.work-log-panel__incident-plan p {
  margin: 0;
}

.work-log-panel__deviations {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--agentory-spacing-8);
}

.work-log-panel__deviations > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--agentory-spacing-4) var(--agentory-spacing-8);
  padding: var(--agentory-spacing-8) var(--agentory-spacing-10);
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-8);
}

.work-log-panel__deviations span,
.work-log-panel__deviations strong {
  font-size: var(--agentory-font-size-body-sm);
}

.work-log-panel__deviations span {
  color: var(--agentory-color-text-muted);
}

.work-log-panel__deviations strong {
  color: var(--agentory-color-text-primary);
  font-weight: var(--agentory-font-weight-semi-bold);
}

.work-log-panel__deviations small {
  grid-column: 1 / -1;
}

.work-log-panel__incident-warning {
  color: var(--agentory-color-status-warning) !important;
}

.work-log-panel__citations {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-6);
  flex-wrap: wrap;
}

.work-log-panel__citations span,
.work-log-panel__citations strong {
  font-size: var(--agentory-font-size-caption);
}

.work-log-panel__citations span {
  color: var(--agentory-color-text-muted);
}

.work-log-panel__citations strong {
  padding: var(--agentory-spacing-2) var(--agentory-spacing-6);
  color: var(--agentory-color-bg-primary);
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-pill);
  font-weight: var(--agentory-font-weight-semi-bold);
}

.work-log-panel__modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-pill);
  cursor: pointer;
}

.work-log-panel__modal-close:disabled {
  opacity: 0.38;
  cursor: default;
}

.work-log-panel__modal-close img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(22%);
}

.work-log-panel__modal-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--agentory-spacing-24);
  padding: var(--agentory-spacing-12) 0 var(--agentory-spacing-16);
  border-bottom: 1px solid var(--agentory-color-table-divider);
}

.work-log-panel__field {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-8);
}

.work-log-panel__field--type {
  width: min(240px, 34%);
}

.work-log-panel__editor-layout {
  display: grid;
  min-height: 330px;
  grid-template-columns: minmax(250px, 280px) minmax(0, 1fr);
  gap: var(--agentory-spacing-24);
}

.work-log-panel__schedule-panel {
  display: flex;
  min-width: 0;
  padding-right: var(--agentory-spacing-24);
  flex-direction: column;
  gap: var(--agentory-spacing-20);
  border-right: 1px solid var(--agentory-color-table-divider);
}

.work-log-panel__schedule-group {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.72fr);
  gap: var(--agentory-spacing-10);
}

.work-log-panel__schedule-group > strong {
  grid-column: 1 / -1;
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-semi-bold);
}

.work-log-panel__schedule-group > strong small {
  margin-left: var(--agentory-spacing-4);
  color: var(--agentory-color-text-subtle);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
}

.work-log-panel__field small {
  color: var(--agentory-color-text-subtle);
  font-size: var(--agentory-font-size-caption);
}

.work-log-panel__field span,
.work-log-panel__status-field legend {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
}

.work-log-panel__field input,
.work-log-panel__field textarea,
.work-log-panel__field select {
  width: 100%;
  min-height: 42px;
  padding: var(--agentory-spacing-8) var(--agentory-spacing-12);
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-surface);
  border: 0;
  border-radius: var(--agentory-radius-8);
  font-size: var(--agentory-font-size-body);
  font-family: var(--agentory-font-family-base);
  outline: none;
}

.work-log-panel__field input:disabled,
.work-log-panel__field textarea:disabled,
.work-log-panel__field select:disabled {
  opacity: 0.64;
}

.work-log-panel__field textarea {
  min-height: 300px;
  height: 100%;
  padding: var(--agentory-spacing-14) var(--agentory-spacing-16);
  line-height: var(--agentory-line-height-body);
  resize: none;
}

.work-log-panel__field--content {
  min-width: 0;
  min-height: 0;
}

.work-log-panel__field input:focus,
.work-log-panel__field textarea:focus,
.work-log-panel__field select:focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 58%);
}

.work-log-panel__status-field {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-8);
  padding: 0;
  border: 0;
}

.work-log-panel__status-options {
  display: flex;
  gap: var(--agentory-spacing-8);
}

.work-log-panel__status-option {
  min-width: 70px;
  min-height: 38px;
  padding: var(--agentory-spacing-6) var(--agentory-spacing-16);
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-surface);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  cursor: pointer;
}

.work-log-panel__status-option:disabled {
  opacity: 0.48;
  cursor: default;
}

.work-log-panel__status-option--active {
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
}

.work-log-panel__submit {
  min-width: 146px;
  min-height: 42px;
  padding: var(--agentory-spacing-8) var(--agentory-spacing-20);
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border: 0;
  border-radius: var(--agentory-radius-8);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  cursor: pointer;
}

.work-log-panel__modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--agentory-spacing-8);
  padding-top: var(--agentory-spacing-4);
}

.work-log-panel__cancel {
  min-width: 84px;
  min-height: 42px;
  padding: var(--agentory-spacing-8) var(--agentory-spacing-20);
  color: var(--agentory-color-text-primary);
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-8);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  cursor: pointer;
}

.work-log-panel__cancel:hover:not(:disabled) {
  background: var(--agentory-color-bg-surface);
}

.work-log-panel__cancel:disabled {
  opacity: 0.54;
  cursor: default;
}

.work-log-panel__submit:disabled {
  opacity: 0.54;
  cursor: default;
}

.work-log-panel__modal-error {
  margin: 0;
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
}

.work-log-panel__delete-summary {
  display: flex;
  padding: var(--agentory-spacing-14);
  flex-direction: column;
  gap: var(--agentory-spacing-6);
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 82%);
  border-radius: var(--agentory-radius-8);
}

.work-log-panel__delete-summary span {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
}

.work-log-panel__delete-summary strong {
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-log-panel__confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--agentory-spacing-8);
}

.work-log-panel__confirm-button {
  min-height: 34px;
  padding: var(--agentory-spacing-6) var(--agentory-spacing-16);
  color: var(--agentory-color-text-primary);
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 80%);
  border: 0;
  border-radius: var(--agentory-radius-8);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  cursor: pointer;
}

.work-log-panel__confirm-button--danger {
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-status-danger-text);
}

.work-log-panel__confirm-button:disabled {
  opacity: 0.54;
  cursor: default;
}

:global(.work-log-panel__status) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 74px;
  min-height: 30px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-14);
  color: var(--agentory-color-text-inverse);
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  line-height: 1.1;
  white-space: nowrap;
}

:global(.work-log-panel__status--complete) {
  background: var(--agentory-color-status-normal-text);
}

:global(.work-log-panel__status--progress) {
  background: var(--agentory-color-status-progress);
}

:global(.work-log-panel__status--waiting) {
  background: var(--agentory-color-status-waiting);
}

@media (max-width: 1100px) {
  .work-log-panel__editor-layout {
    grid-template-columns: minmax(220px, 250px) minmax(0, 1fr);
  }
}

@media (max-width: 820px) {
  .work-log-panel__modal-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .work-log-panel__field--type {
    width: 100%;
  }

  .work-log-panel__editor-layout {
    grid-template-columns: 1fr;
  }

  .work-log-panel__schedule-panel {
    padding-right: 0;
    padding-bottom: var(--agentory-spacing-20);
    border-right: 0;
    border-bottom: 1px solid var(--agentory-color-table-divider);
  }
}
</style>
