<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  chart: {
    type: Object,
    required: true,
  },
})

const chartRef = ref(null)
const chartWidth = ref(0)
const dragStartOffset = ref(0)
const dragStartX = ref(0)
const isDraggingChart = ref(false)
const renderedChartPoints = ref([])
const windowOffset = ref(0)
let activePointerId = null
let chartAnimationFrame = 0
let measureAnimationFrame = 0
let chartResizeObserver

const svgWidth = 520
const svgHeight = 260
const padding = {
  top: 6,
  right: 28,
  bottom: 24,
  left: 38,
}

const plotWidth = svgWidth - padding.left - padding.right
const plotHeight = svgHeight - padding.top - padding.bottom

const visiblePointCount = computed(() => {
  const maxPointCount = props.chart.points.length
  const responsiveExtraCount = Math.floor(Math.max(chartWidth.value - 240, 0) / 90)

  return Math.min(maxPointCount, Math.max(5, 5 + responsiveExtraCount))
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
    const x =
      padding.left +
      (visiblePoints.value.length === 1 ? 0 : (plotWidth / (visiblePoints.value.length - 1)) * index)
    const y =
      padding.top +
      plotHeight -
      ((point.value - props.chart.min) / valueRange.value) * plotHeight

    return {
      ...point,
      x,
      y,
    }
  }),
)

const linePoints = computed(() =>
  renderedChartPoints.value.map((point) => `${point.x},${point.y}`).join(' '),
)
const areaPoints = computed(() => {
  const firstPoint = renderedChartPoints.value[0]
  const lastPoint = renderedChartPoints.value.at(-1)

  if (!firstPoint || !lastPoint) {
    return ''
  }

  return `${firstPoint.x},${padding.top + plotHeight} ${linePoints.value} ${lastPoint.x},${
    padding.top + plotHeight
  }`
})

const yAxisLabels = computed(() => {
  const steps = [props.chart.max, props.chart.max - valueRange.value / 2, props.chart.min]

  return steps.map((value) => ({
    label: value.toFixed(1),
    y: padding.top + ((props.chart.max - value) / valueRange.value) * plotHeight,
  }))
})

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
    renderedChartPoints.value.length !== nextPoints.length ||
    isDraggingChart.value ||
    prefersReducedMotion()
  ) {
    setRenderedChartPoints(nextPoints)
    return
  }

  const fromPoints = renderedChartPoints.value.map((point) => ({ ...point }))
  const startedAt = performance.now()
  const duration = 560

  function tick(now) {
    const progress = clamp((now - startedAt) / duration, 0, 1)
    const easedProgress = easeOutCubic(progress)

    renderedChartPoints.value = nextPoints.map((point, index) => {
      const fromPoint = fromPoints[index] ?? point

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

  return Math.max((chartWidth.value || svgWidth) / pointCount, 28)
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

function finishChartDrag(event) {
  if (!isDraggingChart.value) {
    return
  }

  isDraggingChart.value = false
  event.currentTarget.releasePointerCapture?.(activePointerId)
  activePointerId = null
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
      <defs>
        <linearGradient id="temperatureArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--agentory-color-bg-primary)" stop-opacity="0.2" />
          <stop offset="100%" stop-color="var(--agentory-color-bg-primary)" stop-opacity="0" />
        </linearGradient>
      </defs>

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

      <polygon class="line-chart__area" :points="areaPoints" />
      <polyline class="line-chart__line" :points="linePoints" />
      <g class="line-chart__points">
        <circle
          v-for="(point, index) in renderedChartPoints"
          :key="`${point.time}-${index}`"
          class="line-chart__point"
          :class="{ 'line-chart__point--end': index === renderedChartPoints.length - 1 }"
          :cx="point.x"
          :cy="point.y"
          :r="index === renderedChartPoints.length - 1 ? 4.3 : 2.8"
        />
      </g>

      <g class="line-chart__x-labels">
        <text
          v-for="(point, index) in renderedChartPoints"
          :key="`${point.time}-${index}`"
          data-test="metric-chart-x-label"
          :x="point.x"
          :y="svgHeight - 4"
          text-anchor="middle"
        >
          {{ point.time }}
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.line-chart {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-4);
  width: 100%;
  height: 100%;
  min-height: 0;
}

.line-chart h3 {
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: 1.2;
}

.line-chart__svg {
  width: 100%;
  height: 100%;
  min-height: 188px;
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
  font-size: var(--agentory-font-size-chart-label);
  font-weight: var(--agentory-font-weight-medium);
}

.line-chart__area {
  fill: url('#temperatureArea');
  pointer-events: none;
}

.line-chart__line {
  fill: none;
  stroke: var(--agentory-color-bg-primary);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
  pointer-events: none;
}

.line-chart__point {
  fill: var(--agentory-color-bg-app);
  stroke: var(--agentory-color-bg-primary);
  stroke-width: 2;
  pointer-events: none;
}

.line-chart__point--end {
  fill: var(--agentory-color-bg-primary);
  stroke: var(--agentory-color-bg-app);
  stroke-width: 2.4;
}
</style>
