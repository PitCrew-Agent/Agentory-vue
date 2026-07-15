import { ref } from 'vue'

import { useNotificationCenter } from '@/features/notification/composables/useNotificationCenter'

const ALERT_TOAST_DURATION = 4200

function getNotificationToastTone(notification) {
  const source = `${notification.code ?? ''} ${notification.message ?? ''}`.toLowerCase()

  if (/danger|critical|error|err|위험|긴급/.test(source)) {
    return 'danger'
  }

  return 'warning'
}

export function useNotificationToast() {
  const { loadNotifications, primeNotificationStreamCursor, startNotificationStream } =
    useNotificationCenter()
  const alertToast = ref(null)
  let alertToastExpiresAt = 0
  let alertToastRemaining = ALERT_TOAST_DURATION
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

    scheduleAlertToastDismiss(ALERT_TOAST_DURATION)
  }

  function dismissAlertToast() {
    clearAlertToastTimer()
    alertToast.value = null
    alertToastExpiresAt = 0
    alertToastRemaining = ALERT_TOAST_DURATION
  }

  function scheduleAlertToastDismiss(duration) {
    clearAlertToastTimer()
    alertToastRemaining = duration

    if (typeof window === 'undefined') {
      return
    }

    alertToastExpiresAt = Date.now() + duration
    alertToastTimer = window.setTimeout(dismissAlertToast, duration)
  }

  function pauseAlertToast() {
    if (!alertToast.value || !alertToastTimer) {
      return
    }

    alertToastRemaining = Math.max(0, alertToastExpiresAt - Date.now())
    clearAlertToastTimer()
  }

  function resumeAlertToast() {
    if (!alertToast.value || alertToastTimer) {
      return
    }

    if (alertToastRemaining <= 0) {
      dismissAlertToast()
      return
    }

    scheduleAlertToastDismiss(alertToastRemaining)
  }

  async function startAlertToastStream({ loadInitial = true, onNotification } = {}) {
    if (loadInitial) {
      await loadNotifications({ unreadOnly: true })
      await primeNotificationStreamCursor()
    }

    stopNotificationStream?.()
    stopNotificationStream = startNotificationStream({
      onNotification(notification) {
        showAlertToast(notification)
        onNotification?.(notification)
      },
    })
  }

  function stopAlertToastStream() {
    dismissAlertToast()
    stopNotificationStream?.()
    stopNotificationStream = undefined
  }

  return {
    alertToast,
    pauseAlertToast,
    resumeAlertToast,
    showAlertToast,
    startAlertToastStream,
    stopAlertToastStream,
  }
}
