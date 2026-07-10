import { useAuthStore } from '@/stores/authStore'

function normalizeLineText(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function extractLineTokens(value) {
  const normalizedValue = normalizeLineText(value)

  if (!normalizedValue) {
    return []
  }

  const tokens = new Set()
  const compactValue = normalizedValue.replace(/\s+/g, '')
  const lineMatch =
    normalizedValue.match(/\b([A-Z])(?:[-_\s]*(?:LINE|라인))\b/) ?? compactValue.match(/^([A-Z])라인$/)

  tokens.add(compactValue.replace(/[^A-Z0-9가-힣]/g, ''))

  if (lineMatch?.[1]) {
    tokens.add(lineMatch[1])
  }

  return [...tokens].filter(Boolean)
}

function getAssignedLineTokens() {
  const authStore = useAuthStore()
  const lines = authStore.currentUser.lines ?? []
  const tokens = new Set()

  lines.forEach((line) => {
    extractLineTokens(line.code).forEach((token) => tokens.add(token))
    extractLineTokens(line.name).forEach((token) => tokens.add(token))
  })

  return tokens
}

function getNotificationLineTokens(notification) {
  const tokens = new Set()

  extractLineTokens(notification.lineId).forEach((token) => tokens.add(token))
  extractLineTokens(notification.lineName).forEach((token) => tokens.add(token))
  extractLineTokens(notification.lineCode).forEach((token) => tokens.add(token))
  extractLineTokens(notification.message).forEach((token) => tokens.add(token))

  const equipmentLineMatch = String(notification.equipmentId ?? notification.equipmentCode ?? '').match(
    /^EQP-([A-Z])/i,
  )

  if (equipmentLineMatch?.[1]) {
    tokens.add(equipmentLineMatch[1].toUpperCase())
  }

  return tokens
}

export function shouldIncludeAssignedLineNotification(notification) {
  const assignedLineTokens = getAssignedLineTokens()

  if (!assignedLineTokens.size) {
    return true
  }

  const notificationLineTokens = getNotificationLineTokens(notification)

  if (!notificationLineTokens.size) {
    return true
  }

  return [...notificationLineTokens].some((token) => assignedLineTokens.has(token))
}

export function filterNotificationGroupsByAssignedLines(groups) {
  return groups
    .map((group) => ({
      ...group,
      rows: group.rows.filter(shouldIncludeAssignedLineNotification),
    }))
    .filter((group) => group.rows.length > 0)
}

export async function ensureNotificationLineContext() {
  const authStore = useAuthStore()

  if (!authStore.isLoaded) {
    await authStore.loadCurrentUser()
  }
}
