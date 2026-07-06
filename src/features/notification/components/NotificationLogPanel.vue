<script setup>
import { ref } from 'vue'

import DashboardCalendarPicker from '@/features/dashboard/components/DashboardCalendarPicker.vue'
import DashboardTablePanel from '@/features/dashboard/components/DashboardTablePanel.vue'
import { useNotificationCenter } from '@/features/notification/composables/useNotificationCenter'
import { notificationReadStatusMap } from '@/features/notification/mock/notificationLogMock'

defineProps({
  groups: {
    type: Array,
    required: true,
  },
})

const { markAllNotificationsRead, setNotificationReadStatus } = useNotificationCenter()
const tablePanelRef = ref(null)
const isBulkConfirmOpen = ref(false)
const activeReadStatusMenuId = ref('')

const notificationColumns = [
  { key: 'occurredAt', label: '발생 시간', cellClass: 'dashboard-table-panel__cell--light' },
  { key: 'code', label: '알림 코드' },
  { key: 'message', label: '알림 내용' },
  {
    key: 'readStatus',
    label: '상태',
    cellClass: 'dashboard-table-panel__cell--center notification-log-panel__status-cell',
  },
]

const readStatusOptions = [
  { value: 'read', label: '읽음' },
  { value: 'unread', label: '읽지 않음' },
]

function getCodeTone(code) {
  if (code.startsWith('ERR')) {
    return 'danger'
  }

  if (code.startsWith('WARN')) {
    return 'warning'
  }

  return 'offline'
}

function openBulkConfirm() {
  activeReadStatusMenuId.value = ''
  isBulkConfirmOpen.value = true
}

function closeBulkConfirm() {
  isBulkConfirmOpen.value = false
}

function confirmBulkRead() {
  markAllNotificationsRead()
  closeBulkConfirm()
}

function toggleReadStatusMenu(id) {
  activeReadStatusMenuId.value = activeReadStatusMenuId.value === id ? '' : id
}

function selectReadStatus(id, readStatus) {
  setNotificationReadStatus(id, readStatus)
  activeReadStatusMenuId.value = ''
}

function scrollToDate(date) {
  tablePanelRef.value?.scrollToGroup(date)
}
</script>

<template>
  <div class="notification-log-panel">
    <DashboardTablePanel
      ref="tablePanelRef"
      title="알림 이력"
      data-test="notification-log-panel"
      row-test-prefix="notification-log-row"
      action-label="일괄 읽음 처리"
      :columns="notificationColumns"
      :groups="groups"
      grid-template-columns="minmax(150px, 180px) minmax(90px, 120px) minmax(240px, 1fr) minmax(106px, 122px)"
      @action="openBulkConfirm"
    >
      <template #title-actions>
        <DashboardCalendarPicker
          aria-label="알림 이력 날짜 선택"
          data-test-prefix="notification"
          :dates="groups.map((group) => group.date)"
          @select="scrollToDate"
        />
      </template>

      <template #cell-code="{ row }">
        <span class="notification-log-panel__code" :class="`notification-log-panel__code--${getCodeTone(row.code)}`">
          {{ row.code }}
        </span>
      </template>

      <template #cell-message="{ row }">
        <span class="notification-log-panel__message">{{ row.message }}</span>
      </template>

      <template #cell-readStatus="{ row }">
        <div class="notification-log-panel__status-control">
          <button
            class="notification-log-panel__status"
            :class="`notification-log-panel__status--${notificationReadStatusMap[row.readStatus].tone}`"
            type="button"
            :aria-expanded="activeReadStatusMenuId === row.id"
            :aria-label="`${notificationReadStatusMap[row.readStatus].label} 상태 선택`"
            :data-read-status="row.readStatus"
            :data-test="`notification-read-status-${row.id}`"
            @click="toggleReadStatusMenu(row.id)"
          >
            {{ notificationReadStatusMap[row.readStatus].label }}
          </button>

          <Transition name="notification-status-menu">
            <div
              v-if="activeReadStatusMenuId === row.id"
              class="notification-log-panel__status-menu"
              :data-test="`notification-read-menu-${row.id}`"
            >
              <button
                v-for="option in readStatusOptions"
                :key="option.value"
                class="notification-log-panel__status-option"
                :class="{ 'notification-log-panel__status-option--active': row.readStatus === option.value }"
                type="button"
                :data-test="`notification-read-option-${row.id}-${option.value}`"
                @click="selectReadStatus(row.id, option.value)"
              >
                <span class="notification-log-panel__status-check" aria-hidden="true">
                  {{ row.readStatus === option.value ? '✓' : '' }}
                </span>
                <span>{{ option.label }}</span>
              </button>
            </div>
          </Transition>
        </div>
      </template>
    </DashboardTablePanel>

    <div
      v-if="isBulkConfirmOpen"
      class="notification-log-panel__overlay"
      data-test="notification-bulk-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-bulk-confirm-title"
    >
      <section class="notification-log-panel__confirm">
        <h2 id="notification-bulk-confirm-title">알림을 모두 읽음 처리할까요?</h2>
        <p>현재 알림 이력의 읽지 않은 항목이 모두 읽음으로 변경됩니다.</p>

        <div class="notification-log-panel__confirm-actions">
          <button
            class="notification-log-panel__confirm-button notification-log-panel__confirm-button--ghost"
            type="button"
            data-test="notification-bulk-confirm-cancel"
            @click="closeBulkConfirm"
          >
            취소
          </button>
          <button
            class="notification-log-panel__confirm-button"
            type="button"
            data-test="notification-bulk-confirm-submit"
            @click="confirmBulkRead"
          >
            읽음 처리
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.notification-log-panel {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.notification-log-panel__code {
  font-weight: var(--agentory-font-weight-bold);
}

.notification-log-panel__code--danger {
  color: var(--agentory-color-status-danger-text);
}

.notification-log-panel__code--offline {
  color: var(--agentory-color-alert-offline);
}

.notification-log-panel__code--warning {
  color: var(--agentory-color-alert-warning);
}

.notification-log-panel__message {
  font-weight: var(--agentory-font-weight-regular);
}

:global(.notification-log-panel__status-cell) {
  position: relative;
  overflow: visible;
}

.notification-log-panel__status-control {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: var(--agentory-spacing-6);
  width: 128px;
}

.notification-log-panel__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 74px;
  min-height: 30px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-14);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  line-height: 1.1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.notification-log-panel__status:focus-visible {
  outline: 2px solid var(--agentory-color-border-primary);
  outline-offset: 2px;
}

.notification-log-panel__status--read {
  color: var(--agentory-color-status-waiting);
  background: var(--agentory-color-status-normal-text);
}

.notification-log-panel__status--unread {
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-status-waiting);
}

.notification-log-panel__status-menu {
  z-index: 6;
  display: flex;
  width: 100%;
  max-height: 78px;
  padding: var(--agentory-spacing-6);
  flex-direction: column;
  gap: var(--agentory-spacing-4);
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border: 1px solid color-mix(in srgb, var(--agentory-color-border-primary), transparent 58%);
  border-radius: var(--agentory-radius-8);
  box-shadow: var(--agentory-shadow-panel-soft);
}

.notification-status-menu-enter-active,
.notification-status-menu-leave-active {
  transition:
    max-height 190ms ease,
    opacity 170ms ease,
    transform 190ms ease,
    padding-top 190ms ease,
    padding-bottom 190ms ease;
}

.notification-status-menu-enter-from,
.notification-status-menu-leave-to {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  transform: translateY(-4px);
}

.notification-log-panel__status-option {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  align-items: center;
  gap: var(--agentory-spacing-6);
  width: 100%;
  min-height: 28px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-8);
  color: var(--agentory-color-text-primary);
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-5);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  text-align: left;
  cursor: pointer;
}

.notification-log-panel__status-option--active,
.notification-log-panel__status-option:hover {
  color: var(--agentory-color-bg-primary);
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 90%);
}

.notification-log-panel__status-check {
  width: 14px;
  color: var(--agentory-color-bg-primary);
  font-weight: var(--agentory-font-weight-bold);
}

.notification-log-panel__overlay {
  position: absolute;
  z-index: 10;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--agentory-spacing-24);
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 78%);
  border-radius: var(--agentory-radius-8);
}

.notification-log-panel__confirm {
  display: flex;
  width: min(100%, 390px);
  padding: var(--agentory-spacing-24);
  flex-direction: column;
  gap: var(--agentory-spacing-12);
  background: var(--agentory-color-bg-app);
  border: 1px solid color-mix(in srgb, var(--agentory-color-border-primary), transparent 58%);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel-soft);
}

.notification-log-panel__confirm h2 {
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-h3);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-h3);
}

.notification-log-panel__confirm p {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body);
  line-height: var(--agentory-line-height-body);
}

.notification-log-panel__confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--agentory-spacing-8);
  margin-top: var(--agentory-spacing-8);
}

.notification-log-panel__confirm-button {
  min-height: 32px;
  padding: var(--agentory-spacing-6) var(--agentory-spacing-16);
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  cursor: pointer;
}

.notification-log-panel__confirm-button--ghost {
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-surface);
}
</style>
