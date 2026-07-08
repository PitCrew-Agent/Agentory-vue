export const metricConfigs = {
  gasFlow: {
    apiKey: 'gas_flow',
    icon: 'gasFlow',
    label: '가스유량',
    max: 300,
    min: 180,
    precision: 0,
    unit: 'sccm',
  },
  pressure: {
    apiKey: 'pressure',
    icon: 'pressure',
    label: '압력',
    max: 62,
    min: 18,
    precision: 1,
    unit: 'mTorr',
  },
  rfPower: {
    apiKey: 'rf_power',
    icon: 'rfPower',
    label: 'RF 파워',
    max: 18,
    min: 8,
    precision: 1,
    unit: 'kW',
  },
  temperature: {
    apiKey: 'temperature',
    icon: 'temperature',
    label: '온도',
    max: 72,
    min: 34,
    precision: 1,
    unit: '°C',
  },
}

export const metricIds = Object.keys(metricConfigs)

export function createEmptyMetricChart(metricId = 'temperature') {
  const config = metricConfigs[metricId] ?? metricConfigs.temperature

  return {
    max: config.max,
    min: config.min,
    points: [],
    title: `${config.label}(${config.unit})`,
  }
}

export function createEmptyMetricCharts() {
  return Object.fromEntries(metricIds.map((metricId) => [metricId, createEmptyMetricChart(metricId)]))
}
