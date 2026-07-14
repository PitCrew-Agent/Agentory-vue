<script setup>
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import refreshIcon from '@/assets/icons/dashboard/refresh.svg'
import DashboardCalendarPicker from '@/features/dashboard/components/DashboardCalendarPicker.vue'
import DashboardTablePanel from '@/features/dashboard/components/DashboardTablePanel.vue'
import { notificationReadStatusMap } from '@/constants/notificationStatus'

defineProps({
  activeNotificationId: {
    type: Number,
    default: null,
  },
  calendarDates: {
    type: Array,
    default: () => [],
  },
  groups: {
    type: Array,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  isResponding: {
    type: Boolean,
    default: false,
  },
  pagination: {
    type: Object,
    default: () => ({
      canGoPrevious: false,
      hasMore: false,
      pageIndex: 1,
      totalItems: 0,
      totalPages: 0,
    }),
  },
  responseError: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'mark-all-read',
  'next-page',
  'previous-page',
  'refresh',
  'select-date',
  'set-read-status',
  'start-response',
])
const { t } = useI18n()
const tablePanelRef = ref(null)
const isBulkConfirmOpen = ref(false)
const activeReadStatusMenuId = ref('')

const notificationColumns = computed(() => [
  {
    key: 'occurredAt',
    label: t('notificationLog.columns.occurredAt'),
    cellClass: 'dashboard-table-panel__cell--light',
  },
  { key: 'code', label: t('notificationLog.columns.code') },
  { key: 'message', label: t('notificationLog.columns.message') },
  {
    key: 'readStatus',
    label: t('notificationLog.columns.readStatus'),
    cellClass: 'dashboard-table-panel__cell--center notification-log-panel__status-cell',
    headerClass: 'dashboard-table-panel__header-cell--center',
  },
  {
    key: 'response',
    label: t('notificationLog.columns.response'),
    cellClass: 'dashboard-table-panel__cell--center',
    headerClass: 'dashboard-table-panel__header-cell--center',
  },
])

const readStatusOptions = computed(() => [{ value: 'read', label: t('notificationLog.markRead') }])

function getReadStatusLabel(status) {
  return t(`notificationLog.${status}`)
}

function getCodeTone(code) {
  const normalizedCode = String(code ?? '')
    .trim()
    .toUpperCase()

  if (/^(ERR|ERROR|DNG|DANGER|CRIT)/.test(normalizedCode)) {
    return 'danger'
  }

  if (/^(WRN|WARN|WARNING)/.test(normalizedCode)) {
    return 'warning'
  }

  return 'normal'
}

function openBulkConfirm() {
  activeReadStatusMenuId.value = ''
  isBulkConfirmOpen.value = true
}

function closeBulkConfirm() {
  isBulkConfirmOpen.value = false
}

function confirmBulkRead() {
  emit('mark-all-read')
  closeBulkConfirm()
}

function toggleReadStatusMenu(id) {
  activeReadStatusMenuId.value = activeReadStatusMenuId.value === id ? '' : id
}

function selectReadStatus(id, readStatus) {
  emit('set-read-status', id, readStatus)
  activeReadStatusMenuId.value = ''
}

function scrollToDate(date) {
  tablePanelRef.value?.scrollToGroup(date)
}

async function selectCalendarDate(date) {
  emit('select-date', date)
  await nextTick()
  scrollToDate(date)
}
</script>

<template>
  <div class="notification-log-panel">
    <DashboardTablePanel
      ref="tablePanelRef"
      :title="t('notificationLog.title')"
      data-test="notification-log-panel"
      row-test-prefix="notification-log-row"
      :action-label="t('notificationLog.bulkAction')"
      :columns="notificationColumns"
      :groups="groups"
      grid-template-columns="minmax(150px, 180px) minmax(90px, 120px) minmax(240px, 1fr) minmax(106px, 122px) minmax(92px, 108px)"
      @action="openBulkConfirm"
    >
      <template #title-actions>
        <DashboardCalendarPicker
          :aria-label="t('notificationLog.calendar')"
          data-test-prefix="notification"
          :dates="calendarDates"
          @select="selectCalendarDate"
        />
      </template>

      <template #header-actions>
        <button
          class="notification-log-panel__refresh"
          :class="{ 'notification-log-panel__refresh--loading': isLoading }"
          type="button"
          :disabled="isLoading"
          :aria-label="isLoading ? t('notificationLog.refreshing') : t('notificationLog.refresh')"
          :title="t('notificationLog.refresh')"
          data-test="notification-log-refresh"
          @click="emit('refresh')"
        >
          <img :src="refreshIcon" alt="" width="18" height="18" />
        </button>
      </template>

      <template #cell-code="{ row }">
        <span
          class="notification-log-panel__code"
          :class="`notification-log-panel__code--${getCodeTone(row.code)}`"
        >
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
            :aria-expanded="row.readStatus === 'unread' && activeReadStatusMenuId === row.id"
            :aria-label="
              t('notificationLog.statusSelect', { status: getReadStatusLabel(row.readStatus) })
            "
            :disabled="row.readStatus === 'read'"
            :data-read-status="row.readStatus"
            :data-test="`notification-read-status-${row.id}`"
            @click="toggleReadStatusMenu(row.id)"
          >
            {{ getReadStatusLabel(row.readStatus) }}
          </button>

          <Transition name="notification-status-menu">
            <div
              v-if="row.readStatus === 'unread' && activeReadStatusMenuId === row.id"
              class="notification-log-panel__status-menu"
              :data-test="`notification-read-menu-${row.id}`"
            >
              <button
                v-for="option in readStatusOptions"
                :key="option.value"
                class="notification-log-panel__status-option"
                :class="{
                  'notification-log-panel__status-option--active': row.readStatus === option.value,
                }"
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

      <template #cell-response="{ row }">
        <button
          class="notification-log-panel__response"
          type="button"
          :disabled="isResponding"
          :data-test="`notification-response-${row.id}`"
          @click="emit('start-response', row)"
        >
          {{
            activeNotificationId === Number(row.id)
              ? t('notificationLog.responding')
              : t('notificationLog.startResponse')
          }}
        </button>
      </template>

      <template #footer>
        <div class="notification-log-panel__pagination" data-test="notification-pagination">
          <button
            type="button"
            :disabled="isLoading || !pagination.canGoPrevious"
            data-test="notification-pagination-prev"
            @click="emit('previous-page')"
          >
            {{ t('common.previous') }}
          </button>
          <span>
            {{
              t('notificationLog.pageSummary', {
                count: pagination.totalItems,
                current: pagination.totalPages ? pagination.pageIndex : 0,
                total: pagination.totalPages,
              })
            }}
          </span>
          <button
            type="button"
            :disabled="isLoading || !pagination.hasMore"
            data-test="notification-pagination-next"
            @click="emit('next-page')"
          >
            {{ t('common.next') }}
          </button>
        </div>
      </template>
    </DashboardTablePanel>

    <p v-if="responseError" class="notification-log-panel__response-error" role="alert">
      {{ responseError }}
    </p>

    <div
      v-if="isBulkConfirmOpen"
      class="notification-log-panel__overlay"
      data-test="notification-bulk-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-bulk-confirm-title"
    >
      <section class="notification-log-panel__confirm">
        <h2 id="notification-bulk-confirm-title">{{ t('notificationLog.confirmBulkTitle') }}</h2>
        <p>{{ t('notificationLog.confirmBulkDescription') }}</p>

        <div class="notification-log-panel__confirm-actions">
          <button
            class="notification-log-panel__confirm-button notification-log-panel__confirm-button--ghost"
            type="button"
            data-test="notification-bulk-confirm-cancel"
            @click="closeBulkConfirm"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            class="notification-log-panel__confirm-button"
            type="button"
            data-test="notification-bulk-confirm-submit"
            @click="confirmBulkRead"
          >
            {{ t('notificationLog.bulkAction') }}
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

.notification-log-panel__code--normal {
  color: var(--agentory-color-text-muted);
}

.notification-log-panel__code--warning {
  color: var(--agentory-color-status-warning);
}

.notification-log-panel__message {
  font-weight: var(--agentory-font-weight-regular);
}

.notification-log-panel__response {
  min-height: 30px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-12);
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  white-space: nowrap;
  cursor: pointer;
}

.notification-log-panel__response:disabled {
  opacity: 0.5;
  cursor: wait;
}

.notification-log-panel__response-error {
  position: absolute;
  z-index: 5;
  right: var(--agentory-spacing-16);
  bottom: var(--agentory-spacing-16);
  max-width: 420px;
  margin: 0;
  padding: var(--agentory-spacing-8) var(--agentory-spacing-12);
  color: var(--agentory-color-status-danger-text);
  background: color-mix(in srgb, var(--agentory-color-bg-app), transparent 8%);
  border-radius: var(--agentory-radius-8);
  box-shadow: var(--agentory-shadow-panel-soft);
  font-size: var(--agentory-font-size-body-sm);
}

.notification-log-panel__refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-5);
  cursor: pointer;
  transition:
    background-color 160ms var(--agentory-ease-soft),
    transform 180ms var(--agentory-ease-soft),
    opacity 160ms var(--agentory-ease-soft);
}

.notification-log-panel__refresh:hover:not(:disabled) {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 90%);
}

.notification-log-panel__refresh:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 34%);
  outline-offset: 2px;
}

.notification-log-panel__refresh:active:not(:disabled) {
  transform: scale(0.92);
}

.notification-log-panel__refresh img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.notification-log-panel__refresh--loading img {
  animation: notification-refresh-spin 800ms linear infinite;
}

.notification-log-panel__refresh:disabled {
  opacity: 0.45;
  cursor: default;
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
  outline: 2px solid color-mix(in srgb, var(--agentory-color-text-primary), transparent 34%);
  outline-offset: 2px;
}

.notification-log-panel__status:disabled {
  cursor: default;
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
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-muted), transparent 42%);
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
  color: var(--agentory-color-text-primary);
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 78%);
}

.notification-log-panel__status-check {
  width: 14px;
  color: var(--agentory-color-text-primary);
  font-weight: var(--agentory-font-weight-bold);
}

.notification-log-panel__pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--agentory-spacing-8);
  padding-top: var(--agentory-spacing-4);
}

.notification-log-panel__pagination span {
  min-width: 118px;
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
  text-align: center;
}

.notification-log-panel__pagination button {
  min-height: 30px;
  padding: var(--agentory-spacing-5) var(--agentory-spacing-12);
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-surface);
  border: 1px solid color-mix(in srgb, var(--agentory-color-border-primary), transparent 62%);
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  cursor: pointer;
  transition:
    background-color 160ms var(--agentory-ease-soft),
    border-color 160ms var(--agentory-ease-soft),
    color 160ms var(--agentory-ease-soft);
}

.notification-log-panel__pagination button:hover:not(:disabled) {
  color: var(--agentory-color-bg-primary);
  background: var(--agentory-color-bg-app);
  border-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 62%);
}

.notification-log-panel__pagination button:disabled {
  opacity: 0.42;
  cursor: default;
}

.notification-log-panel__overlay {
  position: absolute;
  z-index: 10;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--agentory-spacing-24);
  background: color-mix(in srgb, var(--agentory-color-text-primary), transparent 78%);
  border-radius: var(--agentory-radius-8);
}

.notification-log-panel__confirm {
  display: flex;
  width: min(100%, 390px);
  padding: var(--agentory-spacing-24);
  flex-direction: column;
  gap: var(--agentory-spacing-12);
  background: var(--agentory-color-bg-app);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-muted), transparent 42%);
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
  background: var(--agentory-color-text-primary);
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

@keyframes notification-refresh-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
