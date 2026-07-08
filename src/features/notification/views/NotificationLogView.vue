<script setup>
import { onMounted } from 'vue'

import DashboardFramePage from '@/features/dashboard/components/DashboardFramePage.vue'
import NotificationLogPanel from '@/features/notification/components/NotificationLogPanel.vue'
import { useNotificationCenter } from '@/features/notification/composables/useNotificationCenter'

const { loadNotifications, notificationGroups } = useNotificationCenter()
const shouldSkipNotificationApi = import.meta.env.MODE === 'test'

onMounted(() => {
  if (shouldSkipNotificationApi) {
    return
  }

  loadNotifications()
})
</script>

<template>
  <DashboardFramePage active-navigation-id="notification" content-label="알림 이력 영역">
    <NotificationLogPanel :groups="notificationGroups" />
  </DashboardFramePage>
</template>
