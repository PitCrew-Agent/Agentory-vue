<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  chart: {
    type: Object,
    required: true,
  },
})

const activePointKey = ref('')
const chartRef = ref(null)
const chartWidth = ref(0)
const dragStartOffset = ref(0)
const dragStartX = ref(0)
const isDraggingChart = ref(false)
const isDraggingRange = ref(false)
const renderedChartPoints = ref([])
const windowOffset = ref(0)
let activePointerId = null
let chartAnimationFrame = 0
let measureAnimationFrame = 0
let chartResizeObserver

const svgWidth = 520
const svgHeight = 260
const padding = {
  top: 4,
  right: 94,
  bottom: 18,
  left: 50,
}

const plotWidth = svgWidth - padding.left - padding.right
const plotHeight = svgHeight - padding.top - padding.bottom

const visiblePointCount = computed(() => {
  const maxPointCount = props.chart.points.length
  const responsiveExtraCount = Math.floor(Math.max(chartWidth.value - 280, 0) / 42)

  return Math.min(maxPointCount, Math.max(10, 12 + responsiveExtraCount))
})

const maxWindowOffset = computed(() => Math.max(props.chart.points.length - visiblePointCount.value, 0))

const visibleStartIndex = computed(() =>
  Math.max(props.chart.points.length - visiblePointCount.value - windowOffset.value, 0),
)

const visibleEndIndex = computed(() => visibleStartIndex.value + visiblePointCount.value)

const visiblePoints = computed(() =>
  props.chart.points.slice(visibleStartIndex.value, visibleEndIndex.value),
)

const valueRange = computed(() => Math.max(props.chart.max - props.chart.min, 1))

const chartPoints = computed(() =>
  visiblePoints.value.map((point, index) => {
    const sourceIndex = visibleStartIndex.value + index
    const x =
      padding.left +
      (visiblePoints.value.length === 1 ? 0 : (plotWidth / (visiblePoints.value.length - 1)) * index)
    const y =
      padding.top +
      plotHeight -
      ((point.value - props.chart.min) / valueRange.value) * plotHeight

    return {
      ...point,
      key: point.timestamp ? `${point.timestamp}` : `${point.time}-${sourceIndex}`,
      sourceIndex,
      x,
      y,
    }
  }),
)

const linePoints = computed(() =>
  renderedChartPoints.value.map((point) => `${point.x},${point.y}`).join(' '),
)
const yAxisLabels = computed(() => {
  const steps = [props.chart.max, props.chart.max - valueRange.value / 2, props.chart.min]
  const precision = props.chart.precision ?? 1

  return steps.map((value) => ({
    label: value.toFixed(precision),
    y: padding.top + ((props.chart.max - value) / valueRange.value) * plotHeight,
  }))
})

const thresholdLines = computed(() => {
  const thresholds = props.chart.thresholds ?? {}
  const lineItems = [
    { id: 'usl', label: '위험 상한', tone: 'danger', value: thresholds.usl },
    { id: 'ucl', label: '주의 상한', tone: 'warning', value: thresholds.ucl },
    { id: 'lcl', label: '주의 하한', tone: 'warning', value: thresholds.lcl },
    { id: 'lsl', label: '위험 하한', tone: 'danger', value: thresholds.lsl },
  ]

  return lineItems
    .filter((line) => Number.isFinite(line.value))
    .map((line) => {
      const y = padding.top + ((props.chart.max - line.value) / valueRange.value) * plotHeight

      return {
        ...line,
        labelText: `${line.label} ${formatPointValue(line.value)}`,
        labelY: clamp(y - 5, padding.top + 10, padding.top + plotHeight - 4),
        y,
      }
    })
})

const selectedPoint = computed(() =>
  renderedChartPoints.value.find((point) => point.key === activePointKey.value),
)

const selectedPointTooltip = computed(() => {
  if (!selectedPoint.value) {
    return null
  }

  const tooltipWidth = 150
  const tooltipHeight = selectedPoint.value.statusTone === 'normal' ? 52 : 70

  return {
    ...selectedPoint.value,
    height: tooltipHeight,
    valueLabel: `${formatPointValue(selectedPoint.value.value)}${props.chart.unit ?? ''}`,
    x: clamp(selectedPoint.value.x - tooltipWidth / 2, padding.left, svgWidth - padding.right - tooltipWidth),
    y: Math.max(selectedPoint.value.y - tooltipHeight - 16, padding.top),
    width: tooltipWidth,
  }
})

const renderedXAxisLabels = computed(() => {
  const points = renderedChartPoints.value
  const lastIndex = points.length - 1
  const step = Math.max(1, Math.ceil(points.length / 6))

  return points.filter((_, index) => index === 0 || index === lastIndex || index % step === 0)
})

const rangeWindowStyle = computed(() => {
  const totalPointCount = props.chart.points.length

  if (!totalPointCount || maxWindowOffset.value <= 0) {
    return {
      left: '0%',
      width: '100%',
    }
  }

  const left = (visibleStartIndex.value / totalPointCount) * 100
  const width = (visiblePointCount.value / totalPointCount) * 100

  return {
    left: `${clamp(left, 0, 100)}%`,
    width: `${clamp(width, 10, 100)}%`,
  }
})

const isLiveWindow = computed(() => windowOffset.value === 0)

function measureChartWidth() {
  chartWidth.value = chartRef.value?.getBoundingClientRect().width ?? 0
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3)
}

function setRenderedChartPoints(points) {
  renderedChartPoints.value = points.map((point) => ({ ...point }))
}

function animateRenderedChartPoints(nextPoints) {
  window.cancelAnimationFrame(chartAnimationFrame)

  if (
    !nextPoints.length ||
    !renderedChartPoints.value.length ||
    isDraggingChart.value ||
    prefersReducedMotion()
  ) {
    setRenderedChartPoints(nextPoints)
    return
  }

  const fromPoints = renderedChartPoints.value.map((point) => ({ ...point }))
  const fromPointMap = new Map(fromPoints.map((point) => [point.key, point]))
  const startedAt = performance.now()
  const duration = 560

  function tick(now) {
    const progress = clamp((now - startedAt) / duration, 0, 1)
    const easedProgress = easeOutCubic(progress)

    renderedChartPoints.value = nextPoints.map((point, index) => {
      const matchedPoint = fromPointMap.get(point.key)
      const fromPoint =
        matchedPoint ??
        fromPoints[Math.min(index, fromPoints.length - 1)] ??
        fromPoints.at(-1) ??
        point

      return {
        ...point,
        x: fromPoint.x + (point.x - fromPoint.x) * easedProgress,
        y: fromPoint.y + (point.y - fromPoint.y) * easedProgress,
      }
    })

    if (progress < 1) {
      chartAnimationFrame = window.requestAnimationFrame(tick)
    }
  }

  chartAnimationFrame = window.requestAnimationFrame(tick)
}

function getDragStep() {
  const pointCount = Math.max(visiblePointCount.value - 1, 1)

  return Math.max((chartWidth.value || svgWidth) / pointCount, 18)
}

function handleChartPointerDown(event) {
  if (event.button !== 0 || maxWindowOffset.value <= 0) {
    return
  }

  activePointerId = event.pointerId
  dragStartX.value = event.clientX
  dragStartOffset.value = windowOffset.value
  isDraggingChart.value = true
  event.currentTarget.setPointerCapture?.(event.pointerId)
  event.preventDefault()
}

function handleChartPointerMove(event) {
  if (!isDraggingChart.value) {
    return
  }

  const deltaX = event.clientX - dragStartX.value
  const nextOffset = Math.round(dragStartOffset.value + deltaX / getDragStep())

  windowOffset.value = clamp(nextOffset, 0, maxWindowOffset.value)
}

function updateWindowOffsetFromRangeEvent(event) {
  if (maxWindowOffset.value <= 0) {
    return
  }

  const rect = event.currentTarget.getBoundingClientRect()
  const ratio = rect.width ? clamp((event.clientX - rect.left) / rect.width, 0, 1) : 1
  const targetStartIndex = Math.round(maxWindowOffset.value * ratio)

  windowOffset.value = clamp(maxWindowOffset.value - targetStartIndex, 0, maxWindowOffset.value)
}

function handleRangePointerDown(event) {
  isDraggingRange.value = true
  updateWindowOffsetFromRangeEvent(event)
  event.currentTarget.setPointerCapture?.(event.pointerId)
  event.preventDefault()
}

function handleRangePointerMove(event) {
  if (!isDraggingRange.value) {
    return
  }

  updateWindowOffsetFromRangeEvent(event)
}

function finishRangeDrag(event) {
  if (!isDraggingRange.value) {
    return
  }

  isDraggingRange.value = false
  event.currentTarget.releasePointerCapture?.(event.pointerId)
}

function returnToLive() {
  windowOffset.value = 0
}

function finishChartDrag(event) {
  if (!isDraggingChart.value) {
    return
  }

  isDraggingChart.value = false
  event.currentTarget.releasePointerCapture?.(activePointerId)
  activePointerId = null
}

function formatPointValue(value) {
  const precision = props.chart.precision ?? 1
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return '-'
  }

  return precision === 0 ? `${Math.round(numberValue)}` : numberValue.toFixed(precision)
}

function getPointShapePath(point, index) {
  const radius = index === renderedChartPoints.value.length - 1 ? 5.2 : 4.1

  if (point.statusTone === 'danger') {
    return `M ${point.x} ${point.y - radius} L ${point.x + radius} ${point.y} L ${point.x} ${
      point.y + radius
    } L ${point.x - radius} ${point.y} Z`
  }

  if (point.statusTone === 'warning') {
    return `M ${point.x} ${point.y - radius} L ${point.x + radius} ${point.y + radius} L ${
      point.x - radius
    } ${point.y + radius} Z`
  }

  return ''
}

function selectChartPoint(point) {
  activePointKey.value = activePointKey.value === point.key ? '' : point.key
}

onMounted(() => {
  if (typeof ResizeObserver === 'undefined' || !chartRef.value) {
    measureChartWidth()
    return
  }

  chartResizeObserver = new ResizeObserver(([entry]) => {
    chartWidth.value = entry.contentRect.width
  })
  chartResizeObserver.observe(chartRef.value)
  measureChartWidth()
  measureAnimationFrame = window.requestAnimationFrame(measureChartWidth)
})

onBeforeUnmount(() => {
  chartResizeObserver?.disconnect()
  window.cancelAnimationFrame(chartAnimationFrame)
  window.cancelAnimationFrame(measureAnimationFrame)
})

watch(
  maxWindowOffset,
  (nextMaxOffset) => {
    windowOffset.value = clamp(windowOffset.value, 0, nextMaxOffset)
  },
  { immediate: true },
)

watch(
  chartPoints,
  (nextPoints) => {
    if (activePointKey.value && !nextPoints.some((point) => point.key === activePointKey.value)) {
      activePointKey.value = ''
    }

    animateRenderedChartPoints(nextPoints)
  },
  { immediate: true },
)
</script>

<template>
  <div ref="chartRef" class="line-chart">
    <h3 data-test="metric-chart-title">{{ chart.title }}</h3>

    <svg
      class="line-chart__svg"
      :class="{
        'line-chart__svg--draggable': maxWindowOffset > 0,
        'line-chart__svg--dragging': isDraggingChart,
      }"
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      role="img"
      :aria-label="`${chart.title} 추이 차트`"
      @lostpointercapture="finishChartDrag"
      @pointerdown="handleChartPointerDown"
      @pointermove="handleChartPointerMove"
      @pointerup="finishChartDrag"
    >
      <g class="line-chart__grid">
        <line
          v-for="label in yAxisLabels"
          :key="label.label"
          :x1="padding.left"
          :x2="svgWidth - padding.right"
          :y1="label.y"
          :y2="label.y"
        />
      </g>

      <g class="line-chart__axis-labels">
        <text
          v-for="label in yAxisLabels"
          :key="label.label"
          :x="padding.left - 8"
          :y="label.y + 3"
          text-anchor="end"
        >
          {{ label.label }}
        </text>
      </g>

      <g class="line-chart__thresholds">
        <g
          v-for="line in thresholdLines"
          :key="line.id"
          class="line-chart__threshold"
          :class="`line-chart__threshold--${line.tone}`"
        >
          <line :x1="padding.left" :x2="svgWidth - padding.right" :y1="line.y" :y2="line.y" />
          <text :x="svgWidth - 8" :y="line.labelY" text-anchor="end">
            {{ line.labelText }}
          </text>
        </g>
      </g>

      <polyline class="line-chart__line" :points="linePoints" />
      <g class="line-chart__points">
        <g
          v-for="(point, index) in renderedChartPoints"
          :key="point.key"
          class="line-chart__point-group"
          :class="{
            'line-chart__point-group--active': point.key === activePointKey,
            'line-chart__point-group--end': index === renderedChartPoints.length - 1,
          }"
          role="button"
          tabindex="0"
          @click.stop="selectChartPoint(point)"
          @keydown.enter.prevent="selectChartPoint(point)"
          @keydown.space.prevent="selectChartPoint(point)"
          @pointerdown.stop
        >
          <circle
            v-if="!['warning', 'danger'].includes(point.statusTone)"
            class="line-chart__point"
            :cx="point.x"
            :cy="point.y"
            :r="index === renderedChartPoints.length - 1 ? 4.3 : 2.8"
          />
          <path
            v-else
            class="line-chart__point-alert"
            :class="`line-chart__point-alert--${point.statusTone}`"
            :d="getPointShapePath(point, index)"
          />
          <text
            v-if="point.statusTone === 'danger'"
            class="line-chart__point-alert-mark"
            :x="point.x"
            :y="point.y + 3.8"
            text-anchor="middle"
          >
            !
          </text>
          <circle class="line-chart__point-hit" :cx="point.x" :cy="point.y" r="12" />
        </g>
      </g>

      <g v-if="selectedPointTooltip" class="line-chart__tooltip">
        <path
          class="line-chart__tooltip-tail"
          :d="`M ${selectedPointTooltip.x + selectedPointTooltip.width / 2 - 7} ${
            selectedPointTooltip.y + selectedPointTooltip.height
          } L ${selectedPointTooltip.x + selectedPointTooltip.width / 2} ${
            selectedPointTooltip.y + selectedPointTooltip.height + 8
          } L ${selectedPointTooltip.x + selectedPointTooltip.width / 2 + 7} ${
            selectedPointTooltip.y + selectedPointTooltip.height
          } Z`"
        />
        <rect
          class="line-chart__tooltip-box"
          :x="selectedPointTooltip.x"
          :y="selectedPointTooltip.y"
          :width="selectedPointTooltip.width"
          :height="selectedPointTooltip.height"
          rx="10"
        />
        <text
          class="line-chart__tooltip-time"
          :x="selectedPointTooltip.x + 12"
          :y="selectedPointTooltip.y + 21"
        >
          {{ selectedPointTooltip.time }}
        </text>
        <text
          class="line-chart__tooltip-value"
          :x="selectedPointTooltip.x + 12"
          :y="selectedPointTooltip.y + 42"
        >
          {{ selectedPointTooltip.valueLabel }}
        </text>
        <text
          v-if="selectedPointTooltip.statusTone !== 'normal'"
          class="line-chart__tooltip-status"
          :class="`line-chart__tooltip-status--${selectedPointTooltip.statusTone}`"
          :x="selectedPointTooltip.x + 12"
          :y="selectedPointTooltip.y + 62"
        >
          {{ selectedPointTooltip.statusLabel || '상태 변동' }}
        </text>
      </g>

      <g class="line-chart__x-labels">
        <text
          v-for="point in renderedXAxisLabels"
          :key="`${point.key}-label`"
          data-test="metric-chart-x-label"
          :x="point.x"
          :y="svgHeight - 4"
          text-anchor="middle"
        >
          {{ point.time }}
        </text>
      </g>
    </svg>

    <div v-if="maxWindowOffset > 0" class="line-chart__controls">
      <div
        class="line-chart__range"
        :class="{ 'line-chart__range--dragging': isDraggingRange }"
        aria-label="그래프 조회 위치"
        role="slider"
        :aria-valuemin="0"
        :aria-valuemax="maxWindowOffset"
        :aria-valuenow="maxWindowOffset - windowOffset"
        tabindex="0"
        @keydown.end.prevent="returnToLive"
        @keydown.home.prevent="windowOffset = maxWindowOffset"
        @keydown.left.prevent="windowOffset = clamp(windowOffset + 1, 0, maxWindowOffset)"
        @keydown.right.prevent="windowOffset = clamp(windowOffset - 1, 0, maxWindowOffset)"
        @lostpointercapture="finishRangeDrag"
        @pointerdown="handleRangePointerDown"
        @pointermove="handleRangePointerMove"
        @pointerup="finishRangeDrag"
      >
        <span class="line-chart__range-thumb" :style="rangeWindowStyle"></span>
      </div>
      <button
        type="button"
        class="line-chart__live-button"
        :class="{ 'line-chart__live-button--active': isLiveWindow }"
        :disabled="isLiveWindow"
        @click="returnToLive"
      >
        LIVE
      </button>
    </div>
  </div>
</template>

<style scoped>
.line-chart {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-2);
  width: 100%;
  height: 100%;
  min-height: 0;
}

.line-chart h3 {
  display: flex;
  align-items: center;
  min-height: 24px;
  margin: 0;
  padding: 0 var(--agentory-spacing-4);
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body-lg);
}

.line-chart__svg {
  width: 100%;
  height: 100%;
  min-height: 210px;
  flex: 1 1 auto;
  overflow: visible;
  touch-action: none;
  user-select: none;
}

.line-chart__svg--draggable {
  cursor: grab;
}

.line-chart__svg--dragging {
  cursor: grabbing;
}

.line-chart__grid line {
  stroke: color-mix(in srgb, var(--agentory-color-text-subtle), transparent 75%);
  stroke-width: 1;
}

.line-chart__axis-labels,
.line-chart__x-labels {
  fill: var(--agentory-color-text-muted);
  font-family: var(--agentory-font-family-chart);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
}

.line-chart__threshold {
  pointer-events: none;
}

.line-chart__threshold line {
  stroke-dasharray: 7 6;
  stroke-linecap: round;
  stroke-width: 1.6;
}

.line-chart__threshold text {
  paint-order: stroke;
  font-family: var(--agentory-font-family-chart);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-bold);
  stroke: color-mix(in srgb, var(--agentory-color-bg-app), transparent 4%);
  stroke-width: 3.6;
}

.line-chart__threshold--warning line {
  stroke: color-mix(in srgb, var(--agentory-color-status-warning), transparent 8%);
}

.line-chart__threshold--warning text {
  fill: color-mix(in srgb, var(--agentory-color-status-warning), var(--agentory-color-text-primary) 20%);
}

.line-chart__threshold--danger line {
  stroke: color-mix(in srgb, var(--agentory-color-status-danger-text), transparent 6%);
}

.line-chart__threshold--danger text {
  fill: var(--agentory-color-status-danger-text);
}

.line-chart__line {
  fill: none;
  stroke: var(--agentory-color-bg-primary);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.6;
  pointer-events: none;
}

.line-chart__point-group {
  cursor: pointer;
  outline: none;
}

.line-chart__point {
  fill: var(--agentory-color-bg-app);
  stroke: var(--agentory-color-bg-primary);
  stroke-width: 2;
  transition:
    fill 180ms ease,
    stroke-width 180ms ease,
    transform 180ms ease;
  pointer-events: none;
}

.line-chart__point-group--end .line-chart__point {
  fill: var(--agentory-color-bg-primary);
  stroke: var(--agentory-color-bg-app);
  stroke-width: 2.4;
}

.line-chart__point-group--active .line-chart__point {
  stroke-width: 3;
}

.line-chart__point-alert {
  stroke: var(--agentory-color-bg-app);
  stroke-linejoin: round;
  stroke-width: 2.2;
  pointer-events: none;
}

.line-chart__point-alert--warning {
  fill: var(--agentory-color-status-warning);
}

.line-chart__point-alert--danger {
  fill: var(--agentory-color-status-danger);
}

.line-chart__point-alert-mark {
  fill: var(--agentory-color-text-inverse);
  font-size: 9px;
  font-weight: var(--agentory-font-weight-black);
  line-height: 1;
  pointer-events: none;
}

.line-chart__point-group--active .line-chart__point-alert {
  stroke-width: 3;
}

.line-chart__point-hit {
  fill: transparent;
  stroke: transparent;
}

.line-chart__tooltip {
  pointer-events: none;
}

.line-chart__tooltip-box,
.line-chart__tooltip-tail {
  fill: color-mix(in srgb, var(--agentory-color-text-primary), transparent 8%);
  filter: drop-shadow(0 6px 14px color-mix(in srgb, var(--agentory-color-text-primary), transparent 82%));
}

.line-chart__tooltip-time {
  fill: color-mix(in srgb, var(--agentory-color-text-inverse), transparent 22%);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
}

.line-chart__tooltip-value {
  fill: var(--agentory-color-text-inverse);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-bold);
}

.line-chart__tooltip-status {
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-bold);
}

.line-chart__tooltip-status--warning {
  fill: var(--agentory-color-status-warning);
}

.line-chart__tooltip-status--danger {
  fill: var(--agentory-color-status-danger);
}

.line-chart__controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--agentory-spacing-8);
  min-height: 26px;
  padding: 0 var(--agentory-spacing-4);
}

.line-chart__range {
  position: relative;
  height: 5px;
  overflow: hidden;
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 88%);
  border-radius: var(--agentory-radius-pill);
  cursor: pointer;
  outline: none;
}

.line-chart__range:focus-visible {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 74%);
}

.line-chart__range--dragging {
  cursor: grabbing;
}

.line-chart__range-thumb {
  position: absolute;
  top: 0;
  bottom: 0;
  display: block;
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 28%);
  border-radius: inherit;
  transition:
    left 220ms var(--agentory-ease-soft),
    width 220ms var(--agentory-ease-soft);
}

.line-chart__live-button {
  min-width: 48px;
  min-height: 24px;
  padding: 0 var(--agentory-spacing-8);
  color: var(--agentory-color-bg-primary);
  background: var(--agentory-color-bg-app);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 58%);
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-caption);
  transition:
    background-color 180ms var(--agentory-ease-soft),
    border-color 180ms var(--agentory-ease-soft),
    color 180ms var(--agentory-ease-soft),
    opacity 180ms var(--agentory-ease-soft);
}

.line-chart__live-button:not(:disabled):hover {
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border-color: var(--agentory-color-bg-primary);
}

.line-chart__live-button--active,
.line-chart__live-button:disabled {
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border-color: var(--agentory-color-bg-primary);
  cursor: default;
  opacity: 0.72;
}
</style>
