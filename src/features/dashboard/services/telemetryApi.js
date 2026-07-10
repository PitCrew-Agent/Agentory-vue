import { equipmentStatusMap, equipmentStatusOrder, normalizeEquipmentStatus } from '@/constants/equipmentStatus'
import {
  createEmptyMetricChart,
  createEmptyMetricCharts,
  metricConfigs,
  metricIds,
} from '@/features/dashboard/constants/equipmentMetrics'
import { http } from '@/services/api/http'

const shapeByType = {
  ASHING: 'etch',
  CMP: 'deposition',
  DEPOSITION: 'deposition',
  DIFFUSION_FURNACE: 'deposition',
  ETCH: 'etch',
  FOUP_LOADPORT: 'foupLoader',
  ION_IMPLANT: 'etch',
  LITHOGRAPHY: 'metrology',
  LOADPORT: 'foupLoader',
  METROLOGY: 'metrology',
  SORTER: 'transferRobot',
  STOCKER: 'foupLoader',
  WET_CLEAN: 'deposition',
}

const shapeAliases = {
  deposition: 'deposition',
  etch: 'etch',
  foup_loader: 'foupLoader',
  fouploader: 'foupLoader',
  metrology: 'metrology',
  transfer_robot: 'transferRobot',
  transferrobot: 'transferRobot',
}

const bayLayout = {
  north: {
    rotationY: 0,
    z: 1.65,
  },
  south: {
    rotationY: Math.PI,
    z: -1.65,
  },
}

function compactText(value) {
  return String(value ?? '').trim()
}

function camelToSnake(value) {
  return String(value ?? '').replace(/([a-z0-9])([A-Z])/g, '$1_$2')
}

function normalizeMetricSource(value) {
  return compactText(value)
    .replace(/[()[\]{}]/g, '')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
}

function getMetricIdFromSource(value) {
  const normalizedValue = normalizeMetricSource(value)

  if (!normalizedValue) {
    return ''
  }

  return (
    metricIds.find((metricId) => {
      const config = metricConfigs[metricId]
      const candidates = [
        metricId,
        camelToSnake(metricId),
        config.apiKey,
        config.icon,
        config.label,
      ].map(normalizeMetricSource)

      return candidates.includes(normalizedValue)
    }) ?? ''
  )
}

function normalizeAlarmMetricIds(alarmMetrics, previousMetricIds = []) {
  const rawItems = Array.isArray(alarmMetrics)
    ? alarmMetrics
    : compactText(alarmMetrics).split(/[,\s]+/).filter(Boolean)
  const normalizedMetricIds = rawItems.map(getMetricIdFromSource).filter(Boolean)

  return normalizedMetricIds.length ? [...new Set(normalizedMetricIds)] : previousMetricIds
}

function toNumber(value) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : null
}

function formatDatePart(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10) || '-'
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function formatTimePart(value, includeSeconds = true) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    const timePart = String(value).split('T').at(-1)?.split('+')[0]?.split('.')[0] ?? ''

    return includeSeconds ? timePart.slice(0, 8) || '-' : timePart.slice(0, 5) || '-'
  }

  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
    2,
    '0',
  )}`

  return includeSeconds ? `${time}:${String(date.getSeconds()).padStart(2, '0')}` : time
}

function formatUpdatedAt(value) {
  return {
    date: formatDatePart(value),
    time: formatTimePart(value),
  }
}

function formatMetricValue(value, precision) {
  const numberValue = toNumber(value)

  if (numberValue === null) {
    return '-'
  }

  return precision === 0 ? `${Math.round(numberValue)}` : numberValue.toFixed(precision)
}

function getMetricRawValue(source, metricId) {
  const config = metricConfigs[metricId]

  if (!config) {
    return null
  }

  return toNumber(source?.[config.apiKey])
}

function getPointStatus(point, index, pointCount, detail) {
  const pointStatus = point.status ?? point.status_level ?? point.statusTone ?? point.status_tone

  if (pointStatus) {
    return normalizeEquipmentStatus(pointStatus)
  }

  if (index === pointCount - 1 && detail.status) {
    return normalizeEquipmentStatus(detail.status)
  }

  return null
}

function getMetricThresholdStatus(metricId, value) {
  const thresholds = metricConfigs[metricId]?.thresholds

  if (!thresholds || value === null) {
    return null
  }

  if (value <= thresholds.lsl || value >= thresholds.usl) {
    return equipmentStatusMap.danger
  }

  if (value <= thresholds.lcl || value >= thresholds.ucl) {
    return equipmentStatusMap.warning
  }

  return equipmentStatusMap.normal
}

function createMetrics(detail = {}) {
  return metricIds.map((metricId) => {
    const config = metricConfigs[metricId]
    const rawValue = getMetricRawValue(detail, metricId)
    const status = getMetricThresholdStatus(metricId, rawValue) ?? equipmentStatusMap.normal

    return {
      icon: config.icon,
      id: metricId,
      label: config.label,
      statusLabel: status.label,
      statusTone: status.tone,
      unit: config.unit,
      value: formatMetricValue(rawValue, config.precision),
    }
  })
}

function createMetricChart(metricId, series = [], detail = {}) {
  const config = metricConfigs[metricId]

  if (!config) {
    return createEmptyMetricChart()
  }

  const points = series
    .map((point, index) => {
      const value = getMetricRawValue(point, metricId)
      const status =
        getMetricThresholdStatus(metricId, value) ?? getPointStatus(point, index, series.length, detail)

      return {
        alarmCode: compactText(point.alarm_code ?? point.alarmCode) || detail.alarm_code || '',
        statusLabel: status?.label ?? '',
        statusTone: status?.tone ?? 'normal',
        time: formatTimePart(point.timestamp, false),
        timestamp: point.timestamp ?? '',
        value,
      }
    })
    .filter((point) => point.value !== null)

  if (!points.length) {
    const currentValue = getMetricRawValue(detail, metricId)
    const status =
      getMetricThresholdStatus(metricId, currentValue) ??
      (detail.status ? normalizeEquipmentStatus(detail.status) : null)

    if (currentValue !== null) {
      points.push({
        alarmCode: detail.alarm_code ?? '',
        statusLabel: status?.label ?? '',
        statusTone: status?.tone ?? 'normal',
        time: formatTimePart(detail.updated_at ?? new Date().toISOString(), false),
        timestamp: detail.updated_at ?? '',
        value: currentValue,
      })
    }
  }

  const values = points.map((point) => point.value)
  const thresholdValues = Object.values(config.thresholds ?? {}).filter((value) => Number.isFinite(value))
  const scaleValues = [...values, ...thresholdValues]
  const configRange = Math.max(config.max - config.min, 1)
  const dataMinValue = scaleValues.length ? Math.min(...scaleValues) : config.min
  const dataMaxValue = scaleValues.length ? Math.max(...scaleValues) : config.max
  const dataCenterValue = (dataMinValue + dataMaxValue) / 2
  const precisionRange = config.precision === 0 ? 8 : 24 * 10 ** -config.precision
  const minimumRange = Math.max(configRange * 0.14, precisionRange)
  const visibleRange = Math.max(dataMaxValue - dataMinValue, minimumRange)
  const padding = Math.max(visibleRange * 0.12, config.precision === 0 ? 2 : 0.4)
  const minValue = dataCenterValue - visibleRange / 2
  const maxValue = dataCenterValue + visibleRange / 2

  return {
    max: Number((maxValue + padding).toFixed(config.precision)),
    min: Number((minValue - padding).toFixed(config.precision)),
    points,
    precision: config.precision,
    thresholds: config.thresholds,
    title: `${config.label}(${config.unit})`,
    unit: config.unit,
  }
}

function createCharts(series = [], detail = {}) {
  return Object.fromEntries(metricIds.map((metricId) => [metricId, createMetricChart(metricId, series, detail)]))
}

function createLineId(lineName, index) {
  const normalizedName = compactText(lineName)
    .replaceAll('라인', 'line')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return normalizedName || `line-${index + 1}`
}

function getLineCode(lineName, index) {
  return compactText(lineName).match(/[a-z0-9]+/i)?.[0]?.toUpperCase() ?? String(index + 1)
}

function normalizeLineItems(lineItems = [], statusItems = []) {
  const lineNames = [
    ...lineItems.map((line) => line.line_name),
    ...statusItems.map((equipment) => equipment.line_name),
  ]
    .map(compactText)
    .filter(Boolean)
  const uniqueLineNames = [...new Set(lineNames)]

  return uniqueLineNames.map((lineName, index) => ({
    areaType: '',
    code: getLineCode(lineName, index),
    description: '',
    equipmentCount:
      lineItems.find((line) => line.line_name === lineName)?.equipment_count ??
      statusItems.filter((equipment) => equipment.line_name === lineName).length,
    id: createLineId(lineName, index),
    label: lineName,
    owner: '',
    sortOrder: index + 1,
  }))
}

function normalizeShape(shape, processType) {
  const rawShape = compactText(shape)
  const rawType = compactText(processType).toUpperCase()
  const normalizedShape = rawShape.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()

  return shapeAliases[normalizedShape] ?? shapeAliases[normalizedShape.replaceAll('_', '')] ?? shapeByType[rawType] ?? 'deposition'
}

function deriveEquipmentPosition(statusItem, equipmentIndex) {
  const position = statusItem.position
  const bayZone = compactText(statusItem.bay_zone).toLowerCase()
  const layout = bayLayout[bayZone] ?? (equipmentIndex % 2 === 0 ? bayLayout.north : bayLayout.south)

  return {
    x: toNumber(position?.x) ?? -4.8 + equipmentIndex * 1.5,
    y: toNumber(position?.y) ?? 0,
    z: toNumber(position?.z) ?? layout.z,
  }
}

function deriveEquipmentRotation(statusItem, equipmentIndex) {
  const rotationY = toNumber(statusItem.rotation_y)

  if (rotationY !== null) {
    return rotationY
  }

  const bayZone = compactText(statusItem.bay_zone).toLowerCase()

  return (bayLayout[bayZone] ?? (equipmentIndex % 2 === 0 ? bayLayout.north : bayLayout.south)).rotationY
}

function normalizeChecklist(checklist = [], equipmentId) {
  return checklist.map((item, index) => ({
    checked: false,
    id: `${equipmentId}-checklist-${index + 1}`,
    label: compactText(item.text) || '체크리스트 항목 확인',
  }))
}

function createBaseEquipment(statusItem, line, equipmentIndex) {
  const equipmentId = compactText(statusItem.equipment_id)
  const status = normalizeEquipmentStatus(statusItem.status)
  const displayOrder = toNumber(statusItem.display_order) ?? equipmentIndex + 1

  return {
    alarmMetricIds: [],
    alarmCode: compactText(statusItem.alarm_code) || '-',
    bayZone: compactText(statusItem.bay_zone),
    charts: createEmptyMetricCharts(),
    checklist: [],
    displayOrder,
    equipmentCode: equipmentId,
    id: equipmentId,
    inspectedAt: '-',
    lineId: line.id,
    lineLabel: line.label,
    metrics: createMetrics(),
    name: equipmentId,
    owner: '-',
    ownerDepartment: '',
    ownerDisplay: '-',
    position: deriveEquipmentPosition(statusItem, equipmentIndex),
    processGroup: '',
    rotationY: deriveEquipmentRotation(statusItem, equipmentIndex),
    sequence: equipmentId,
    shape: normalizeShape(statusItem.shape),
    status,
    type: compactText(statusItem.shape) || '-',
    updatedAt: {
      date: '-',
      time: '-',
    },
  }
}

function applyEquipmentDetail(equipment, detail = {}) {
  const managerName = compactText(detail.manager_name) || '-'
  const processType = compactText(detail.process_type) || equipment.type
  const alarmCode = compactText(detail.alarm_code) || equipment.alarmCode
  const alarmMetricIds = normalizeAlarmMetricIds(
    detail.alarm_metrics ?? detail.alarmMetrics,
    equipment.alarmMetricIds ?? [],
  )
  const status = detail.status ? normalizeEquipmentStatus(detail.status) : equipment.status

  return {
    ...equipment,
    alarmMetricIds,
    alarmCode,
    checklist: normalizeChecklist(detail.checklist ?? equipment.checklist, equipment.id),
    inspectedAt: formatDatePart(detail.last_inspection_at) || equipment.inspectedAt,
    metrics: createMetrics(detail),
    name: equipment.name || equipment.id,
    owner: managerName,
    ownerDisplay: managerName,
    shape: normalizeShape(equipment.shape, processType),
    status,
    type: processType,
    updatedAt: formatUpdatedAt(detail.updated_at),
  }
}

function applyEquipmentSeries(equipment, series = [], detail = {}) {
  return {
    ...equipment,
    charts: createCharts(series, detail),
  }
}

function normalizeEquipment(statusItem, detail, line, equipmentIndex, series = []) {
  const baseEquipment = createBaseEquipment(statusItem, line, equipmentIndex)
  const detailedEquipment = detail ? applyEquipmentDetail(baseEquipment, detail) : baseEquipment

  return applyEquipmentSeries(detailedEquipment, series, detail ?? {})
}

function createStatusSummary(equipmentList) {
  return equipmentStatusOrder.map((statusTone) => ({
    count: equipmentList.filter((equipment) => equipment.status.tone === statusTone).length,
    id: statusTone,
    label: equipmentStatusMap[statusTone].label,
    tone: statusTone,
  }))
}

export function createEmptyFactoryScene() {
  return {
    defaultEquipmentId: '',
    equipmentList: [],
    lineGroups: [],
    statusSummary: createStatusSummary([]),
  }
}

export function createEmptyEquipment() {
  return {
    alarmMetricIds: [],
    charts: createEmptyMetricCharts(),
    checklist: [],
    id: '',
    inspectedAt: '-',
    metrics: createMetrics(),
    name: '-',
    owner: '-',
    ownerDisplay: '-',
    status: equipmentStatusMap.normal,
    type: '-',
    updatedAt: {
      date: '-',
      time: '-',
    },
  }
}

async function fetchEquipmentDetail(equipmentId) {
  return http.get(`/api/v1/telemetry/equipment/${encodeURIComponent(equipmentId)}`)
}

async function fetchEquipmentSeries(equipmentId) {
  return http.get(`/api/v1/telemetry/equipment/${encodeURIComponent(equipmentId)}/series`)
}

export async function fetchEquipmentSuggestions(equipmentId) {
  const response = await http.get(
    `/api/v1/telemetry/equipment/${encodeURIComponent(equipmentId)}/suggestions`,
  )
  const suggestions = Array.isArray(response) ? response : response?.suggestions

  return (suggestions ?? [])
    .map((suggestion) => compactText(suggestion))
    .filter(Boolean)
    .slice(0, 3)
}

export async function fetchFactoryScene() {
  const [lineItems, statusItems] = await Promise.all([
    http.get('/api/v1/telemetry/lines'),
    http.get('/api/v1/telemetry/equipment/status'),
  ])
  const lines = normalizeLineItems(lineItems, statusItems)
  const detailResults = await Promise.allSettled(
    statusItems.map((statusItem) => fetchEquipmentDetail(statusItem.equipment_id)),
  )
  const detailByEquipmentId = new Map(
    detailResults
      .map((result, index) => [statusItems[index].equipment_id, result.status === 'fulfilled' ? result.value : null])
      .filter(([equipmentId]) => equipmentId),
  )
  const lineGroups = lines.map((line) => ({
    ...line,
    equipment: statusItems
      .filter((statusItem) => statusItem.line_name === line.label)
      .toSorted((first, second) => (first.display_order ?? 0) - (second.display_order ?? 0))
      .map((statusItem, equipmentIndex) =>
        normalizeEquipment(statusItem, detailByEquipmentId.get(statusItem.equipment_id), line, equipmentIndex),
      ),
  }))
  const equipmentList = lineGroups.flatMap((line) => line.equipment)

  return {
    defaultEquipmentId: equipmentList[0]?.id ?? '',
    equipmentList,
    lineGroups,
    statusSummary: createStatusSummary(equipmentList),
  }
}

export async function fetchEquipmentTelemetry(equipmentId, baseEquipment = createEmptyEquipment()) {
  const [detail, series] = await Promise.all([
    fetchEquipmentDetail(equipmentId),
    fetchEquipmentSeries(equipmentId),
  ])
  const nextEquipment = applyEquipmentDetail(baseEquipment, detail)

  return applyEquipmentSeries(nextEquipment, series, detail)
}
