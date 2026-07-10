import { ref } from 'vue'

import { useNotificationCenter } from '@/features/notification/composables/useNotificationCenter'

function getNotificationToastTone(notification) {
  const source = `${notification.code ?? ''} ${notification.message ?? ''}`.toLowerCase()

  if (/danger|critical|error|err|위험|긴급/.test(source)) {
    return 'danger'
  }

  return 'warning'
}

export function useNotificationToast() {
  const { loadNotifications, primeNotificationStreamCursor, startNotificationStream } = useNotificationCenter()
  const alertToast = ref(null)
  let alertToastTimer = 0
  let stopNotificationStream

  function clearAlertToastTimer() {
    if (!alertToastTimer || typeof window === 'undefined') {
      return
    }

    window.clearTimeout(alertToastTimer)
    alertToastTimer = 0
  }

  function showAlertToast(notification) {
    clearAlertToastTimer()
    alertToast.value = {
      ...notification,
      tone: getNotificationToastTone(notification),
    }

    if (typeof window !== 'undefined') {
      alertToastTimer = window.setTimeout(() => {
        alertToast.value = null
        alertToastTimer = 0
      }, 4200)
    }
  }

  async function startAlertToastStream({ loadInitial = true } = {}) {
    if (loadInitial) {
      await loadNotifications({ unreadOnly: true })
      await primeNotificationStreamCursor()
    }

    stopNotificationStream?.()
    stopNotificationStream = startNotificationStream({
      onNotification: showAlertToast,
    })
  }

  function stopAlertToastStream() {
    clearAlertToastTimer()
    stopNotificationStream?.()
    stopNotificationStream = undefined
    alertToast.value = null
  }

  return {
    alertToast,
    showAlertToast,
    startAlertToastStream,
    stopAlertToastStream,
  }
}
