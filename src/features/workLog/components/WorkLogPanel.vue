<script setup>
import { computed, reactive, ref } from 'vue'

import closeIcon from '@/assets/icons/dashboard/close.svg'
import pencilIcon from '@/assets/icons/dashboard/action-pencil.png'
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
  isLoading: {
    type: Boolean,
    default: false,
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['create-log'])
const authStore = useAuthStore()
const tablePanelRef = ref(null)
const isCreateModalOpen = ref(false)
const createLogForm = reactive({
  operator: authStore.currentUser.name,
  status: 'waiting',
  task: '',
  time: '',
})

const workLogColumns = [
  { key: 'time', label: '작업 시간', cellClass: 'dashboard-table-panel__cell--light' },
  { key: 'operator', label: '작업 진행자', cellClass: 'dashboard-table-panel__cell--strong' },
  { key: 'task', label: '작업 내용', cellClass: 'dashboard-table-panel__cell--strong' },
  { key: 'status', label: '상태', cellClass: 'dashboard-table-panel__cell--center work-log-panel__status-cell' },
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

const operatorName = computed(() => authStore.currentUserName || '사용자')

function getToday() {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getCurrentTime() {
  const now = new Date()

  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function openCreateModal() {
  createLogForm.operator = operatorName.value
  createLogForm.status = 'waiting'
  createLogForm.task = ''
  createLogForm.time = getCurrentTime()
  isCreateModalOpen.value = true
}

function closeCreateModal() {
  isCreateModalOpen.value = false
}

function submitCreateLog() {
  if (props.isSubmitting) {
    return
  }

  const date = getToday()

  emit(
    'create-log',
    {
      date,
      id: `log-${date.replaceAll('-', '')}-${Date.now()}`,
      operator: createLogForm.operator,
      status: createLogForm.status,
      task: createLogForm.task.trim() || '작업 내용 미입력',
      time: createLogForm.time,
    },
    {
      onSuccess: closeCreateModal,
    },
  )
}

function scrollToDate(date) {
  tablePanelRef.value?.scrollToGroup(date)
}
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
      grid-template-columns="minmax(88px, 120px) minmax(96px, 120px) minmax(240px, 1fr) minmax(82px, 92px)"
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
    </DashboardTablePanel>

    <p v-if="isLoading" class="work-log-panel__state" data-test="work-log-loading">
      작업 로그를 불러오는 중입니다.
    </p>
    <p v-else-if="errorMessage" class="work-log-panel__state work-log-panel__state--error" data-test="work-log-error">
      {{ errorMessage }}
    </p>

    <Transition name="work-log-modal">
      <div
        v-if="isCreateModalOpen"
        class="work-log-panel__overlay"
        data-test="work-log-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-log-create-title"
      >
        <form class="work-log-panel__modal" @submit.prevent="submitCreateLog">
          <header class="work-log-panel__modal-header">
            <h2 id="work-log-create-title">작업 로그 작성</h2>
            <button
              class="work-log-panel__modal-close"
              type="button"
              aria-label="작업 로그 작성 닫기"
              :disabled="isSubmitting"
              @click="closeCreateModal"
            >
              <img :src="closeIcon" alt="" width="20" height="20" />
            </button>
          </header>

          <label class="work-log-panel__field">
            <span>작업 진행자</span>
            <input v-model="createLogForm.operator" type="text" data-test="work-log-form-operator" readonly />
          </label>

          <label class="work-log-panel__field">
            <span>작업 시간</span>
            <input v-model="createLogForm.time" type="time" data-test="work-log-form-time" />
          </label>

          <label class="work-log-panel__field">
            <span>작업 내용</span>
            <textarea
              v-model="createLogForm.task"
              rows="4"
              data-test="work-log-form-task"
              placeholder="작업 내용을 입력하세요"
              :disabled="isSubmitting"
            ></textarea>
          </label>

          <fieldset class="work-log-panel__status-field">
            <legend>상태</legend>
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

          <p v-if="errorMessage" class="work-log-panel__modal-error" data-test="work-log-form-error">
            {{ errorMessage }}
          </p>

          <button
            class="work-log-panel__submit"
            type="submit"
            data-test="work-log-form-submit"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? '저장 중' : '저장' }}
          </button>
        </form>
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
  color: var(--agentory-color-bg-primary);
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
  padding: var(--agentory-spacing-24);
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 76%);
  border-radius: var(--agentory-radius-8);
}

.work-log-panel__modal {
  display: flex;
  width: min(100%, 430px);
  padding: var(--agentory-spacing-24);
  flex-direction: column;
  gap: var(--agentory-spacing-14);
  background: var(--agentory-color-bg-app);
  border: 1px solid color-mix(in srgb, var(--agentory-color-border-primary), transparent 58%);
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
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-h3);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-h3);
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

.work-log-panel__field {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-8);
}

.work-log-panel__field span,
.work-log-panel__status-field legend {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
}

.work-log-panel__field input,
.work-log-panel__field textarea {
  width: 100%;
  padding: var(--agentory-spacing-10) var(--agentory-spacing-12);
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-surface);
  border: 0;
  border-radius: var(--agentory-radius-8);
  font-size: var(--agentory-font-size-body);
  font-family: var(--agentory-font-family-base);
  outline: none;
}

.work-log-panel__field input:disabled,
.work-log-panel__field textarea:disabled {
  opacity: 0.64;
}

.work-log-panel__field textarea {
  min-height: 96px;
  resize: vertical;
}

.work-log-panel__field input:focus,
.work-log-panel__field textarea:focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 52%);
}

.work-log-panel__status-field {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-8);
  padding: 0;
  border: 0;
}

.work-log-panel__status-options {
  display: flex;
  gap: var(--agentory-spacing-8);
}

.work-log-panel__status-option {
  min-height: 32px;
  padding: var(--agentory-spacing-6) var(--agentory-spacing-14);
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
  min-height: 34px;
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  cursor: pointer;
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
</style>
