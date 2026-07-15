<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import calendarIcon from '@/assets/icons/dashboard/calendar.svg'
import chevronDownIcon from '@/assets/icons/dashboard/chevron-down.svg'
import ChartDateTimeField from '@/features/dashboard/components/ChartDateTimeField.vue'
import LineChart from '@/features/dashboard/components/LineChart.vue'

const props = defineProps({
  chart: {
    type: Object,
    required: true,
  },
  metrics: {
    type: Array,
    default: () => [],
  },
  range: {
    type: Object,
    default: () => ({ end: '', minutes: 10, mode: 'live', start: '' }),
  },
  selectedMetricId: {
    type: String,
    default: 'gasFlow',
  },
})

const emit = defineEmits(['request-range', 'return-live', 'update:selectedMetricId'])
const { locale, t } = useI18n()
const metricControlRef = ref(null)
const rangeControlRef = ref(null)
const isMetricMenuOpen = ref(false)
const isRangeMenuOpen = ref(false)
const customStart = ref('')
const customEnd = ref('')
const recentRangeOptions = [10, 30, 60]

const metricTitle = computed(() => {
  const label = props.chart.metricId ? t(`metrics.${props.chart.metricId}`) : props.chart.title

  return props.chart.unit ? `${label} (${props.chart.unit})` : label
})
const isLiveRange = computed(() => props.range.mode !== 'custom')
const isCustomRangeValid = computed(() => {
  const start = Date.parse(customStart.value)
  const end = Date.parse(customEnd.value)

  return Number.isFinite(start) && Number.isFinite(end) && start < end
})
const rangeLabel = computed(() => {
  if (isLiveRange.value) {
    return t('chart.recentMinutes', { minutes: props.range.minutes || 10 })
  }

  return `${formatRangeDate(props.range.start)} - ${formatRangeDate(props.range.end)}`
})

function formatRangeDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat(locale.value === 'ko' ? 'ko-KR' : 'en-US', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
  }).format(date)
}

function toIsoDateTime(value) {
  const date = value ? new Date(value) : new Date()

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString()
}

function prepareCustomRange() {
  const end = props.range.mode === 'custom' && props.range.end ? props.range.end : new Date()
  const start =
    props.range.mode === 'custom' && props.range.start
      ? props.range.start
      : new Date(new Date(end).getTime() - 10 * 60 * 1000)

  customStart.value = toIsoDateTime(start)
  customEnd.value = toIsoDateTime(end)
}

function toggleRangeMenu() {
  if (!isRangeMenuOpen.value) {
    prepareCustomRange()
  }

  isRangeMenuOpen.value = !isRangeMenuOpen.value
  isMetricMenuOpen.value = false
}

function toggleMetricMenu() {
  isMetricMenuOpen.value = !isMetricMenuOpen.value
  isRangeMenuOpen.value = false
}

function selectMetric(metricId) {
  emit('update:selectedMetricId', metricId)
  isMetricMenuOpen.value = false
}

function getMetricLabel(metric) {
  const label = t(metric.labelKey ?? `metrics.${metric.id}`)

  return metric.unit ? `${label} (${metric.unit})` : label
}

function applyRecentRange(minutes) {
  emit('request-range', { mode: 'live', minutes })
  isRangeMenuOpen.value = false
}

function applyCustomRange() {
  if (!isCustomRangeValid.value) {
    return
  }

  emit('request-range', {
    end: new Date(customEnd.value).toISOString(),
    mode: 'custom',
    start: new Date(customStart.value).toISOString(),
  })
  isRangeMenuOpen.value = false
}

function handleDocumentPointerDown(event) {
  if (event.target instanceof Element && event.target.closest('.chart-date-time-field__picker')) {
    return
  }

  if (!rangeControlRef.value?.contains(event.target)) {
    isRangeMenuOpen.value = false
  }

  if (!metricControlRef.value?.contains(event.target)) {
    isMetricMenuOpen.value = false
  }
}

onMounted(() => document.addEventListener('pointerdown', handleDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleDocumentPointerDown))
</script>

<template>
  <section
    class="chart-panel"
    aria-labelledby="equipment-chart-title"
    data-test="equipment-chart-panel"
  >
    <div class="chart-panel__section-header">
      <div class="chart-panel__title-group">
        <h2 id="equipment-chart-title">{{ t('chart.title') }}</h2>
        <div ref="metricControlRef" class="chart-panel__metric-control">
          <button
            type="button"
            class="chart-panel__metric-trigger"
            data-test="chart-metric-trigger"
            :aria-expanded="isMetricMenuOpen"
            :aria-label="t('chart.metricControl')"
            @click="toggleMetricMenu"
          >
            <span class="chart-panel__metric-title" data-test="metric-chart-title">{{
              metricTitle
            }}</span>
            <img :src="chevronDownIcon" alt="" width="14" height="14" />
          </button>

          <Transition name="chart-metric-menu">
            <div
              v-if="isMetricMenuOpen"
              class="chart-panel__metric-menu"
              :aria-label="t('chart.metricControl')"
            >
              <button
                v-for="metric in metrics"
                :key="metric.id"
                type="button"
                :class="{
                  'chart-panel__metric-option--active': selectedMetricId === metric.id,
                }"
                :data-test="`chart-metric-option-${metric.id}`"
                @click="selectMetric(metric.id)"
              >
                {{ getMetricLabel(metric) }}
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <div ref="rangeControlRef" class="chart-panel__range-control">
        <button
          class="chart-panel__range-trigger"
          type="button"
          data-test="chart-range-trigger"
          :aria-expanded="isRangeMenuOpen"
          :aria-label="t('chart.rangeControl')"
          @click="toggleRangeMenu"
        >
          <img :src="calendarIcon" alt="" width="16" height="16" />
          <span>{{ rangeLabel }}</span>
        </button>

        <Transition name="chart-range-menu">
          <div
            v-if="isRangeMenuOpen"
            class="chart-panel__range-menu"
            role="dialog"
            :aria-label="t('chart.rangeControl')"
          >
            <div class="chart-panel__recent-options">
              <button
                v-for="minutes in recentRangeOptions"
                :key="minutes"
                type="button"
                :class="{
                  'chart-panel__recent-option--active':
                    isLiveRange && Number(range.minutes) === minutes,
                }"
                @click="applyRecentRange(minutes)"
              >
                {{ t('chart.recentMinutes', { minutes }) }}
              </button>
            </div>

            <div class="chart-panel__custom-range">
              <ChartDateTimeField
                v-model="customStart"
                align="start"
                data-test="chart-range-start"
                :label="t('chart.startAt')"
              />
              <ChartDateTimeField
                v-model="customEnd"
                align="end"
                data-test="chart-range-end"
                :label="t('chart.endAt')"
              />
            </div>

            <button
              class="chart-panel__range-apply"
              type="button"
              :disabled="!isCustomRangeValid"
              @click="applyCustomRange"
            >
              {{ t('chart.applyRange') }}
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <div class="chart-panel__body">
      <LineChart :chart="chart" :is-live-range="isLiveRange" @return-live="emit('return-live')" />
    </div>
  </section>
</template>

<style scoped>
.chart-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-14);
  min-width: 0;
  height: 100%;
  padding: var(--agentory-spacing-20) var(--agentory-spacing-16) var(--agentory-spacing-8);
  overflow: visible;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel);
}

.chart-panel__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
  width: 100%;
  padding-bottom: var(--agentory-spacing-10);
  border-bottom: 2px solid var(--agentory-color-bg-primary);
}

.chart-panel__title-group {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--agentory-spacing-8);
}

.chart-panel__metric-control {
  position: relative;
  min-width: 0;
}

.chart-panel__metric-trigger {
  display: inline-flex;
  min-width: 0;
  max-width: 180px;
  height: 28px;
  padding: 0 var(--agentory-spacing-4);
  align-items: center;
  gap: var(--agentory-spacing-4);
  color: var(--agentory-color-text-muted);
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-6);
  font-family: var(--agentory-font-family-base);
  cursor: pointer;
}

.chart-panel__metric-trigger:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 44%);
  outline-offset: 1px;
}

.chart-panel__metric-trigger img {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  filter: var(--agentory-filter-header-action);
  object-fit: contain;
  transition: transform 160ms var(--agentory-ease-soft);
}

.chart-panel__metric-trigger[aria-expanded='true'] img {
  transform: rotate(180deg);
}

.chart-panel__metric-menu {
  position: absolute;
  z-index: 32;
  top: calc(100% + var(--agentory-spacing-6));
  left: 0;
  display: flex;
  width: max-content;
  min-width: 132px;
  max-width: 220px;
  padding: var(--agentory-spacing-4);
  flex-direction: column;
  gap: var(--agentory-spacing-2);
  color: var(--agentory-color-text-primary);
  background: color-mix(in srgb, var(--agentory-color-bg-app), transparent 4%);
  border: 1px solid var(--agentory-color-table-divider);
  border-radius: var(--agentory-radius-8);
  box-shadow: var(--agentory-shadow-panel-soft);
  backdrop-filter: var(--agentory-blur-glass-strong);
}

.chart-panel__metric-menu button {
  min-height: 30px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-8);
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-5);
  font-family: var(--agentory-font-family-base);
  font-size: var(--agentory-font-size-body-sm);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.chart-panel__metric-menu .chart-panel__metric-option--active {
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
}

.chart-metric-menu-enter-active,
.chart-metric-menu-leave-active {
  transition:
    opacity 140ms var(--agentory-ease-soft),
    transform 180ms var(--agentory-ease-elastic);
}

.chart-metric-menu-enter-from,
.chart-metric-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

.chart-panel__range-control {
  position: relative;
  min-width: 0;
  margin-right: var(--agentory-spacing-40);
  flex: 0 1 auto;
}

.chart-panel__range-trigger {
  display: inline-flex;
  min-width: 0;
  height: 28px;
  padding: 0 var(--agentory-spacing-10);
  align-items: center;
  gap: var(--agentory-spacing-6);
  color: var(--agentory-color-text-muted);
  background: var(--agentory-color-bg-surface);
  border: 0;
  border-radius: var(--agentory-radius-8);
  font-family: var(--agentory-font-family-base);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
  cursor: pointer;
}

.chart-panel__range-trigger img {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  object-fit: contain;
  filter: var(--agentory-filter-header-action);
}

.chart-panel__range-trigger span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-panel__range-menu {
  position: absolute;
  z-index: 30;
  top: calc(100% + var(--agentory-spacing-8));
  right: 0;
  display: flex;
  width: min(350px, calc(100cqw - var(--agentory-spacing-30)));
  padding: var(--agentory-spacing-14);
  flex-direction: column;
  gap: var(--agentory-spacing-12);
  color: var(--agentory-color-text-primary);
  background: color-mix(in srgb, var(--agentory-color-bg-app), transparent 4%);
  border: 1px solid var(--agentory-color-table-divider);
  border-radius: var(--agentory-radius-12);
  box-shadow: var(--agentory-shadow-panel-soft);
  backdrop-filter: var(--agentory-blur-glass-strong);
}

.chart-panel__recent-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--agentory-spacing-4);
  padding: var(--agentory-spacing-4);
  background: var(--agentory-color-bg-surface);
  border-radius: var(--agentory-radius-8);
}

.chart-panel__recent-options button,
.chart-panel__range-apply {
  min-height: 30px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-8);
  color: var(--agentory-color-text-muted);
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-5);
  font-family: var(--agentory-font-family-base);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
  cursor: pointer;
}

.chart-panel__recent-options .chart-panel__recent-option--active {
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
}

.chart-panel__custom-range {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--agentory-spacing-8);
}

.chart-panel__range-apply {
  align-self: flex-end;
  min-width: 76px;
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
}

.chart-panel__range-apply:disabled {
  opacity: 0.42;
  cursor: default;
}

.chart-range-menu-enter-active,
.chart-range-menu-leave-active {
  transition:
    opacity 160ms var(--agentory-ease-soft),
    transform 220ms var(--agentory-ease-elastic);
}

.chart-range-menu-enter-from,
.chart-range-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.chart-panel__section-header h2 {
  flex: 0 0 auto;
  margin: 0;
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body-lg);
}

.chart-panel__metric-title {
  min-width: 0;
  overflow: hidden;
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-panel__body {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  align-items: stretch;
  overflow: hidden;
}

.chart-panel__body :deep(.line-chart) {
  height: 100%;
  min-height: 0;
}

@container (max-width: 360px) {
  .chart-panel__range-trigger span {
    display: none;
  }

  .chart-panel__range-trigger {
    width: 28px;
    padding: 0;
    justify-content: center;
  }

  .chart-panel__range-menu {
    width: min(270px, calc(100cqw - var(--agentory-spacing-20)));
  }

  .chart-panel__custom-range {
    grid-template-columns: 1fr;
  }
}
</style>
