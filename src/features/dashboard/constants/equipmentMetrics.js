export const metricConfigs = {
  gasFlow: {
    apiKey: 'gas_flow',
    icon: 'gasFlow',
    label: '가스유량',
    labelKey: 'metrics.gasFlow',
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
    labelKey: 'metrics.pressure',
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
    labelKey: 'metrics.rfPower',
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
    labelKey: 'metrics.temperature',
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

const depositionThresholds = {
  gasFlow: {
    lcl: 392.5,
    lsl: 350,
    ucl: 407.5,
    usl: 450,
  },
  pressure: {
    lcl: 28.5,
    lsl: 22,
    ucl: 31.5,
    usl: 40,
  },
  rfPower: {
    lcl: 1.74,
    lsl: 1.55,
    ucl: 1.86,
    usl: 2.05,
  },
  temperature: {
    lcl: 44.7,
    lsl: 43.5,
    ucl: 45.3,
    usl: 46.5,
  },
}

export const metricIds = Object.keys(metricConfigs)

export function getMetricThresholds(metricId, processType = 'Etching') {
  const normalizedProcessType = String(processType ?? '')
    .trim()
    .toLowerCase()

  if (normalizedProcessType === 'deposition' && depositionThresholds[metricId]) {
    return depositionThresholds[metricId]
  }

  return metricConfigs[metricId]?.thresholds ?? {}
}

export function createEmptyMetricChart(metricId = 'temperature') {
  const config = metricConfigs[metricId] ?? metricConfigs.temperature

  return {
    max: config.max,
    metricId,
    min: config.min,
    points: [],
    precision: config.precision,
    thresholds: config.thresholds,
    title: `${config.label}(${config.unit})`,
    unit: config.unit,
  }
}

export function createEmptyMetricCharts() {
  return Object.fromEntries(
    metricIds.map((metricId) => [metricId, createEmptyMetricChart(metricId)]),
  )
}
