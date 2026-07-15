import { readonly, ref } from 'vue'

const equipmentFocusRequest = ref(null)

export function requestDashboardEquipmentFocus(notification = {}) {
  const equipmentId = notification.equipmentId ?? notification.equipmentCode

  if (!equipmentId) {
    return null
  }

  const request = {
    equipmentId,
    key: `notification:${notification.id ?? Date.now()}:${equipmentId}`,
  }

  equipmentFocusRequest.value = request
  return request
}

export function useDashboardEquipmentFocus() {
  function consumeEquipmentFocusRequest() {
    const request = equipmentFocusRequest.value

    equipmentFocusRequest.value = null
    return request
  }

  return {
    consumeEquipmentFocusRequest,
    equipmentFocusRequest: readonly(equipmentFocusRequest),
  }
}
