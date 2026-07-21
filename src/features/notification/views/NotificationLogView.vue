<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import DashboardFramePage from '@/features/dashboard/components/DashboardFramePage.vue'
import NotificationLogPanel from '@/features/notification/components/NotificationLogPanel.vue'
import { useNotificationLog } from '@/features/notification/composables/useNotificationLog'
import { useIncidentResponse } from '@/features/incident/composables/useIncidentResponse'

const {
  goToNotificationDate,
  isNotificationLoading,
  loadNextNotificationsPage,
  loadNotifications,
  loadNotificationsPage,
  loadPreviousNotificationsPage,
  markAllNotificationsRead,
  notificationDates,
  notificationGroups,
  notificationPagination,
  setNotificationReadStatus,
} = useNotificationLog()
const { t } = useI18n()
const notificationLogPanelRef = ref(null)
const shouldSkipNotificationApi = import.meta.env.MODE === 'test'
const { activeNotificationId, incidentErrorMessage, isIncidentCreating, startIncidentResponse } =
  useIncidentResponse()

async function refreshNotifications() {
  if (shouldSkipNotificationApi) {
    return
  }

  await loadNotifications({ reset: true, unreadOnly: false })
}

async function startNotificationResponse(notification) {
  const readRequest = setNotificationReadStatus(notification.id, 'read')
  const responseRequest = startIncidentResponse(notification, { markAsRead: false })

  await readRequest

  return responseRequest
}

async function selectNotificationDate(date) {
  const didFindDate = await goToNotificationDate(date)

  if (!didFindDate) {
    return
  }

  await nextTick()
  notificationLogPanelRef.value?.scrollToDate(date)
}

onMounted(() => {
  refreshNotifications()
})
</script>

<template>
  <DashboardFramePage
    active-navigation-id="notification"
    :content-label="t('notificationLog.contentLabel')"
    :is-loading="isNotificationLoading"
  >
    <NotificationLogPanel
      ref="notificationLogPanelRef"
      :active-notification-id="activeNotificationId"
      :groups="notificationGroups"
      :is-loading="isNotificationLoading"
      :is-responding="isIncidentCreating"
      :calendar-dates="notificationDates"
      :pagination="notificationPagination"
      :response-error="incidentErrorMessage"
      @mark-all-read="markAllNotificationsRead"
      @next-page="loadNextNotificationsPage"
      @page-change="loadNotificationsPage"
      @previous-page="loadPreviousNotificationsPage"
      @refresh="refreshNotifications"
      @select-date="selectNotificationDate"
      @set-read-status="setNotificationReadStatus"
      @start-response="startNotificationResponse"
    />
  </DashboardFramePage>
</template>
