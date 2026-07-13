import { normalizeEquipmentStatus } from '@/constants/equipmentStatus'
import { getAlarmMetrics } from '@/features/dashboard/constants/alarmMetrics'
import { http } from '@/services/api/http'

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  )
}

function normalizeNumber(value) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : null
}

function normalizeSensorPoint(item = {}) {
  return {
    gasFlow: normalizeNumber(item.gas_flow),
    pressure: normalizeNumber(item.pressure),
    rfPower: normalizeNumber(item.rf_power),
    temperature: normalizeNumber(item.temperature),
    timestamp: item.timestamp ?? '',
  }
}

function normalizeAlarmSummary(item = {}) {
  const status = normalizeEquipmentStatus(item.severity)
  const alarmCode = String(item.alarm_code ?? '').trim()
  const metrics = getAlarmMetrics(alarmCode)

  return {
    alarmCode,
    count: Number(item.count) || 0,
    firstSeen: item.first_seen ?? '',
    lastSeen: item.last_seen ?? '',
    metrics,
    statusLabel: status.label,
    statusTone: status.tone,
  }
}

export async function fetchEquipmentSensorSeries(equipmentId, options = {}) {
  const response = await http.get(
    `/api/v1/telemetry/equipment/${encodeURIComponent(equipmentId)}/series`,
    {
      params: compactParams({
        end: options.end,
        start: options.start,
      }),
    },
  )

  return (Array.isArray(response) ? response : []).map(normalizeSensorPoint)
}

export async function fetchEquipmentAlarmSummary(equipmentId, options = {}) {
  const response = await http.get(
    `/api/v1/telemetry/equipment/${encodeURIComponent(equipmentId)}/alarms/summary`,
    {
      params: compactParams({
        alarm_code: options.alarmCode,
        end: options.end,
        start: options.start,
      }),
    },
  )

  return (Array.isArray(response) ? response : []).map(normalizeAlarmSummary)
}
