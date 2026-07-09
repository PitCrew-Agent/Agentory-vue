export const metricConfigs = {
  gasFlow: {
    apiKey: 'gas_flow',
    icon: 'gasFlow',
    label: '가스유량',
    max: 660,
    min: 540,
    precision: 0,
    thresholds: {
      lcl: 597,
      lsl: 540,
      ucl: 615,
      usl: 660,
    },
    unit: 'sccm',
  },
  pressure: {
    apiKey: 'pressure',
    icon: 'pressure',
    label: '압력',
    max: 55,
    min: 30,
    precision: 2,
    thresholds: {
      lcl: 40,
      lsl: 30,
      ucl: 44,
      usl: 55,
    },
    unit: 'mTorr',
  },
  rfPower: {
    apiKey: 'rf_power',
    icon: 'rfPower',
    label: 'RF 파워',
    max: 3.05,
    min: 2.45,
    precision: 3,
    thresholds: {
      lcl: 2.71,
      lsl: 2.45,
      ucl: 2.87,
      usl: 3.05,
    },
    unit: 'kW',
  },
  temperature: {
    apiKey: 'temperature',
    icon: 'temperature',
    label: '온도',
    max: 61.5,
    min: 58.5,
    precision: 2,
    thresholds: {
      lcl: 59.7,
      lsl: 58.5,
      ucl: 60.3,
      usl: 61.5,
    },
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
    precision: config.precision,
    thresholds: config.thresholds,
    title: `${config.label}(${config.unit})`,
    unit: config.unit,
  }
}

export function createEmptyMetricCharts() {
  return Object.fromEntries(metricIds.map((metricId) => [metricId, createEmptyMetricChart(metricId)]))
}
