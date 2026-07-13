const METRIC_CATALOG = Object.freeze({
  gasFlow: Object.freeze({ label: '가스 유량', order: 3 }),
  pressure: Object.freeze({ label: '압력', order: 1 }),
  rfPower: Object.freeze({ label: 'RF 파워', order: 2 }),
  temperature: Object.freeze({ label: '온도', order: 0 }),
})

// The telemetry API currently omits sensor fields, so this mirrors the backend alarm definition.
const ALARM_METRIC_IDS = Object.freeze({
  'ERR-201': Object.freeze(['rfPower']),
  'ERR-301': Object.freeze(['pressure']),
  'ERR-401': Object.freeze(['temperature']),
  'ERR-402': Object.freeze(['temperature', 'pressure']),
  'ERR-901': Object.freeze(['rfPower', 'temperature']),
  'WRN-501': Object.freeze(['gasFlow']),
  'WRN-701': Object.freeze(['temperature']),
  'WRN-702': Object.freeze(['pressure']),
  'WRN-703': Object.freeze(['rfPower']),
  'WRN-704': Object.freeze(['gasFlow']),
  'WRN-801': Object.freeze([]),
})

function createMetricItems(metricIds) {
  if (!metricIds.length) {
    return [{ id: 'multiSensor', label: '복합 센서', order: 90 }]
  }

  return metricIds
    .map((metricId) => ({ id: metricId, ...METRIC_CATALOG[metricId] }))
    .toSorted((first, second) => first.order - second.order)
}

export function getAlarmMetrics(alarmCode) {
  const normalizedCode = String(alarmCode ?? '')
    .trim()
    .toUpperCase()

  if (!Object.hasOwn(ALARM_METRIC_IDS, normalizedCode)) {
    return [{ id: 'unclassified', label: '기타 센서', order: 99 }]
  }

  return createMetricItems(ALARM_METRIC_IDS[normalizedCode])
}
