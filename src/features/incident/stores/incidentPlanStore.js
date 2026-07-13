import { defineStore } from 'pinia'

import { createIncidentPlanRequest } from '@/features/incident/services/incidentPlanApi'

export const useIncidentPlanStore = defineStore('incidentPlan', {
  state: () => ({
    activeNotificationId: null,
    errorMessage: '',
    errorNotificationId: null,
    isCreating: false,
    pendingPlan: null,
  }),
  actions: {
    clearError() {
      this.errorMessage = ''
      this.errorNotificationId = null
    },
    consumePendingPlan() {
      const plan = this.pendingPlan

      this.pendingPlan = null

      return plan
    },
    async createFromNotification(notificationId) {
      const normalizedId = Number(notificationId)

      if (!Number.isInteger(normalizedId) || normalizedId < 1 || this.isCreating) {
        return null
      }

      this.activeNotificationId = normalizedId
      this.errorMessage = ''
      this.errorNotificationId = null
      this.isCreating = true

      try {
        const plan = await createIncidentPlanRequest(normalizedId)

        this.pendingPlan = plan

        return plan
      } catch {
        this.errorMessage = '대응 계획을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.'
        this.errorNotificationId = normalizedId
        return null
      } finally {
        this.activeNotificationId = null
        this.isCreating = false
      }
    },
  },
})
