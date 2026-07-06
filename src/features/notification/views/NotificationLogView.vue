<script setup>
import DashboardFramePage from '@/features/dashboard/components/DashboardFramePage.vue'
import NotificationLogPanel from '@/features/notification/components/NotificationLogPanel.vue'
import { useNotificationCenter } from '@/features/notification/composables/useNotificationCenter'

const { notificationGroups } = useNotificationCenter()
</script>

<template>
  <DashboardFramePage active-navigation-id="notification" content-label="알림 이력 영역">
    <NotificationLogPanel :groups="notificationGroups" />
  </DashboardFramePage>
</template>
