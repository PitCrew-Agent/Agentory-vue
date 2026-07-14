<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ChartCanvas from '@/features/dashboard/components/ChartCanvas.vue'
import { readChartToken } from '@/features/dashboard/utils/chartTheme'
import { useUiStore } from '@/stores/uiStore'

const props = defineProps({
  chart: {
    type: Object,
    required: true,
  },
})

const uiStore = useUiStore()
const { t } = useI18n()
const chartRef = ref(null)
const chartWidth = ref(0)
const rangeStart = ref(0)
const isFollowingLive = ref(true)
const renderedPoints = ref([])
let chartResizeObserver
let renderedChartIdentity = ''

const visiblePointCount = computed(() => {
  const pointCount = props.chart.points.length
  const responsiveCount = Math.max(12, Math.floor((chartWidth.value || 520) / 34))

  return Math.min(pointCount, responsiveCount)
})

const maxRangeStart = computed(() =>
  Math.max(props.chart.points.length - visiblePointCount.value, 0),
)

function getPointCoordinate(point, index) {
  const timestamp = Date.parse(point.timestamp)

  return Number.isFinite(timestamp) ? timestamp : index
}

const targetVisiblePoints = computed(() =>
  props.chart.points
    .slice(rangeStart.value, rangeStart.value + visiblePointCount.value)
    .map((point, index) => ({
      ...point,
      sourceIndex: getPointCoordinate(point, rangeStart.value + index),
    })),
)

const visiblePoints = computed(() => renderedPoints.value)

const isLive = computed(() => isFollowingLive.value && rangeStart.value === maxRangeStart.value)

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function formatValue(value) {
  const numericValue = Number(value)
  const precision = props.chart.precision ?? 1

  if (!Number.isFinite(numericValue)) {
    return '-'
  }

  return precision === 0 ? `${Math.round(numericValue)}` : numericValue.toFixed(precision)
}

function getPointStyle(point) {
  if (point.statusTone === 'warning') {
    return 'triangle'
  }

  if (point.statusTone === 'danger') {
    return 'rectRot'
  }

  return 'circle'
}

function getPointRadius(point, index, pointCount) {
  if (['warning', 'danger'].includes(point.statusTone)) {
    return 5
  }

  return index === pointCount - 1 ? 4 : 2.5
}

function createThresholdDataset({ color, label, showInLegend, value }) {
  if (!Number.isFinite(value)) {
    return null
  }

  return {
    borderColor: color,
    borderDash: [6, 5],
    borderWidth: 1.2,
    data: visiblePoints.value.map((point) => ({ x: point.sourceIndex, y: value })),
    fill: false,
    kind: 'threshold',
    label,
    order: 2,
    pointRadius: 0,
    showInLegend,
  }
}

const chartData = computed(() => {
  void uiStore.currentTheme

  const primaryColor = readChartToken('--agentory-color-bg-primary', '#237ce2')
  const surfaceColor = readChartToken('--agentory-color-bg-app', '#f8f9f6')
  const warningColor = readChartToken('--agentory-color-status-warning', '#f4c300')
  const dangerColor = readChartToken('--agentory-color-status-danger-text', '#ef4444')
  const points = visiblePoints.value
  const thresholds = props.chart.thresholds ?? {}
  const mainDataset = {
    borderColor: primaryColor,
    borderWidth: 2,
    data: points.map((point) => ({ x: point.sourceIndex, y: point.value })),
    fill: false,
    kind: 'metric',
    label: t('chart.liveValue'),
    order: 1,
    pointBackgroundColor: points.map((point) => {
      if (point.statusTone === 'warning') {
        return warningColor
      }

      if (point.statusTone === 'danger') {
        return dangerColor
      }

      return primaryColor
    }),
    pointBorderColor: points.map(() => surfaceColor),
    pointBorderWidth: points.map((point) =>
      ['warning', 'danger'].includes(point.statusTone) ? 2 : 1,
    ),
    pointHoverRadius: points.map((point, index) => getPointRadius(point, index, points.length) + 2),
    pointRadius: points.map((point, index) => getPointRadius(point, index, points.length)),
    pointStyle: points.map(getPointStyle),
    tension: 0.28,
  }
  const thresholdDatasets = [
    createThresholdDataset({
      color: dangerColor,
      label: t('chart.dangerThreshold'),
      showInLegend: true,
      value: thresholds.usl,
    }),
    createThresholdDataset({
      color: dangerColor,
      label: t('chart.dangerLower'),
      showInLegend: false,
      value: thresholds.lsl,
    }),
    createThresholdDataset({
      color: warningColor,
      label: t('chart.warningThreshold'),
      showInLegend: true,
      value: thresholds.ucl,
    }),
    createThresholdDataset({
      color: warningColor,
      label: t('chart.warningLower'),
      showInLegend: false,
      value: thresholds.lcl,
    }),
  ].filter(Boolean)

  return {
    datasets: [mainDataset, ...thresholdDatasets],
  }
})

const chartOptions = computed(() => {
  void uiStore.currentTheme

  const fontFamily = readChartToken('--agentory-font-family-base', 'sans-serif')
  const gridColor = readChartToken('--agentory-color-chart-grid', 'rgba(125, 125, 125, 0.18)')
  const mutedColor = readChartToken('--agentory-color-text-muted', '#7d7d7d')
  const textColor = readChartToken('--agentory-color-text-primary', '#323232')

  return {
    animations: {
      colors: {
        duration: 0,
      },
      radius: {
        duration: 0,
      },
      x: {
        duration: isFollowingLive.value ? 1400 : 220,
        easing: 'easeInOutCubic',
      },
      y: {
        duration: isFollowingLive.value ? 900 : 180,
        easing: 'easeOutCubic',
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    layout: {
      padding: { bottom: 0, left: 2, right: 6, top: 2 },
    },
    maintainAspectRatio: false,
    plugins: {
      legend: {
        align: 'end',
        labels: {
          boxHeight: 8,
          boxWidth: 8,
          color: mutedColor,
          filter(item, data) {
            return data.datasets[item.datasetIndex]?.showInLegend !== false
          },
          font: { family: fontFamily, size: 11 },
          padding: 12,
          usePointStyle: true,
        },
        position: 'top',
      },
      tooltip: {
        callbacks: {
          afterLabel(context) {
            const point = visiblePoints.value[context.dataIndex]

            if (!point || point.statusTone === 'normal') {
              return ''
            }

            return [t(`status.${point.statusTone}`), point.alarmCode].filter(Boolean).join(' · ')
          },
          label(context) {
            return `${formatValue(context.parsed.y)} ${props.chart.unit ?? ''}`.trim()
          },
          title([context]) {
            return visiblePoints.value[context?.dataIndex]?.time ?? ''
          },
        },
        filter(context) {
          return context.dataset.kind === 'metric'
        },
      },
    },
    responsive: true,
    scales: {
      x: {
        border: { display: false },
        grid: { color: gridColor },
        max: targetVisiblePoints.value.at(-1)?.sourceIndex ?? 1,
        min: targetVisiblePoints.value[0]?.sourceIndex ?? 0,
        type: 'linear',
        ticks: {
          callback(value) {
            return (
              targetVisiblePoints.value.reduce((nearestPoint, point) => {
                if (!nearestPoint) {
                  return point
                }

                return Math.abs(point.sourceIndex - value) <
                  Math.abs(nearestPoint.sourceIndex - value)
                  ? point
                  : nearestPoint
              }, null)?.time ?? ''
            )
          },
          color: mutedColor,
          font: { family: fontFamily, size: 11 },
          maxRotation: 0,
          maxTicksLimit: 7,
          padding: 6,
        },
      },
      y: {
        border: { display: false },
        grid: { color: gridColor },
        max: props.chart.max,
        min: props.chart.min,
        ticks: {
          callback: (value) => formatValue(value),
          color: textColor,
          font: { family: fontFamily, size: 11 },
          maxTicksLimit: 6,
          padding: 6,
        },
      },
    },
  }
})

function measureChartWidth() {
  chartWidth.value = chartRef.value?.getBoundingClientRect().width ?? 0
}

function handleRangeInput(event) {
  rangeStart.value = clamp(Number(event.target.value), 0, maxRangeStart.value)
  isFollowingLive.value = rangeStart.value === maxRangeStart.value
}

function returnToLive() {
  isFollowingLive.value = true
  rangeStart.value = maxRangeStart.value
}

onMounted(() => {
  measureChartWidth()

  if (typeof ResizeObserver === 'undefined' || !chartRef.value) {
    return
  }

  chartResizeObserver = new ResizeObserver(([entry]) => {
    chartWidth.value = entry.contentRect.width
  })
  chartResizeObserver.observe(chartRef.value)
})

onBeforeUnmount(() => {
  chartResizeObserver?.disconnect()
})

watch(
  maxRangeStart,
  (nextMaxRangeStart) => {
    if (isFollowingLive.value) {
      rangeStart.value = nextMaxRangeStart
      return
    }

    rangeStart.value = clamp(rangeStart.value, 0, nextMaxRangeStart)
  },
  { immediate: true },
)

watch(
  targetVisiblePoints,
  (nextPoints) => {
    const chartIdentity = `${props.chart.title}:${props.chart.unit ?? ''}`
    const previousPoints = renderedPoints.value
    const previousLastPoint = previousPoints.at(-1)
    const nextLastPoint = nextPoints.at(-1)
    const isSameChart = renderedChartIdentity === chartIdentity
    const hasLiveTransitionBuffer =
      isFollowingLive.value &&
      isSameChart &&
      previousPoints.length > nextPoints.length &&
      previousLastPoint?.timestamp === nextLastPoint?.timestamp
    const isNewLivePoint =
      isFollowingLive.value &&
      isSameChart &&
      previousPoints.length > 0 &&
      nextPoints.length > 0 &&
      previousLastPoint?.timestamp !== nextLastPoint?.timestamp &&
      nextPoints[0].sourceIndex > (previousPoints[0]?.sourceIndex ?? -1)

    renderedChartIdentity = chartIdentity

    if (hasLiveTransitionBuffer) {
      const bufferedPointMap = new Map(
        [...previousPoints, ...nextPoints].map((point) => [
          point.timestamp || `${point.sourceIndex}`,
          point,
        ]),
      )

      renderedPoints.value = [...bufferedPointMap.values()].toSorted(
        (first, second) => first.sourceIndex - second.sourceIndex,
      )
      return
    }

    if (!isNewLivePoint) {
      renderedPoints.value = nextPoints
      return
    }

    const firstVisibleCoordinate = nextPoints[0]?.sourceIndex ?? 0
    const previousLeadingPoint = previousPoints
      .filter((point) => point.sourceIndex < firstVisibleCoordinate)
      .at(-1)
    const transitionPointMap = new Map(
      [
        previousLeadingPoint,
        ...previousPoints.filter((point) => point.sourceIndex >= firstVisibleCoordinate),
        ...nextPoints,
      ]
        .filter(Boolean)
        .map((point) => [point.timestamp || `${point.sourceIndex}`, point]),
    )

    renderedPoints.value = [...transitionPointMap.values()].toSorted(
      (first, second) => first.sourceIndex - second.sourceIndex,
    )
  },
  { deep: true, immediate: true },
)
</script>

<template>
  <div ref="chartRef" class="line-chart">
    <div class="line-chart__canvas">
      <ChartCanvas type="line" :data="chartData" :options="chartOptions" />
    </div>

    <div v-if="chart.points.length > 1" class="line-chart__footer">
      <label class="line-chart__stream-range">
        <span class="sr-only">{{ t('chart.rangeLabel') }}</span>
        <input
          type="range"
          min="0"
          :max="maxRangeStart"
          :value="rangeStart"
          :disabled="maxRangeStart === 0"
          :aria-valuetext="
            isLive
              ? t('chart.realtime')
              : t('chart.rangeFrom', { time: targetVisiblePoints[0]?.time ?? '' })
          "
          @input="handleRangeInput"
        />
      </label>
      <button
        type="button"
        class="line-chart__live"
        :class="{ 'line-chart__live--active': isLive }"
        @click="returnToLive"
      >
        {{ t('chart.live') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.line-chart {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: var(--agentory-spacing-6);
}

.line-chart__canvas {
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
}

.line-chart__footer {
  display: grid;
  min-height: 26px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--agentory-spacing-10);
}

.line-chart__stream-range {
  display: flex;
  min-width: 0;
  align-items: center;
}

.line-chart__stream-range input {
  width: 100%;
  height: 20px;
  margin: 0;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.line-chart__stream-range input::-webkit-slider-runnable-track {
  height: 4px;
  background: var(--agentory-color-bg-surface);
  border-radius: var(--agentory-radius-pill);
}

.line-chart__stream-range input::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  margin-top: -5px;
  appearance: none;
  background: var(--agentory-color-bg-primary);
  border: 3px solid var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-pill);
  box-shadow: var(--agentory-shadow-control);
}

.line-chart__stream-range input::-moz-range-track {
  height: 4px;
  background: var(--agentory-color-bg-surface);
  border: 0;
  border-radius: var(--agentory-radius-pill);
}

.line-chart__stream-range input::-moz-range-thumb {
  width: 10px;
  height: 10px;
  background: var(--agentory-color-bg-primary);
  border: 3px solid var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-pill);
  box-shadow: var(--agentory-shadow-control);
}

.line-chart__stream-range input:disabled {
  cursor: default;
  opacity: 0.45;
}

.line-chart__stream-range input:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 46%);
  outline-offset: 2px;
}

.line-chart__live {
  height: 26px;
  padding: 0 var(--agentory-spacing-12);
  color: var(--agentory-color-bg-primary);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 56%);
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-bold);
  cursor: pointer;
}

.line-chart__live--active {
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border-color: var(--agentory-color-bg-primary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
