<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import ChartCanvas from '@/features/dashboard/components/ChartCanvas.vue'
import DashboardDataPanel from '@/features/dashboard/components/DashboardDataPanel.vue'
import { fetchEquipmentAlarmSummary } from '@/features/dashboard/services/equipmentInsightApi'
import { readChartToken } from '@/features/dashboard/utils/chartTheme'
import { useUiStore } from '@/stores/uiStore'

const props = defineProps({
  equipmentId: {
    type: String,
    default: '',
  },
})

const METRIC_COLOR_TOKENS = {
  gasFlow: ['--agentory-color-chart-series-4', '#d57954'],
  pressure: ['--agentory-color-chart-series-2', '#37a57a'],
  rfPower: ['--agentory-color-chart-series-3', '#7569c9'],
  temperature: ['--agentory-color-bg-primary', '#237ce2'],
}

const uiStore = useUiStore()
const errorMessage = ref('')
const isLoading = ref(false)
const summaryItems = ref([])
let refreshTimer = 0
let requestId = 0

const sensorAlarmItems = computed(() =>
  summaryItems.value
    .flatMap((item) =>
      item.metrics.map((metric) => ({
        ...item,
        metricId: metric.id,
        metricLabel: metric.label,
        metricOrder: metric.order,
      })),
    )
    .toSorted(
      (first, second) =>
        first.metricOrder - second.metricOrder || first.alarmCode.localeCompare(second.alarmCode),
    ),
)

const sensorAlarmCount = computed(() =>
  sensorAlarmItems.value.reduce((total, item) => total + item.count, 0),
)

const metricGroups = computed(() => {
  const groupsById = new Map()

  sensorAlarmItems.value.forEach((item) => {
    const currentGroup = groupsById.get(item.metricId)

    if (currentGroup) {
      currentGroup.count += item.count
      currentGroup.items.push(item)
      return
    }

    groupsById.set(item.metricId, {
      count: item.count,
      id: item.metricId,
      items: [item],
      label: item.metricLabel,
      order: item.metricOrder,
    })
  })

  return [...groupsById.values()]
    .map((group) => ({
      ...group,
      items: group.items.toSorted((first, second) =>
        first.alarmCode.localeCompare(second.alarmCode),
      ),
    }))
    .toSorted(
      (first, second) => first.order - second.order || first.label.localeCompare(second.label),
    )
})

const chartItems = computed(() =>
  metricGroups.value.flatMap((group) =>
    group.items.map((item, index) => ({
      ...item,
      groupId: group.id,
      groupLabel: group.label,
      groupOrder: group.order,
      shadeIndex: index,
    })),
  ),
)

function getMetricToken(metric) {
  return METRIC_COLOR_TOKENS[metric.id] ?? ['--agentory-color-text-subtle', '#afafaf']
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

const chartData = computed(() => {
  uiStore.currentTheme

  const surfaceColor = readChartToken('--agentory-color-bg-app', '#f8f9f6')

  return {
    labels: chartItems.value.map((item) => `${item.groupLabel} ${item.alarmCode}`),
    datasets: [
      {
        backgroundColor: chartItems.value.map((item) => {
          const group = metricGroups.value.find((candidate) => candidate.id === item.groupId)
          const opacity = Math.max(0.58, 0.9 - item.shadeIndex * 0.16)

          return withOpacity(getMetricChartColor(group), opacity)
        }),
        borderColor: surfaceColor,
        borderWidth: 2,
        data: chartItems.value.map((item) => item.count),
        hoverOffset: 3,
        label: '알람 코드',
      },
    ],
  }
})

const chartOptions = computed(() => {
  uiStore.currentTheme

  return {
    animation: { duration: 520, easing: 'easeOutCubic' },
    cutout: '44%',
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label(context) {
            const item = chartItems.value[context.dataIndex]

            return `${item.groupLabel} · ${item.alarmCode} · ${item.count}건`
          },
        },
      },
    },
    responsive: true,
  }
})

async function loadSummary() {
  if (!props.equipmentId) {
    summaryItems.value = []
    return
  }

  const currentRequestId = ++requestId

  isLoading.value = true
  errorMessage.value = ''

  try {
    const items = await fetchEquipmentAlarmSummary(props.equipmentId)

    if (currentRequestId === requestId) {
      summaryItems.value = items
    }
  } catch {
    if (currentRequestId === requestId) {
      summaryItems.value = []
      errorMessage.value = '알람 집계를 불러오지 못했습니다.'
    }
  } finally {
    if (currentRequestId === requestId) {
      isLoading.value = false
    }
  }
}

watch(
  () => props.equipmentId,
  () => {
    loadSummary()
    window.clearInterval(refreshTimer)
    refreshTimer = window.setInterval(loadSummary, 15000)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.clearInterval(refreshTimer)
})
</script>

<template>
  <DashboardDataPanel title="에러 발생 도넛 차트" :context="equipmentId">
    <div v-if="summaryItems.length" class="error-donut-panel">
      <div class="error-donut-panel__visual">
        <ChartCanvas type="doughnut" :data="chartData" :options="chartOptions" />
        <div class="error-donut-panel__total" aria-hidden="true">
          <strong>{{ sensorAlarmCount }}</strong>
          <span>센서별 발생</span>
        </div>
      </div>

      <ul class="error-donut-panel__legend">
        <li v-for="group in metricGroups" :key="group.id">
          <div class="error-donut-panel__group">
            <span
              class="error-donut-panel__swatch"
              :style="{ backgroundColor: getMetricCssColor(group) }"
              aria-hidden="true"
            ></span>
            <strong>{{ group.label }}</strong>
            <small>{{ group.count }}건</small>
          </div>
          <div class="error-donut-panel__codes">
            <span v-for="item in group.items" :key="item.alarmCode">
              <b :class="`error-donut-panel__code--${item.statusTone}`">{{ item.alarmCode }}</b>
              <small>{{ item.count }}건</small>
            </span>
          </div>
        </li>
      </ul>
    </div>

    <p v-else class="error-donut-panel__state">
      {{ isLoading ? '알람 집계를 불러오는 중입니다.' : errorMessage || '집계할 알람이 없습니다.' }}
    </p>
  </DashboardDataPanel>
</template>

<style scoped>
.error-donut-panel {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 0;
  grid-template-columns: minmax(120px, 1fr) minmax(96px, 0.86fr);
  align-items: center;
  gap: var(--agentory-spacing-10);
}

.error-donut-panel__visual {
  position: relative;
  min-width: 0;
  min-height: 118px;
  height: 100%;
}

.error-donut-panel__total {
  position: absolute;
  inset: 50% auto auto 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.error-donut-panel__total strong {
  font-size: var(--agentory-font-size-h3);
  font-weight: var(--agentory-font-weight-bold);
}

.error-donut-panel__total span,
.error-donut-panel__legend small,
.error-donut-panel__state {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
}

.error-donut-panel__legend {
  display: flex;
  min-width: 0;
  max-height: 100%;
  margin: 0;
  padding: 0;
  flex-direction: column;
  gap: var(--agentory-spacing-8);
  overflow-y: auto;
  list-style: none;
  scrollbar-color: var(--agentory-color-bg-muted) transparent;
  scrollbar-width: thin;
}

.error-donut-panel__legend li {
  min-width: 0;
}

.error-donut-panel__group {
  display: grid;
  min-width: 0;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--agentory-spacing-6);
}

.error-donut-panel__swatch {
  width: 7px;
  height: 7px;
  border-radius: var(--agentory-radius-pill);
}

.error-donut-panel__group strong {
  overflow: hidden;
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-donut-panel__codes {
  display: flex;
  min-width: 0;
  margin-top: var(--agentory-spacing-4);
  padding-left: calc(8px + var(--agentory-spacing-6));
  flex-wrap: wrap;
  gap: var(--agentory-spacing-2) var(--agentory-spacing-6);
}

.error-donut-panel__codes > span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--agentory-spacing-2);
}

.error-donut-panel__codes b {
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
}

.error-donut-panel__code--danger {
  color: var(--agentory-color-status-danger-text);
}

.error-donut-panel__code--warning {
  color: var(--agentory-color-status-warning);
}

.error-donut-panel__state {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  margin: 0;
  text-align: center;
}

@container (max-width: 300px) {
  .error-donut-panel {
    grid-template-columns: minmax(118px, 1fr) minmax(74px, 0.62fr);
  }

  .error-donut-panel__codes {
    display: none;
  }
}
</style>
