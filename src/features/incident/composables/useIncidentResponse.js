import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import { useIncidentPlanStore } from '@/features/incident/stores/incidentPlanStore'

export function useIncidentResponse() {
  const router = useRouter()
  const incidentPlanStore = useIncidentPlanStore()
  const { activeNotificationId, errorMessage, errorNotificationId, isCreating } =
    storeToRefs(incidentPlanStore)

  async function startIncidentResponse(notification) {
    const plan = await incidentPlanStore.createFromNotification(notification?.id)

    if (!plan) {
      return null
    }

    if (router.currentRoute.value.name !== 'WorkLog') {
      await router.push({ name: 'WorkLog' })
    }

    return plan
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
