<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import closeIcon from '@/assets/icons/dashboard/close.svg'
import planDocumentIcon from '@/assets/icons/dashboard/nav-note.svg'
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
  isIncidentPlanLoading: {
    type: Boolean,
    default: false,
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
const { t } = useI18n()
const authStore = useAuthStore()
const tablePanelRef = ref(null)
const isDeleteConfirmOpen = ref(false)
const isLogModalOpen = ref(false)
const logModalMode = ref('create')
const selectedDeleteLog = ref(null)
const selectedPlanLog = ref(null)
const createLogForm = reactive({
  date: '',
  endedDate: '',
  endedTime: '',
  id: null,
  operator: authStore.currentUser.name,
  originalStatus: '',
  sourceNotificationId: null,
  status: 'waiting',
  time: '',
  workPlan: '',
  workRecord: '',
  workType: '기타',
})

const workLogColumns = computed(() => [
  {
    key: 'time',
    label: t('workLog.columns.time'),
    cellClass: 'dashboard-table-panel__cell--light',
  },
  {
    key: 'operator',
    label: t('workLog.columns.operator'),
    cellClass: 'dashboard-table-panel__cell--strong',
  },
  { key: 'workType', label: t('workLog.columns.workType') },
  {
    key: 'workPlan',
    label: t('workLog.columns.plan'),
  },
  {
    key: 'workRecord',
    label: t('workLog.columns.record'),
  },
  {
    key: 'status',
    label: t('workLog.columns.status'),
    cellClass: 'dashboard-table-panel__cell--center work-log-panel__status-cell',
    headerClass: 'dashboard-table-panel__header-cell--center',
  },
  {
    key: 'actions',
    label: t('workLog.columns.actions'),
    cellClass: 'dashboard-table-panel__cell--center work-log-panel__actions-cell',
    headerClass: 'dashboard-table-panel__header-cell--center',
  },
])

const tableGroups = computed(() =>
  props.groups.map((group) => ({
    ...group,
    rows: group.logs.map((log) => ({
      ...log,
      workPlanPreview: log.workPlan || log.task || '',
    })),
  })),
)

const statusOptions = computed(() =>
  ['waiting', 'complete', 'progress'].map((value) => ({
    ...workLogStatusMap[value],
    label: t(`workLog.statuses.${value}`),
    value,
  })),
)
const workTypeOptions = computed(() => [
  { label: t('workLog.types.periodicInspection'), value: '정기점검' },
  { label: t('workLog.types.repairInspection'), value: '수리점검' },
  { label: t('workLog.types.preventiveInspection'), value: '예방점검' },
  { label: t('workLog.types.emergencyRepair'), value: '긴급수리' },
  { label: t('workLog.types.etc'), value: '기타' },
])

const workTypeKeyByValue = {
  긴급수리: 'emergencyRepair',
  기타: 'etc',
  예방점검: 'preventiveInspection',
  수리점검: 'repairInspection',
  정기점검: 'periodicInspection',
}

function getWorkTypeLabel(value) {
  const key = workTypeKeyByValue[value]

  return key ? t(`workLog.types.${key}`) : value
}

const operatorName = computed(() => authStore.currentUserName || t('workLog.defaultOperator'))
const isEditMode = computed(() => logModalMode.value === 'edit')
const isExistingCompletedLog = computed(
  () => isEditMode.value && createLogForm.originalStatus === 'complete',
)
const logModalTitle = computed(() =>
  isEditMode.value ? t('workLog.editTitle') : t('workLog.createTitle'),
)
const logSubmitLabel = computed(() => {
  if (props.isSubmitting) {
    return isEditMode.value ? t('workLog.updating') : t('workLog.saving')
  }

  return isEditMode.value ? t('workLog.submitUpdate') : t('workLog.submitCreate')
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
  createLogForm.date = getToday()
  createLogForm.endedDate = ''
  createLogForm.endedTime = ''
  createLogForm.id = null
  createLogForm.operator = operatorName.value
  createLogForm.originalStatus = ''
  createLogForm.sourceNotificationId = null
  createLogForm.status = 'waiting'
  createLogForm.time = getCurrentTime()
  createLogForm.workPlan = ''
  createLogForm.workRecord = ''
  createLogForm.workType = '기타'
  logModalMode.value = 'create'
  isLogModalOpen.value = true
}

function openIncidentDraft(plan) {
  const draft = plan.workLogDraft ?? {}
  const startedAt = splitDateTime(draft.startedAt)
  const endedAt = splitDateTime(draft.endedAt)

  createLogForm.date = startedAt.date || getToday()
  createLogForm.endedDate = endedAt.date
  createLogForm.endedTime = endedAt.time
  createLogForm.id = null
  createLogForm.operator = operatorName.value
  createLogForm.originalStatus = ''
  createLogForm.sourceNotificationId = draft.sourceNotificationId ?? plan.notificationId
  createLogForm.status = draft.status || 'waiting'
  createLogForm.time = startedAt.time || getCurrentTime()
  createLogForm.workPlan = draft.plan || plan.summary
  createLogForm.workRecord = ''
  createLogForm.workType = draft.workType || '긴급수리'
  logModalMode.value = 'create'
  isLogModalOpen.value = true
  emit('incident-draft-consumed')
}

function openEditModal(log) {
  createLogForm.date = log.date
  createLogForm.endedDate = log.endedDate || ''
  createLogForm.endedTime = log.endedTime || ''
  createLogForm.id = log.id
  createLogForm.operator = log.operator || operatorName.value
  createLogForm.originalStatus = log.status
  createLogForm.sourceNotificationId = log.sourceNotificationId ?? null
  createLogForm.status = log.status
  createLogForm.time = log.time
  createLogForm.workPlan = log.workPlan || log.task
  createLogForm.workRecord = log.workRecord || ''
  createLogForm.workType = log.workType || '기타'
  logModalMode.value = 'edit'
  isLogModalOpen.value = true
}

function closeLogModal() {
  isLogModalOpen.value = false
}

function openPlanPreview(log) {
  if (!log.workPlanPreview) {
    return
  }

  selectedPlanLog.value = log
}

function closePlanPreview() {
  selectedPlanLog.value = null
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
      originalStatus: createLogForm.originalStatus,
      sourceNotificationId: createLogForm.sourceNotificationId,
      status: createLogForm.status,
      task:
        createLogForm.workRecord.trim() ||
        createLogForm.workPlan.trim() ||
        t('workLog.defaultTask'),
      time: createLogForm.time,
      workPlan: createLogForm.workPlan.trim() || t('workLog.defaultTask'),
      workRecord: createLogForm.workRecord.trim(),
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

watch(
  () => props.isIncidentPlanLoading,
  (isLoading) => {
    if (isLoading && !isLogModalOpen.value) {
      openCreateModal()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="work-log-panel">
    <DashboardTablePanel
      ref="tablePanelRef"
      :title="t('workLog.title')"
      data-test="work-log-panel"
      row-test-prefix="work-log-row"
      :action-label="t('workLog.action')"
      :action-icon="pencilIcon"
      :columns="workLogColumns"
      :groups="tableGroups"
      grid-template-columns="minmax(82px, 100px) minmax(88px, 110px) minmax(80px, 100px) minmax(150px, 0.8fr) minmax(210px, 1.2fr) minmax(74px, 86px) minmax(68px, 82px)"
      @action="openCreateModal"
    >
      <template #title-actions>
        <DashboardCalendarPicker
          :aria-label="t('workLog.calendar')"
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
          {{ t(`workLog.statuses.${row.status}`) }}
        </span>
      </template>

      <template #cell-workPlan="{ row }">
        <button
          v-if="row.workPlanPreview"
          class="work-log-panel__plan-trigger"
          type="button"
          @click="openPlanPreview(row)"
        >
          <span class="work-log-panel__plan-document-icon" aria-hidden="true">
            <img :src="planDocumentIcon" alt="" width="18" height="18" />
          </span>
          <span class="work-log-panel__plan-copy">
            <strong>{{ t('workLog.planView') }}</strong>
            <small>
              <span class="work-log-panel__plan-status-dot" aria-hidden="true"></span>
              {{ t('workLog.planPrepared') }}
            </small>
          </span>
        </button>
        <span v-else class="work-log-panel__plan-empty">{{ t('workLog.planEmpty') }}</span>
      </template>

      <template #cell-workRecord="{ row }">
        <div
          class="work-log-panel__record-cell"
          :class="{ 'work-log-panel__record-cell--empty': !row.workRecord }"
        >
          <p>{{ row.workRecord || t('workLog.recordPending') }}</p>
          <div v-if="row.equipmentId || row.alarmCode" class="work-log-panel__record-meta">
            <span v-if="row.equipmentId">{{ row.equipmentId }}</span>
            <i v-if="row.equipmentId && row.alarmCode" aria-hidden="true"></i>
            <span v-if="row.alarmCode">{{ row.alarmCode }}</span>
          </div>
        </div>
      </template>

      <template #cell-workType="{ row }">
        {{ getWorkTypeLabel(row.workType) }}
      </template>

      <template #cell-actions="{ row }">
        <div class="work-log-panel__row-actions">
          <button
            class="work-log-panel__row-action"
            type="button"
            :aria-label="t('workLog.editAria')"
            :disabled="isSubmitting"
            @click="openEditModal(row)"
          >
            <img :src="pencilIcon" alt="" width="16" height="16" />
          </button>
          <button
            class="work-log-panel__row-action work-log-panel__row-action--danger"
            type="button"
            :aria-label="t('workLog.deleteAria')"
            :disabled="isSubmitting"
            @click="openDeleteConfirm(row)"
          >
            <img :src="trashIcon" alt="" width="16" height="16" />
          </button>
        </div>
      </template>
    </DashboardTablePanel>

    <p v-if="isLoading" class="work-log-panel__state" data-test="work-log-loading">
      {{ t('workLog.loading') }}
    </p>
    <p
      v-else-if="errorMessage"
      class="work-log-panel__state work-log-panel__state--error"
      data-test="work-log-error"
    >
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
          :class="{ 'work-log-panel__modal--loading': isIncidentPlanLoading }"
          @submit.prevent="submitLogForm"
        >
          <header class="work-log-panel__modal-header">
            <div>
              <h2 id="work-log-create-title">{{ logModalTitle }}</h2>
            </div>
            <button
              class="work-log-panel__modal-close"
              type="button"
              :aria-label="t('workLog.modalClose')"
              :disabled="isSubmitting || isIncidentPlanLoading"
              @click="closeLogModal"
            >
              <img :src="closeIcon" alt="" width="20" height="20" />
            </button>
          </header>

          <div class="work-log-panel__modal-toolbar">
            <label class="work-log-panel__field work-log-panel__field--type">
              <span>{{ t('workLog.fields.type') }}</span>
              <select v-model="createLogForm.workType" :disabled="isSubmitting">
                <option
                  v-for="workType in workTypeOptions"
                  :key="workType.value"
                  :value="workType.value"
                >
                  {{ workType.label }}
                </option>
              </select>
            </label>

            <fieldset class="work-log-panel__status-field">
              <legend>{{ t('workLog.fields.status') }}</legend>
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
                  :disabled="
                    isSubmitting || (isExistingCompletedLog && option.value !== 'complete')
                  "
                  @click="createLogForm.status = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </fieldset>
          </div>

          <div class="work-log-panel__editor-layout">
            <aside
              class="work-log-panel__schedule-panel"
              :aria-label="t('workLog.fields.schedule')"
            >
              <label class="work-log-panel__field">
                <span>{{ t('workLog.fields.operator') }}</span>
                <input
                  v-model="createLogForm.operator"
                  type="text"
                  data-test="work-log-form-operator"
                  readonly
                />
              </label>

              <section class="work-log-panel__schedule-group">
                <strong>{{ t('workLog.start') }}</strong>
                <label class="work-log-panel__field">
                  <span>{{ t('workLog.fields.date') }}</span>
                  <input v-model="createLogForm.date" type="date" data-test="work-log-form-date" />
                </label>
                <label class="work-log-panel__field">
                  <span>{{ t('workLog.fields.time') }}</span>
                  <input v-model="createLogForm.time" type="time" data-test="work-log-form-time" />
                </label>
              </section>

              <section class="work-log-panel__schedule-group">
                <strong
                  >{{ t('workLog.end') }} <small>{{ t('workLog.optional') }}</small></strong
                >
                <label class="work-log-panel__field">
                  <span>{{ t('workLog.fields.date') }}</span>
                  <input v-model="createLogForm.endedDate" type="date" :disabled="isSubmitting" />
                </label>
                <label class="work-log-panel__field">
                  <span>{{ t('workLog.fields.time') }}</span>
                  <input
                    v-model="createLogForm.endedTime"
                    type="time"
                    :disabled="isSubmitting || !createLogForm.endedDate"
                  />
                </label>
              </section>
            </aside>

            <div class="work-log-panel__content-workspace">
              <label class="work-log-panel__field work-log-panel__field--content">
                <span>{{ t('workLog.fields.plan') }}</span>
                <textarea
                  v-model="createLogForm.workPlan"
                  data-test="work-log-form-plan"
                  :placeholder="t('workLog.planPlaceholder')"
                  :disabled="isSubmitting"
                  required
                ></textarea>
              </label>

              <label class="work-log-panel__field work-log-panel__field--content">
                <span>
                  {{ t('workLog.fields.record') }}
                  <small v-if="createLogForm.status !== 'complete'">
                    {{ t('workLog.recordStatusHint') }}
                  </small>
                </span>
                <textarea
                  v-model="createLogForm.workRecord"
                  data-test="work-log-form-record"
                  :placeholder="t('workLog.recordPlaceholder')"
                  :disabled="
                    isSubmitting || createLogForm.status !== 'complete' || isExistingCompletedLog
                  "
                  :required="createLogForm.status === 'complete' && !isExistingCompletedLog"
                ></textarea>
              </label>
            </div>
          </div>

          <p
            v-if="errorMessage"
            class="work-log-panel__modal-error"
            data-test="work-log-form-error"
          >
            {{ errorMessage }}
          </p>

          <footer class="work-log-panel__modal-actions">
            <button
              class="work-log-panel__cancel"
              type="button"
              :disabled="isSubmitting || isIncidentPlanLoading"
              @click="closeLogModal"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              class="work-log-panel__submit"
              type="submit"
              data-test="work-log-form-submit"
              :disabled="isSubmitting || isIncidentPlanLoading"
            >
              {{ logSubmitLabel }}
            </button>
          </footer>

          <Transition name="incident-plan-loading">
            <div
              v-if="isIncidentPlanLoading"
              class="work-log-panel__incident-loading"
              role="status"
              aria-live="polite"
            >
              <div class="work-log-panel__incident-workflow" aria-hidden="true">
                <span class="work-log-panel__incident-sheet">
                  <i class="work-log-panel__incident-sheet-title"></i>
                  <span v-for="step in 3" :key="step" class="work-log-panel__incident-sheet-row">
                    <i></i>
                    <b></b>
                  </span>
                  <img :src="pencilIcon" alt="" width="24" height="24" />
                </span>
                <span class="work-log-panel__incident-progress"><i></i></span>
              </div>
              <strong>{{ t('workLog.incidentPlanLoading') }}</strong>
              <small>{{ t('workLog.incidentPlanLoadingDescription') }}</small>
            </div>
          </Transition>
        </form>
      </div>
    </Transition>

    <Transition name="work-log-modal">
      <div
        v-if="selectedPlanLog"
        class="work-log-panel__overlay"
        data-test="work-log-plan-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-log-plan-preview-title"
        @click.self="closePlanPreview"
      >
        <section class="work-log-panel__plan-preview">
          <header class="work-log-panel__modal-header">
            <div>
              <h2 id="work-log-plan-preview-title">{{ t('workLog.planPreviewTitle') }}</h2>
              <p>
                {{ selectedPlanLog.date }} {{ selectedPlanLog.time }} ·
                {{ selectedPlanLog.operator }}
              </p>
            </div>
            <button
              class="work-log-panel__modal-close"
              type="button"
              :aria-label="t('workLog.planPreviewClose')"
              @click="closePlanPreview"
            >
              <img :src="closeIcon" alt="" width="20" height="20" />
            </button>
          </header>

          <p class="work-log-panel__plan-preview-content">
            {{ selectedPlanLog.workPlanPreview }}
          </p>
        </section>
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
              <h2 id="work-log-delete-title">{{ t('workLog.deleteConfirmTitle') }}</h2>
              <p>{{ t('workLog.deleteConfirmDescription') }}</p>
            </div>
            <button
              class="work-log-panel__modal-close"
              type="button"
              :aria-label="t('workLog.deleteCancelAria')"
              :disabled="isSubmitting"
              @click="closeDeleteConfirm"
            >
              <img :src="closeIcon" alt="" width="20" height="20" />
            </button>
          </header>

          <div class="work-log-panel__delete-summary">
            <span>{{ selectedDeleteLog?.date }} {{ selectedDeleteLog?.time }}</span>
            <strong>
              {{
                selectedDeleteLog?.workRecord ||
                selectedDeleteLog?.workPlan ||
                selectedDeleteLog?.task
              }}
            </strong>
          </div>

          <div class="work-log-panel__confirm-actions">
            <button
              class="work-log-panel__confirm-button work-log-panel__confirm-button--ghost"
              type="button"
              :disabled="isSubmitting"
              @click="closeDeleteConfirm"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              class="work-log-panel__confirm-button work-log-panel__confirm-button--danger"
              type="button"
              :disabled="isSubmitting"
              @click="confirmDeleteLog"
            >
              {{ isSubmitting ? t('workLog.deleting') : t('common.delete') }}
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

.work-log-panel__record-cell {
  position: relative;
  display: flex;
  min-width: 0;
  padding-left: var(--agentory-spacing-12);
  flex-direction: column;
  gap: var(--agentory-spacing-4);
}

.work-log-panel__record-cell::before {
  position: absolute;
  top: var(--agentory-spacing-2);
  bottom: var(--agentory-spacing-2);
  left: 0;
  width: 2px;
  background: color-mix(in srgb, var(--agentory-color-text-muted), transparent 72%);
  border-radius: var(--agentory-radius-pill);
  content: '';
}

.work-log-panel__record-cell p {
  display: -webkit-box;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.work-log-panel__record-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--agentory-spacing-6);
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-caption);
}

.work-log-panel__record-meta i {
  width: 3px;
  height: 3px;
  background: currentcolor;
  border-radius: var(--agentory-radius-pill);
  opacity: 0.7;
}

.work-log-panel__record-cell--empty {
  color: var(--agentory-color-text-muted);
}

.work-log-panel__record-cell--empty::before {
  opacity: 0.5;
}

.work-log-panel__record-cell--empty p {
  color: var(--agentory-color-text-muted);
}

.work-log-panel__plan-trigger {
  display: inline-flex;
  width: 100%;
  min-width: 0;
  max-width: 176px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-6);
  align-items: center;
  gap: var(--agentory-spacing-8);
  color: var(--agentory-color-text-primary);
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-8);
  font-family: var(--agentory-font-family-base);
  text-align: left;
  cursor: pointer;
  transition: background-color 160ms var(--agentory-ease-soft);
}

.work-log-panel__plan-document-icon {
  display: grid;
  width: var(--agentory-spacing-30);
  height: var(--agentory-spacing-30);
  place-items: center;
  flex: 0 0 var(--agentory-spacing-30);
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 58%);
  border-radius: var(--agentory-radius-8);
  transition:
    background-color 160ms var(--agentory-ease-soft),
    transform 160ms var(--agentory-ease-soft);
}

.work-log-panel__plan-document-icon img {
  width: 18px;
  height: 18px;
  filter: var(--agentory-filter-header-action);
  object-fit: contain;
  opacity: 0.62;
  transition: opacity 160ms var(--agentory-ease-soft);
}

.work-log-panel__plan-copy {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  flex-direction: column;
  gap: var(--agentory-spacing-2);
}

.work-log-panel__plan-trigger strong {
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body-sm);
  transition: color 160ms var(--agentory-ease-soft);
}

.work-log-panel__plan-trigger small,
.work-log-panel__plan-empty {
  display: inline-flex;
  align-items: center;
  gap: var(--agentory-spacing-5);
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-caption);
}

.work-log-panel__plan-status-dot {
  width: var(--agentory-spacing-5);
  height: var(--agentory-spacing-5);
  background: color-mix(
    in srgb,
    var(--agentory-color-status-normal-text),
    var(--agentory-color-text-muted) 44%
  );
  border-radius: var(--agentory-radius-pill);
}

.work-log-panel__plan-trigger:hover,
.work-log-panel__plan-trigger:focus-visible {
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 74%);
}

.work-log-panel__plan-trigger:hover strong,
.work-log-panel__plan-trigger:focus-visible strong {
  color: var(--agentory-color-bg-primary);
}

.work-log-panel__plan-trigger:hover .work-log-panel__plan-document-icon,
.work-log-panel__plan-trigger:focus-visible .work-log-panel__plan-document-icon {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 84%);
  transform: translateY(-1px);
}

.work-log-panel__plan-trigger:hover .work-log-panel__plan-document-icon img,
.work-log-panel__plan-trigger:focus-visible .work-log-panel__plan-document-icon img {
  opacity: 0.92;
}

.work-log-panel__plan-trigger:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 48%);
  outline-offset: 3px;
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
  filter: brightness(0) saturate(100%) invert(49%) sepia(5%) saturate(91%) hue-rotate(20deg)
    brightness(96%) contrast(88%);
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
  position: relative;
  display: flex;
  width: min(100%, 1320px);
  height: min(94%, 820px);
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

.work-log-panel__modal--loading {
  overflow: hidden;
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

.work-log-panel__incident-loading {
  position: absolute;
  z-index: 30;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--agentory-spacing-30);
  flex-direction: column;
  gap: var(--agentory-spacing-10);
  color: var(--agentory-color-text-primary);
  background: color-mix(in srgb, var(--agentory-color-bg-app), transparent 16%);
  text-align: center;
  -webkit-backdrop-filter: var(--agentory-blur-glass-strong);
  backdrop-filter: var(--agentory-blur-glass-strong);
}

.work-log-panel__incident-loading strong {
  margin-top: var(--agentory-spacing-6);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-semi-bold);
}

.work-log-panel__incident-loading small {
  max-width: 360px;
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  line-height: var(--agentory-line-height-body-sm);
}

.work-log-panel__incident-workflow {
  display: flex;
  width: 184px;
  align-items: center;
  flex-direction: column;
  gap: var(--agentory-spacing-12);
}

.work-log-panel__incident-sheet {
  position: relative;
  display: flex;
  width: 152px;
  min-height: 116px;
  padding: var(--agentory-spacing-20) var(--agentory-spacing-16);
  flex-direction: column;
  gap: var(--agentory-spacing-12);
  background: var(--agentory-color-bg-app);
  border: 1px solid var(--agentory-color-table-divider);
  border-radius: var(--agentory-radius-12);
  box-shadow: var(--agentory-shadow-panel-soft);
}

.work-log-panel__incident-sheet-title {
  width: 58%;
  height: 7px;
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 34%);
  border-radius: var(--agentory-radius-pill);
}

.work-log-panel__incident-sheet-row {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  align-items: center;
  gap: var(--agentory-spacing-8);
}

.work-log-panel__incident-sheet-row > i {
  width: 12px;
  height: 12px;
  background: var(--agentory-color-bg-surface);
  border-radius: var(--agentory-radius-pill);
  animation: incident-plan-step 2.4s var(--agentory-ease-soft) infinite;
}

.work-log-panel__incident-sheet-row > b {
  position: relative;
  height: 6px;
  overflow: hidden;
  background: var(--agentory-color-bg-surface);
  border-radius: var(--agentory-radius-pill);
}

.work-log-panel__incident-sheet-row > b::after {
  position: absolute;
  inset: 0;
  background: var(--agentory-color-bg-primary);
  border-radius: inherit;
  content: '';
  transform: scaleX(0);
  transform-origin: left;
  animation: incident-plan-write 2.4s var(--agentory-ease-soft) infinite;
}

.work-log-panel__incident-sheet-row:nth-of-type(2) > i,
.work-log-panel__incident-sheet-row:nth-of-type(2) > b::after {
  animation-delay: 400ms;
}

.work-log-panel__incident-sheet-row:nth-of-type(3) > i,
.work-log-panel__incident-sheet-row:nth-of-type(3) > b::after {
  animation-delay: 800ms;
}

.work-log-panel__incident-sheet > img {
  position: absolute;
  right: -9px;
  top: 40px;
  width: 24px;
  height: 24px;
  object-fit: contain;
  animation: incident-plan-pencil 2.4s var(--agentory-ease-soft) infinite;
}

.work-log-panel__incident-progress {
  width: 100%;
  height: 3px;
  overflow: hidden;
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 58%);
  border-radius: var(--agentory-radius-pill);
}

.work-log-panel__incident-progress > i {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--agentory-color-bg-primary);
  border-radius: inherit;
  transform: scaleX(0);
  transform-origin: left;
  animation: incident-plan-progress 2.4s var(--agentory-ease-soft) infinite;
}

.incident-plan-loading-enter-active,
.incident-plan-loading-leave-active {
  transition: opacity 220ms var(--agentory-ease-soft);
}

.incident-plan-loading-enter-from,
.incident-plan-loading-leave-to {
  opacity: 0;
}

@keyframes incident-plan-write {
  0%,
  18% {
    transform: scaleX(0);
  }

  42%,
  86% {
    transform: scaleX(1);
  }

  100% {
    transform: scaleX(0);
  }
}

@keyframes incident-plan-step {
  0%,
  24% {
    background: var(--agentory-color-bg-surface);
    box-shadow: none;
  }

  40%,
  86% {
    background: var(--agentory-color-bg-primary);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 82%);
  }

  100% {
    background: var(--agentory-color-bg-surface);
    box-shadow: none;
  }
}

@keyframes incident-plan-pencil {
  0%,
  12% {
    opacity: 0;
    transform: translate3d(0, -8px, 0);
  }

  22% {
    opacity: 1;
  }

  72% {
    opacity: 1;
    transform: translate3d(-4px, 48px, 0);
  }

  88%,
  100% {
    opacity: 0;
    transform: translate3d(-4px, 56px, 0);
  }
}

@keyframes incident-plan-progress {
  0% {
    transform: scaleX(0);
  }

  82% {
    transform: scaleX(1);
  }

  100% {
    opacity: 0;
    transform: scaleX(1);
  }
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

.work-log-panel__plan-preview {
  display: flex;
  width: min(100%, 960px);
  height: min(100%, 680px);
  padding: var(--agentory-spacing-24);
  flex-direction: column;
  gap: var(--agentory-spacing-20);
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel-soft);
}

.work-log-panel__plan-preview .work-log-panel__modal-header p {
  margin: var(--agentory-spacing-4) 0 0;
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  line-height: var(--agentory-line-height-body-sm);
}

.work-log-panel__plan-preview .work-log-panel__modal-header {
  flex: 0 0 auto;
}

.work-log-panel__plan-preview-content {
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  padding: var(--agentory-spacing-18) var(--agentory-spacing-20);
  overflow-y: auto;
  background: var(--agentory-color-bg-surface);
  border-radius: var(--agentory-radius-8);
  font-size: var(--agentory-font-size-body);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
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
  min-height: 370px;
  flex: 1 1 auto;
  grid-template-columns: minmax(240px, 270px) minmax(0, 1fr);
  gap: var(--agentory-spacing-24);
}

.work-log-panel__content-workspace {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--agentory-spacing-20);
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
  min-height: 340px;
  height: 100%;
  padding: var(--agentory-spacing-14) var(--agentory-spacing-16);
  line-height: var(--agentory-line-height-body);
  resize: none;
}

.work-log-panel__field--content {
  min-width: 0;
  min-height: 0;
}

.work-log-panel__field--content > span {
  display: flex;
  align-items: baseline;
  gap: var(--agentory-spacing-4);
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

@media (max-width: 980px) {
  .work-log-panel__content-workspace {
    grid-template-columns: 1fr;
  }

  .work-log-panel__field textarea {
    min-height: 180px;
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

@media (prefers-reduced-motion: reduce) {
  .work-log-panel__incident-sheet-row > i,
  .work-log-panel__incident-sheet-row > b::after,
  .work-log-panel__incident-sheet > img,
  .work-log-panel__incident-progress > i {
    animation: none;
  }

  .incident-plan-loading-enter-active,
  .incident-plan-loading-leave-active {
    transition: none;
  }
}
</style>
