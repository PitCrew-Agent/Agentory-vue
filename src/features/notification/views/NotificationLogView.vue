<script setup>
import { onMounted } from 'vue'

import DashboardFramePage from '@/features/dashboard/components/DashboardFramePage.vue'
import NotificationLogPanel from '@/features/notification/components/NotificationLogPanel.vue'
import { useNotificationLog } from '@/features/notification/composables/useNotificationLog'
import { useIncidentResponse } from '@/features/incident/composables/useIncidentResponse'

const {
  goToNotificationDate,
  isNotificationLoading,
  loadNextNotificationsPage,
  loadNotifications,
  loadPreviousNotificationsPage,
  markAllNotificationsRead,
  notificationDates,
  notificationGroups,
  notificationPagination,
  setNotificationReadStatus,
} = useNotificationLog()
const shouldSkipNotificationApi = import.meta.env.MODE === 'test'
const { activeNotificationId, incidentErrorMessage, isIncidentCreating, startIncidentResponse } =
  useIncidentResponse()

async function refreshNotifications() {
  if (shouldSkipNotificationApi) {
    return
  }

  await loadNotifications({ reset: true, unreadOnly: false })
}

onMounted(() => {
  refreshNotifications()
})
</script>

<template>
  <DashboardFramePage
    active-navigation-id="notification"
    content-label="알림 이력 영역"
    :is-loading="isNotificationLoading"
  >
    <NotificationLogPanel
      :active-notification-id="activeNotificationId"
      :groups="notificationGroups"
      :is-loading="isNotificationLoading"
      :is-responding="isIncidentCreating"
      :calendar-dates="notificationDates"
      :pagination="notificationPagination"
      :response-error="incidentErrorMessage"
      @mark-all-read="markAllNotificationsRead"
      @next-page="loadNextNotificationsPage"
      @previous-page="loadPreviousNotificationsPage"
      @refresh="refreshNotifications"
      @select-date="goToNotificationDate"
      @set-read-status="setNotificationReadStatus"
      @start-response="startIncidentResponse"
    />
  </DashboardFramePage>
</template>
