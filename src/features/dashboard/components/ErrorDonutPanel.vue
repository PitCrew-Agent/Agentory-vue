<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ChartCanvas from '@/features/dashboard/components/ChartCanvas.vue'
import DashboardDataPanel from '@/features/dashboard/components/DashboardDataPanel.vue'
import { fetchEquipmentAlarmSensorSummary } from '@/features/dashboard/services/equipmentInsightApi'
import { readChartToken } from '@/features/dashboard/utils/chartTheme'
import { useUiStore } from '@/stores/uiStore'

const props = defineProps({
  equipmentId: {
    type: String,
    default: '',
  },
  refreshKey: {
    type: Number,
    default: 0,
  },
  startAt: {
    type: String,
    default: '',
  },
})

const { t } = useI18n()

const METRIC_COLOR_TOKENS = {
  gasFlow: ['--agentory-color-chart-series-4', '#d57954'],
  pressure: ['--agentory-color-chart-series-2', '#37a57a'],
  rfPower: ['--agentory-color-chart-series-3', '#7569c9'],
  temperature: ['--agentory-color-bg-primary', '#237ce2'],
}
const METRIC_ORDER = ['temperature', 'pressure', 'rfPower', 'gasFlow']

const uiStore = useUiStore()
const errorMessage = ref('')
const isLoading = ref(false)
const summaryItems = ref([])
const visualRef = ref(null)
const visualSize = ref({ height: 0, width: 0 })
let visualObserver = null
let requestId = 0

const metricGroups = computed(() =>
  summaryItems.value
    .map((item) => ({
      count: item.count,
      id: item.metricId,
      label: t(item.metricLabelKey),
    }))
    .toSorted(
      (first, second) =>
        (METRIC_ORDER.indexOf(first.id) < 0
          ? METRIC_ORDER.length
          : METRIC_ORDER.indexOf(first.id)) -
          (METRIC_ORDER.indexOf(second.id) < 0
            ? METRIC_ORDER.length
            : METRIC_ORDER.indexOf(second.id)) || first.label.localeCompare(second.label),
    ),
)

const sensorAlarmCount = computed(() =>
  metricGroups.value.reduce((total, item) => total + item.count, 0),
)

function getCalloutDimensions(width) {
  const labelWidth = Math.min(78, Math.max(56, width * 0.28))

  return {
    chartPaddingX: labelWidth + 18,
    chartPaddingY: 44,
    labelGap: 8,
    labelHeight: 28,
    labelWidth,
  }
}

function getCalloutDirection(directionX, directionY) {
  if (Math.abs(directionX) >= Math.abs(directionY)) {
    return directionX >= 0 ? 'right' : 'left'
  }

  return directionY >= 0 ? 'bottom' : 'top'
}

const calloutLayout = computed(() => {
  const { height, width } = visualSize.value
  const total = sensorAlarmCount.value

  if (!height || !width || !total) {
    return []
  }

  const { chartPaddingX, chartPaddingY, labelGap, labelHeight, labelWidth } =
    getCalloutDimensions(width)
  const centerX = width / 2
  const centerY = height / 2
  const outerRadius = Math.max(
    20,
    Math.min((width - chartPaddingX * 2) / 2, (height - chartPaddingY * 2) / 2),
  )
  const arcCenterRadius = outerRadius * ((1 + 0.69) / 2)
  let angleCursor = -Math.PI / 2

  return metricGroups.value.map((item, index) => {
    const angleSize = (item.count / total) * Math.PI * 2
    const angle = angleCursor + angleSize / 2
    const directionX = Math.cos(angle)
    const directionY = Math.sin(angle)
    const direction = getCalloutDirection(directionX, directionY)
    const start = {
      x: centerX + directionX * arcCenterRadius,
      y: centerY + directionY * arcCenterRadius,
    }
    const end = {
      x: start.x,
      y: start.y,
    }
    const labelPosition = { left: 0, top: 0 }
    const labelOffset = { x: '0', y: '0' }

    if (direction === 'left') {
      end.x = labelWidth - 4
      labelPosition.left = 0
      labelPosition.top = start.y - labelHeight / 2
      labelOffset.x = '-6px'
    } else if (direction === 'right') {
      end.x = width - labelWidth + 4
      labelPosition.left = width - labelWidth
      labelPosition.top = start.y - labelHeight / 2
      labelOffset.x = '6px'
    } else if (direction === 'top') {
      end.y = labelHeight + labelGap
      labelPosition.left = Math.min(width - labelWidth, Math.max(0, start.x - labelWidth / 2))
      labelPosition.top = end.y - labelGap - labelHeight
      labelOffset.y = '-6px'
    } else {
      end.y = height - labelHeight - labelGap
      labelPosition.left = Math.min(width - labelWidth, Math.max(0, start.x - labelWidth / 2))
      labelPosition.top = end.y + labelGap
      labelOffset.y = '6px'
    }

    angleCursor += angleSize
    const color = getMetricCssColor(item)
    const lineLength = Math.hypot(end.x - start.x, end.y - start.y)

    return {
      ...item,
      color,
      direction,
      end,
      index,
      labelStyle: {
        '--callout-delay': `${500 + index * 90}ms`,
        '--callout-offset-x': labelOffset.x,
        '--callout-offset-y': labelOffset.y,
        '--callout-color': color,
        left: `${labelPosition.left}px`,
        top: `${labelPosition.top}px`,
        width: `${labelWidth}px`,
      },
      lineStyle: {
        '--callout-delay': `${index * 90}ms`,
        '--callout-color': color,
        '--callout-length': `${lineLength}px`,
      },
      points: `${start.x},${start.y} ${end.x},${end.y}`,
      start,
    }
  })
})

function getMetricToken(metric) {
  return METRIC_COLOR_TOKENS[metric?.id] ?? ['--agentory-color-text-subtle', '#afafaf']
}

function getMetricChartColor(metricGroup) {
  const [tokenName, fallback] = getMetricToken(metricGroup)

  return readChartToken(tokenName, fallback)
}

function getMetricCssColor(metricGroup) {
  return `var(${getMetricToken(metricGroup)[0]})`
}

function withOpacity(color, opacity) {
  const shortHex = /^#([\da-f])([\da-f])([\da-f])$/i.exec(color)
  const fullHex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color)

  if (shortHex) {
    const [, red, green, blue] = shortHex
    return `rgba(${parseInt(red + red, 16)}, ${parseInt(green + green, 16)}, ${parseInt(blue + blue, 16)}, ${opacity})`
  }

  if (fullHex) {
    const [, red, green, blue] = fullHex
    return `rgba(${parseInt(red, 16)}, ${parseInt(green, 16)}, ${parseInt(blue, 16)}, ${opacity})`
  }

  return color
}

function createGlassArcBackground(context) {
  const metric = metricGroups.value[context.dataIndex]
  const chartArea = context.chart.chartArea
  const chartContext = context.chart.ctx
  const metricColor = getMetricChartColor(metric)

  if (!chartArea) {
    return withOpacity(metricColor, 0.68)
  }

  const highlightColor = readChartToken('--agentory-color-border-inverse', '#f8f9f6')
  const gradient = chartContext.createLinearGradient(
    chartArea.left,
    chartArea.top,
    chartArea.right,
    chartArea.bottom,
  )

  gradient.addColorStop(0, withOpacity(highlightColor, 0.7))
  gradient.addColorStop(0.22, withOpacity(metricColor, 0.82))
  gradient.addColorStop(0.62, withOpacity(metricColor, 0.5))
  gradient.addColorStop(1, withOpacity(metricColor, 0.76))

  return gradient
}

const donutGlassPlugin = {
  afterDatasetDraw(chart) {
    chart.ctx.restore()
  },
  beforeDatasetDraw(chart) {
    const shadowColor = readChartToken('--agentory-color-text-primary', '#323232')

    chart.ctx.save()
    chart.ctx.shadowBlur = 14
    chart.ctx.shadowColor = withOpacity(shadowColor, 0.16)
    chart.ctx.shadowOffsetY = 4
  },
  id: 'agentoryDoughnutGlass',
}

const chartPlugins = [donutGlassPlugin]

const chartData = computed(() => {
  void uiStore.currentTheme

  return {
    labels: metricGroups.value.map((item) => item.label),
    datasets: [
      {
        backgroundColor: createGlassArcBackground,
        borderColor: withOpacity(
          readChartToken('--agentory-color-border-inverse', '#f8f9f6'),
          0.48,
        ),
        borderWidth: 1.2,
        data: metricGroups.value.map((item) => item.count),
        hoverBorderWidth: 1.2,
        hoverOffset: 0,
        label: t('errorDonut.sensorTotal'),
      },
    ],
  }
})

const chartOptions = computed(() => {
  void uiStore.currentTheme

  const { chartPaddingX, chartPaddingY } = getCalloutDimensions(visualSize.value.width)

  return {
    animation: { duration: 520, easing: 'easeOutCubic' },
    cutout: '69%',
    layout: {
      padding: {
        bottom: chartPaddingY,
        left: chartPaddingX,
        right: chartPaddingX,
        top: chartPaddingY,
      },
    },
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    responsive: true,
  }
})

async function loadSummary() {
  if (!props.equipmentId) {
    requestId += 1
    isLoading.value = false
    summaryItems.value = []
    return
  }

  const currentRequestId = ++requestId

  isLoading.value = true
  errorMessage.value = ''

  try {
    const items = await fetchEquipmentAlarmSensorSummary(props.equipmentId, {
      start: props.startAt,
    })

    if (currentRequestId === requestId) {
      summaryItems.value = items
    }
  } catch {
    if (currentRequestId === requestId) {
      summaryItems.value = []
      errorMessage.value = t('errorDonut.error')
    }
  } finally {
    if (currentRequestId === requestId) {
      isLoading.value = false
    }
  }
}

watch(() => [props.equipmentId, props.refreshKey, props.startAt], loadSummary, { immediate: true })

watch(
  visualRef,
  (element) => {
    visualObserver?.disconnect()
    visualObserver = null

    if (!element || typeof ResizeObserver === 'undefined') {
      visualSize.value = { height: 0, width: 0 }
      return
    }

    const rect = element.getBoundingClientRect()
    visualSize.value = {
      height: rect.height,
      width: rect.width,
    }

    visualObserver = new ResizeObserver(([entry]) => {
      visualSize.value = {
        height: entry.contentRect.height,
        width: entry.contentRect.width,
      }
    })
    visualObserver.observe(element)
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  if (!visualObserver) {
    return
  }

  visualObserver.disconnect()
  visualObserver = null
})
</script>

<template>
  <DashboardDataPanel :title="t('errorDonut.title')" :context="equipmentId">
    <div v-if="summaryItems.length" class="error-donut-panel">
      <div ref="visualRef" class="error-donut-panel__visual">
        <ChartCanvas
          type="doughnut"
          :data="chartData"
          :options="chartOptions"
          :plugins="chartPlugins"
        />
        <div class="error-donut-panel__total" aria-hidden="true">
          <strong>{{ sensorAlarmCount }}</strong>
          <span>{{ t('errorDonut.sensorTotal') }}</span>
        </div>

        <svg
          v-if="calloutLayout.length"
          class="error-donut-panel__callout-lines"
          :viewBox="`0 0 ${visualSize.width} ${visualSize.height}`"
          aria-hidden="true"
        >
          <g v-for="callout in calloutLayout" :key="callout.id" :style="callout.lineStyle">
            <polyline :points="callout.points"></polyline>
            <circle :cx="callout.start.x" :cy="callout.start.y" r="2.5"></circle>
          </g>
        </svg>

        <ul
          v-if="calloutLayout.length"
          :key="equipmentId"
          class="error-donut-panel__callout-labels"
        >
          <li
            v-for="callout in calloutLayout"
            :key="callout.id"
            :class="`error-donut-panel__callout-label--${callout.direction}`"
            :style="callout.labelStyle"
          >
            <strong>{{ callout.label }}</strong>
            <small>{{ t('errorDonut.count', { count: callout.count }) }}</small>
          </li>
        </ul>
      </div>
    </div>

    <p v-else-if="!isLoading || errorMessage" class="error-donut-panel__state">
      {{ errorMessage || t('errorDonut.empty') }}
    </p>
    <div v-else class="error-donut-panel__state" aria-busy="true"></div>
  </DashboardDataPanel>
</template>

<style scoped>
.error-donut-panel {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.error-donut-panel__visual {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 170px;
  height: 100%;
}

.error-donut-panel__visual :deep(.chart-canvas) {
  z-index: 1;
}

.error-donut-panel__total {
  position: absolute;
  inset: 50% auto auto 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: none;
}

.error-donut-panel__total strong {
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-h1);
  font-weight: var(--agentory-font-weight-bold);
  line-height: 1;
}

.error-donut-panel__total span,
.error-donut-panel__state,
.error-donut-panel__callout-labels small {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
}

.error-donut-panel__callout-lines,
.error-donut-panel__callout-labels {
  position: absolute;
  z-index: 2;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  pointer-events: none;
}

.error-donut-panel__callout-lines {
  overflow: visible;
}

.error-donut-panel__callout-lines polyline {
  fill: none;
  stroke: var(--callout-color);
  stroke-dasharray: var(--callout-length);
  stroke-dashoffset: var(--callout-length);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
  vector-effect: non-scaling-stroke;
  animation: error-donut-callout-line 460ms var(--agentory-ease-soft) var(--callout-delay) forwards;
}

.error-donut-panel__callout-lines circle {
  fill: var(--callout-color);
  opacity: 0;
  animation: error-donut-callout-dot 180ms ease-out var(--callout-delay) forwards;
}

.error-donut-panel__callout-labels {
  list-style: none;
}

.error-donut-panel__callout-labels li {
  position: absolute;
  display: flex;
  min-height: 28px;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;
  gap: var(--agentory-spacing-2);
  opacity: 0;
  transform: translate(var(--callout-offset-x, 0), var(--callout-offset-y, 0));
  animation: error-donut-callout-label 320ms var(--agentory-ease-soft) var(--callout-delay) forwards;
}

.error-donut-panel__callout-labels strong {
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-caption);
  white-space: normal;
  word-break: keep-all;
}

.error-donut-panel__callout-label--left {
  align-items: flex-end;
  padding-right: var(--agentory-spacing-12);
  text-align: right;
}

.error-donut-panel__callout-label--right {
  align-items: flex-start;
  padding-left: var(--agentory-spacing-12);
  text-align: left;
}

.error-donut-panel__callout-label--top,
.error-donut-panel__callout-label--bottom {
  align-items: center;
  text-align: center;
}

.error-donut-panel__state {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  margin: 0;
  text-align: center;
}

@container (max-width: 260px) {
  .error-donut-panel__visual {
    min-height: 146px;
  }

  .error-donut-panel__callout-labels strong {
    font-size: var(--agentory-font-size-caption);
  }
}

@keyframes error-donut-callout-line {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes error-donut-callout-dot {
  to {
    opacity: 1;
  }
}

@keyframes error-donut-callout-label {
  to {
    opacity: 1;
    transform: translate(0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .error-donut-panel__callout-lines polyline,
  .error-donut-panel__callout-lines circle,
  .error-donut-panel__callout-labels li {
    opacity: 1;
    transform: none;
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>
