<script setup>
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  ScatterController,
  Tooltip,
} from 'chart.js'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  ScatterController,
  Tooltip,
)

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  options: {
    type: Object,
    default: () => ({}),
  },
  plugins: {
    type: Array,
    default: () => [],
  },
  type: {
    type: String,
    required: true,
  },
})

const canvasRef = ref(null)
let chartInstance = null

function copyChartData(data) {
  return {
    ...data,
    datasets: (data.datasets ?? []).map((dataset) => ({
      ...dataset,
      data: [...(dataset.data ?? [])],
    })),
    labels: [...(data.labels ?? [])],
  }
}

function copyChartOptions(value) {
  if (Array.isArray(value)) {
    return value.map(copyChartOptions)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, copyChartOptions(nestedValue)]),
    )
  }

  return value
}

function syncChartData(data) {
  const nextData = copyChartData(data)
  const currentDatasets = chartInstance.data.datasets

  chartInstance.data.labels = nextData.labels
  nextData.datasets.forEach((nextDataset, index) => {
    const currentDataset = currentDatasets[index]

    if (!currentDataset) {
      currentDatasets.push(nextDataset)
      return
    }

    Object.assign(currentDataset, nextDataset)
  })
  currentDatasets.splice(nextData.datasets.length)
}

function createChart() {
  if (import.meta.env.MODE === 'test' || !canvasRef.value) {
    return
  }

  chartInstance?.destroy()
  chartInstance = new Chart(canvasRef.value, {
    data: copyChartData(props.data),
    options: copyChartOptions(props.options),
    plugins: props.plugins,
    type: props.type,
  })
}

function updateChart() {
  if (import.meta.env.MODE === 'test') {
    return
  }

  if (!chartInstance) {
    createChart()
    return
  }

  syncChartData(props.data)
  chartInstance.options = copyChartOptions(props.options)
  chartInstance.update()
}

onMounted(createChart)

onBeforeUnmount(() => {
  chartInstance?.destroy()
  chartInstance = null
})

watch(() => props.type, createChart)
watch(() => [props.data, props.options], updateChart, { deep: true, flush: 'post' })
</script>

<template>
  <div class="chart-canvas">
    <canvas ref="canvasRef" data-test="chartjs-canvas"></canvas>
  </div>
</template>

<style scoped>
.chart-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.chart-canvas canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
