import { computed, ref } from 'vue'

import { useNotificationCenter } from '@/features/notification/composables/useNotificationCenter'

const ALERT_TOAST_DURATION = 4200
const visibleAlertToastCount = ref(0)

export function useNotificationToastStackState() {
  return { visibleAlertToastCount }
}

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
  const alertToasts = ref([])
  const alertToast = computed(() => alertToasts.value[0] ?? null)
  let alertToastExpiresAt = 0
  let alertToastRemaining = ALERT_TOAST_DURATION
  let alertToastTimer = 0
  let onActiveToastChange
  let stopNotificationStream

  function clearAlertToastTimer() {
    if (!alertToastTimer || typeof window === 'undefined') {
      return
    }

    window.clearTimeout(alertToastTimer)
    alertToastTimer = 0
  }

  function showAlertToast(notification) {
    const nextToast = {
      ...notification,
      toastKey: `${notification.id ?? 'notification'}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`,
      tone: getNotificationToastTone(notification),
    }

    alertToasts.value = [...alertToasts.value, nextToast]
    visibleAlertToastCount.value = Math.min(alertToasts.value.length, 2)

    if (alertToasts.value.length === 1) {
      onActiveToastChange?.(nextToast)
      scheduleAlertToastDismiss(ALERT_TOAST_DURATION)
    }
  }

  function dismissAlertToast() {
    clearAlertToastTimer()
    alertToasts.value = alertToasts.value.slice(1)
    visibleAlertToastCount.value = Math.min(alertToasts.value.length, 2)
    alertToastExpiresAt = 0
    alertToastRemaining = ALERT_TOAST_DURATION

    if (alertToasts.value.length) {
      onActiveToastChange?.(alertToasts.value[0])
      scheduleAlertToastDismiss(ALERT_TOAST_DURATION)
      return
    }

    onActiveToastChange?.(null)
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
    if (!alertToasts.value.length || !alertToastTimer) {
      return
    }

    alertToastRemaining = Math.max(0, alertToastExpiresAt - Date.now())
    clearAlertToastTimer()
  }

  function resumeAlertToast() {
    if (!alertToasts.value.length || alertToastTimer) {
      return
    }

    if (alertToastRemaining <= 0) {
      dismissAlertToast()
      return
    }

    scheduleAlertToastDismiss(alertToastRemaining)
  }

  async function startAlertToastStream({ loadInitial = true, onActiveToast, onNotification } = {}) {
    if (loadInitial) {
      await loadNotifications({ unreadOnly: true })
      await primeNotificationStreamCursor()
    }

    stopNotificationStream?.()
    onActiveToastChange = onActiveToast
    stopNotificationStream = startNotificationStream({
      onNotification(notification) {
        onNotification?.(notification)
        showAlertToast(notification)
      },
    })
  }

  function stopAlertToastStream() {
    clearAlertToastTimer()
    alertToasts.value = []
    visibleAlertToastCount.value = 0
    alertToastExpiresAt = 0
    alertToastRemaining = ALERT_TOAST_DURATION
    onActiveToastChange = undefined
    stopNotificationStream?.()
    stopNotificationStream = undefined
  }

  return {
    alertToast,
    alertToasts,
    pauseAlertToast,
    resumeAlertToast,
    showAlertToast,
    startAlertToastStream,
    stopAlertToastStream,
  }
}
