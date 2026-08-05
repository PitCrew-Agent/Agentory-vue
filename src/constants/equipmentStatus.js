export const equipmentStatusMap = {
  danger: {
    label: '위험',
    labelKey: 'status.danger',
    tone: 'danger',
  },
  normal: {
    label: '양호',
    labelKey: 'status.normal',
    tone: 'normal',
  },
  warning: {
    label: '주의',
    labelKey: 'status.warning',
    tone: 'warning',
  },
}

export const equipmentStatusOrder = ['normal', 'warning', 'danger']

export const CRITICAL_COOLING_ALARM_CODE = 'ERR-402'

export function isCriticalCoolingAlarm(alarmCode) {
  return (
    String(alarmCode ?? '')
      .trim()
      .toUpperCase() === CRITICAL_COOLING_ALARM_CODE
  )
}

export function normalizeAlarmCodeTone(alarmCode) {
  const normalizedCode = String(alarmCode ?? '')
    .trim()
    .toUpperCase()

  if (normalizedCode.startsWith('ERR-')) {
    return 'danger'
  }

  if (normalizedCode.startsWith('WRN-')) {
    return 'warning'
  }

  return null
}

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

  return (
    statusToneByLabel[normalizedStatus] ??
    statusToneByLabel[normalizedStatus.toLowerCase()] ??
    'normal'
  )
}

export function normalizeEquipmentStatus(status) {
  const tone = normalizeEquipmentStatusTone(status)

  return equipmentStatusMap[tone]
}

export function resolveEquipmentStatus(status, alarmCode) {
  const alarmTone = normalizeAlarmCodeTone(alarmCode)

  return alarmTone ? equipmentStatusMap[alarmTone] : normalizeEquipmentStatus(status)
}
