export const equipmentStatusMap = {
  danger: {
    label: '위험',
    tone: 'danger',
  },
  normal: {
    label: '양호',
    tone: 'normal',
  },
  warning: {
    label: '주의',
    tone: 'warning',
  },
}

export const equipmentStatusOrder = ['normal', 'warning', 'danger']

const statusToneByLabel = {
  critical: 'danger',
  danger: 'danger',
  error: 'danger',
  good: 'normal',
  normal: 'normal',
  ok: 'normal',
  warning: 'warning',
  양호: 'normal',
  위험: 'danger',
  주의: 'warning',
}

export function normalizeEquipmentStatusTone(status) {
  const normalizedStatus = String(status ?? '').trim()

  return statusToneByLabel[normalizedStatus] ?? statusToneByLabel[normalizedStatus.toLowerCase()] ?? 'normal'
}

export function normalizeEquipmentStatus(status) {
  const tone = normalizeEquipmentStatusTone(status)

  return equipmentStatusMap[tone]
}
