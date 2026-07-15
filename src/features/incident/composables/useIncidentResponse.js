import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import { useIncidentPlanStore } from '@/features/incident/stores/incidentPlanStore'
import { useNotificationCenter } from '@/features/notification/composables/useNotificationCenter'

export function useIncidentResponse() {
  const router = useRouter()
  const incidentPlanStore = useIncidentPlanStore()
  const notificationCenter = useNotificationCenter()
  const { activeNotificationId, errorMessage, errorNotificationId, isCreating } =
    storeToRefs(incidentPlanStore)

  async function startIncidentResponse(notification, { markAsRead = true } = {}) {
    const notificationId = Number(notification?.id)

    if (!Number.isInteger(notificationId) || notificationId < 1) {
      return null
    }

    const planRequest = incidentPlanStore.createFromNotification(notificationId)
    const readRequest = markAsRead
      ? notificationCenter.markNotificationRead(notificationId)
      : Promise.resolve()

    if (router.currentRoute.value.name !== 'WorkLog') {
      await router.push({ name: 'WorkLog' })
    }

    await readRequest

    return planRequest
  }

  return {
    activeNotificationId,
    clearIncidentError: incidentPlanStore.clearError,
    incidentErrorMessage: errorMessage,
    incidentErrorNotificationId: errorNotificationId,
    isIncidentCreating: isCreating,
    startIncidentResponse,
  }
}
