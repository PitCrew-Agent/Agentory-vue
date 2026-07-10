<script setup>
import { onMounted } from 'vue'

import DashboardFramePage from '@/features/dashboard/components/DashboardFramePage.vue'
import NotificationLogPanel from '@/features/notification/components/NotificationLogPanel.vue'
import { useNotificationLog } from '@/features/notification/composables/useNotificationLog'

const {
  isNotificationLoading,
  loadNextNotificationsPage,
  loadNotifications,
  loadPreviousNotificationsPage,
  markAllNotificationsRead,
  notificationGroups,
  notificationPagination,
  setNotificationReadStatus,
} = useNotificationLog()
const shouldSkipNotificationApi = import.meta.env.MODE === 'test'

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
      :groups="notificationGroups"
      :is-loading="isNotificationLoading"
      :pagination="notificationPagination"
      @mark-all-read="markAllNotificationsRead"
      @next-page="loadNextNotificationsPage"
      @previous-page="loadPreviousNotificationsPage"
      @refresh="refreshNotifications"
      @set-read-status="setNotificationReadStatus"
    />
  </DashboardFramePage>
</template>
