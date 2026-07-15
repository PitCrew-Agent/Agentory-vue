import { metricConfigs } from '@/features/dashboard/constants/equipmentMetrics'
import { http } from '@/services/api/http'

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  )
}

function normalizeDateTimeParam(value, fallbackTime) {
  const normalizedValue = String(value ?? '').trim()

  if (!normalizedValue) {
    return ''
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)
    ? `${normalizedValue}T${fallbackTime}`
    : normalizedValue
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

function normalizeMetricId(value) {
  return String(value ?? '')
    .trim()
    .replace(/_([a-z])/g, (_, character) => character.toUpperCase())
}

function normalizeAlarmSensorSummary(item = {}) {
  const metricId = normalizeMetricId(item.metric)
  const metricConfig = metricConfigs[metricId]

  return {
    count: Number(item.count) || 0,
    firstSeen: item.first_seen ?? '',
    lastSeen: item.last_seen ?? '',
    metricId,
    metricLabelKey: metricConfig?.labelKey ?? 'metrics.unclassified',
  }
}

function normalizeRepairItem(item = {}) {
  return {
    alarmCode: String(item.alarm_code_before ?? '').trim(),
    equipmentId: String(item.equipment_id ?? '').trim(),
    id: item.id ?? null,
    note: String(item.note ?? '').trim(),
    repairedAt: item.repaired_at ?? '',
    repairedBy: item.repaired_by ?? null,
    repairedByName: String(item.repaired_by_name ?? '').trim(),
  }
}

export async function fetchEquipmentSensorSeries(equipmentId, options = {}) {
  const response = await http.get(
    `/api/v1/telemetry/equipment/${encodeURIComponent(equipmentId)}/series`,
    {
      params: compactParams({
        end: normalizeDateTimeParam(options.end, '23:59:59'),
        start: normalizeDateTimeParam(options.start, '00:00:00'),
      }),
    },
  )

  return (Array.isArray(response) ? response : []).map(normalizeSensorPoint)
}

export async function fetchEquipmentAlarmSensorSummary(equipmentId, options = {}) {
  const response = await http.get(
    `/api/v1/telemetry/equipment/${encodeURIComponent(equipmentId)}/alarms/sensors`,
    {
      params: compactParams({
        end: normalizeDateTimeParam(options.end, '23:59:59'),
        start: normalizeDateTimeParam(options.start, '00:00:00'),
      }),
    },
  )

  return (Array.isArray(response) ? response : []).map(normalizeAlarmSensorSummary)
}

export async function fetchEquipmentRepairHistory(equipmentId, options = {}) {
  const response = await http.get(
    `/api/v1/admin/equipment/${encodeURIComponent(equipmentId)}/repairs`,
    {
      params: compactParams({
        before: options.before,
        limit: options.limit ?? 10,
      }),
    },
  )

  return {
    hasMore: Boolean(response?.has_more),
    items: (Array.isArray(response?.items) ? response.items : []).map(normalizeRepairItem),
    nextCursor: response?.next_cursor ?? null,
  }
}
