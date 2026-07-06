<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  chart: {
    type: Object,
    required: true,
  },
})

const chartRef = ref(null)
const chartWidth = ref(0)
let measureAnimationFrame = 0
let chartResizeObserver

const svgWidth = 520
const svgHeight = 260
const padding = {
  top: 6,
  right: 6,
  bottom: 22,
  left: 32,
}

const plotWidth = svgWidth - padding.left - padding.right
const plotHeight = svgHeight - padding.top - padding.bottom

const visiblePointCount = computed(() => {
  const maxPointCount = props.chart.points.length
  const responsiveExtraCount = Math.floor(Math.max(chartWidth.value - 240, 0) / 90)

  return Math.min(maxPointCount, Math.max(5, 5 + responsiveExtraCount))
})

const visiblePoints = computed(() => props.chart.points.slice(-visiblePointCount.value))

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

const linePoints = computed(() => chartPoints.value.map((point) => `${point.x},${point.y}`).join(' '))
const areaPoints = computed(() => {
  const firstPoint = chartPoints.value[0]
  const lastPoint = chartPoints.value.at(-1)

  if (!firstPoint || !lastPoint) {
    return ''
  }

  return `${padding.left},${padding.top + plotHeight} ${linePoints.value} ${lastPoint.x},${
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
  window.cancelAnimationFrame(measureAnimationFrame)
})
</script>

<template>
  <div ref="chartRef" class="line-chart">
    <h3 data-test="metric-chart-title">{{ chart.title }}</h3>

    <svg
      class="line-chart__svg"
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      role="img"
      aria-label="온도 추이 차트"
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

      <g class="line-chart__x-labels">
        <text
          v-for="point in chartPoints"
          :key="`${point.time}-${point.x}`"
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
}

.line-chart__line {
  fill: none;
  stroke: var(--agentory-color-bg-primary);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}
</style>
