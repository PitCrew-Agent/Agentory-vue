<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import DashboardDataPanel from '@/features/dashboard/components/DashboardDataPanel.vue'
import { metricConfigs, metricIds } from '@/features/dashboard/constants/equipmentMetrics'

const props = defineProps({
  charts: {
    type: Object,
    default: () => ({}),
  },
  equipmentId: {
    type: String,
    default: '',
  },
})

const { t } = useI18n()

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function formatValue(value, precision) {
  if (!Number.isFinite(value)) {
    return '-'
  }

  return precision === 0 ? `${Math.round(value)}` : value.toFixed(precision)
}

function getMetricStatus(value, thresholds) {
  if (!Number.isFinite(value)) {
    return { labelKey: 'analysis.noData', tone: 'normal' }
  }

  if (value <= thresholds.lsl || value >= thresholds.usl) {
    return { labelKey: 'status.danger', tone: 'danger' }
  }

  if (value <= thresholds.lcl || value >= thresholds.ucl) {
    return { labelKey: 'status.warning', tone: 'warning' }
  }

  return { labelKey: 'status.normal', tone: 'normal' }
}

const metricRows = computed(() =>
  metricIds.map((metricId) => {
    const config = metricConfigs[metricId]
    const chart = props.charts?.[metricId] ?? {}
    const thresholds = {
      ...config.thresholds,
      ...chart.thresholds,
    }
    const values = (chart.points ?? [])
      .slice(-12)
      .map((point) => Number(point?.value))
      .filter(Number.isFinite)
    const currentValue = values.at(-1) ?? null
    const range = thresholds.usl - thresholds.lsl
    const displayPadding = range * 0.12
    const displayMin = thresholds.lsl - displayPadding
    const displayMax = thresholds.usl + displayPadding
    const displayRange = displayMax - displayMin
    const position = (value) => clamp(((value - displayMin) / displayRange) * 100, 0, 100)
    const status = getMetricStatus(currentValue, thresholds)
    const recentMin = values.length ? Math.min(...values) : null
    const recentMax = values.length ? Math.max(...values) : null
    const recentStart = Number.isFinite(recentMin) ? position(recentMin) : 0
    const recentEnd = Number.isFinite(recentMax) ? position(recentMax) : 0
    const trend = values.length > 1 ? currentValue - values[0] : 0
    const thresholdPositions = [
      position(thresholds.lsl),
      position(thresholds.lcl),
      position(thresholds.ucl),
      position(thresholds.usl),
    ]

    return {
      currentLabel: formatValue(currentValue, config.precision),
      currentPosition: Number.isFinite(currentValue) ? position(currentValue) : 0,
      displayMaxLabel: formatValue(displayMax, config.precision),
      displayMinLabel: formatValue(displayMin, config.precision),
      id: metricId,
      labelKey: config.labelKey,
      normalRangeLabel: `${formatValue(thresholds.lcl, config.precision)} - ${formatValue(
        thresholds.ucl,
        config.precision,
      )}`,
      recentLeft: recentStart,
      recentWidth: Math.max(recentEnd - recentStart, values.length ? 1.5 : 0),
      segments: [
        { tone: 'danger', width: thresholdPositions[0] },
        { tone: 'warning', width: thresholdPositions[1] - thresholdPositions[0] },
        { tone: 'normal', width: thresholdPositions[2] - thresholdPositions[1] },
        { tone: 'warning', width: thresholdPositions[3] - thresholdPositions[2] },
        { tone: 'danger', width: 100 - thresholdPositions[3] },
      ],
      status,
      trendLabel: `${trend > 0 ? '+' : ''}${formatValue(trend, config.precision)}`,
      unit: config.unit,
    }
  }),
)

const hasAnalysisData = computed(() =>
  metricRows.value.some((metric) => metric.currentLabel !== '-'),
)
</script>

<template>
  <DashboardDataPanel :title="t('analysis.title')" :context="equipmentId">
    <div class="equipment-analysis-panel">
      <div class="equipment-analysis-panel__legend">
        <span
          ><i class="equipment-analysis-panel__legend-range"></i
          >{{ t('analysis.recentRange') }}</span
        >
        <span
          ><i class="equipment-analysis-panel__legend-current"></i>{{ t('analysis.current') }}</span
        >
      </div>

      <div v-if="hasAnalysisData" class="equipment-analysis-panel__metrics">
        <article
          v-for="metric in metricRows"
          :key="metric.id"
          class="equipment-analysis-panel__metric"
        >
          <header>
            <div>
              <strong>{{ t(metric.labelKey) }}</strong>
              <span>{{
                t('analysis.recentChange', { value: metric.trendLabel, unit: metric.unit })
              }}</span>
            </div>
            <div class="equipment-analysis-panel__value">
              <strong>{{ metric.currentLabel }}</strong>
              <span>{{ metric.unit }}</span>
              <small :class="`equipment-analysis-panel__status--${metric.status.tone}`">
                {{ t(metric.status.labelKey) }}
              </small>
            </div>
          </header>

          <div class="equipment-analysis-panel__track-wrap">
            <div class="equipment-analysis-panel__track" aria-hidden="true">
              <span
                v-for="(segment, index) in metric.segments"
                :key="`${metric.id}-${index}`"
                :class="`equipment-analysis-panel__segment--${segment.tone}`"
                :style="{ width: `${segment.width}%` }"
              ></span>
              <i
                class="equipment-analysis-panel__recent-range"
                :style="{ left: `${metric.recentLeft}%`, width: `${metric.recentWidth}%` }"
              ></i>
              <i
                class="equipment-analysis-panel__current-marker"
                :class="`equipment-analysis-panel__current-marker--${metric.status.tone}`"
                :style="{ left: `${metric.currentPosition}%` }"
              ></i>
            </div>
            <div class="equipment-analysis-panel__scale">
              <span>{{ metric.displayMinLabel }}</span>
              <span>{{ t('analysis.normalRange', { range: metric.normalRangeLabel }) }}</span>
              <span>{{ metric.displayMaxLabel }}</span>
            </div>
          </div>
        </article>
      </div>

      <p v-else class="equipment-analysis-panel__state">
        {{ t('analysis.empty') }}
      </p>
    </div>
  </DashboardDataPanel>
</template>

<style scoped>
.equipment-analysis-panel {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--agentory-spacing-8);
}

.equipment-analysis-panel__legend {
  display: flex;
  justify-content: flex-end;
  gap: var(--agentory-spacing-12);
}

.equipment-analysis-panel__legend span {
  display: inline-flex;
  align-items: center;
  gap: var(--agentory-spacing-4);
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
}

.equipment-analysis-panel__legend i {
  display: inline-block;
  flex: 0 0 auto;
}

.equipment-analysis-panel__legend-range {
  width: 14px;
  height: 6px;
  background: var(--agentory-color-bg-primary-glass);
  border-radius: var(--agentory-radius-pill);
}

.equipment-analysis-panel__legend-current {
  width: 3px;
  height: 12px;
  background: var(--agentory-color-text-primary);
  border-radius: var(--agentory-radius-pill);
}

.equipment-analysis-panel__metrics {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: repeat(4, minmax(52px, 1fr));
  gap: var(--agentory-spacing-6);
}

.equipment-analysis-panel__metric {
  display: grid;
  min-width: 0;
  align-content: center;
  gap: var(--agentory-spacing-4);
}

.equipment-analysis-panel__metric header,
.equipment-analysis-panel__metric header > div,
.equipment-analysis-panel__value {
  display: flex;
  align-items: baseline;
}

.equipment-analysis-panel__metric header {
  min-width: 0;
  justify-content: space-between;
  gap: var(--agentory-spacing-8);
}

.equipment-analysis-panel__metric header > div:first-child {
  min-width: 0;
  gap: var(--agentory-spacing-6);
}

.equipment-analysis-panel__metric header strong {
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  white-space: nowrap;
}

.equipment-analysis-panel__metric header span,
.equipment-analysis-panel__value small,
.equipment-analysis-panel__scale {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
}

.equipment-analysis-panel__metric header > div:first-child > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.equipment-analysis-panel__value {
  flex: 0 0 auto;
  gap: var(--agentory-spacing-4);
}

.equipment-analysis-panel__value > strong {
  font-size: var(--agentory-font-size-body);
}

.equipment-analysis-panel__value small {
  margin-left: var(--agentory-spacing-2);
  font-weight: var(--agentory-font-weight-semi-bold);
}

.equipment-analysis-panel__status--normal {
  color: var(--agentory-color-status-normal-text) !important;
}

.equipment-analysis-panel__status--warning {
  color: var(--agentory-color-status-warning) !important;
}

.equipment-analysis-panel__status--danger {
  color: var(--agentory-color-status-danger-text) !important;
}

.equipment-analysis-panel__track-wrap {
  min-width: 0;
}

.equipment-analysis-panel__track {
  position: relative;
  display: flex;
  width: 100%;
  height: 12px;
  overflow: visible;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 34%),
    color-mix(in srgb, var(--agentory-color-bg-app), transparent 68%)
  );
  border-radius: var(--agentory-radius-pill);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--agentory-color-border-inverse), transparent 24%),
    inset 0 -1px 0 color-mix(in srgb, var(--agentory-color-text-primary), transparent 88%),
    0 4px 12px color-mix(in srgb, var(--agentory-color-text-primary), transparent 92%);
  -webkit-backdrop-filter: var(--agentory-blur-glass-strong);
  backdrop-filter: var(--agentory-blur-glass-strong);
  isolation: isolate;
}

.equipment-analysis-panel__track::after {
  position: absolute;
  z-index: 1;
  inset: 1px 2px auto;
  height: 4px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--agentory-color-border-inverse), transparent 42%),
    transparent
  );
  border-radius: var(--agentory-radius-pill);
  content: '';
  opacity: 0.72;
  pointer-events: none;
}

.equipment-analysis-panel__track > span {
  position: relative;
  z-index: 0;
}

.equipment-analysis-panel__track > span:first-child {
  border-radius: var(--agentory-radius-pill) 0 0 var(--agentory-radius-pill);
}

.equipment-analysis-panel__track > span:nth-child(5) {
  border-radius: 0 var(--agentory-radius-pill) var(--agentory-radius-pill) 0;
}

.equipment-analysis-panel__segment--normal {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--agentory-color-status-normal-text), transparent 54%),
    color-mix(in srgb, var(--agentory-color-status-normal-text), transparent 78%)
  );
}

.equipment-analysis-panel__segment--warning {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--agentory-color-status-warning), transparent 46%),
    color-mix(in srgb, var(--agentory-color-status-warning), transparent 72%)
  );
}

.equipment-analysis-panel__segment--danger {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--agentory-color-status-danger-text), transparent 52%),
    color-mix(in srgb, var(--agentory-color-status-danger-text), transparent 76%)
  );
}

.equipment-analysis-panel__recent-range {
  position: absolute;
  z-index: 2;
  top: 3px;
  height: 6px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--agentory-color-border-inverse), transparent 36%),
    var(--agentory-color-bg-primary-glass)
  );
  border-radius: var(--agentory-radius-pill);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--agentory-color-border-inverse), transparent 26%),
    0 2px 8px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 72%);
}

.equipment-analysis-panel__current-marker {
  position: absolute;
  z-index: 3;
  top: -3px;
  width: 3px;
  height: 18px;
  border-radius: var(--agentory-radius-pill);
  transform: translateX(-50%);
  box-shadow: 0 0 0 2px var(--agentory-color-bg-app);
}

.equipment-analysis-panel__current-marker--normal {
  background: var(--agentory-color-status-normal-text);
}

.equipment-analysis-panel__current-marker--warning {
  background: var(--agentory-color-status-warning);
}

.equipment-analysis-panel__current-marker--danger {
  background: var(--agentory-color-status-danger-text);
}

.equipment-analysis-panel__scale {
  display: flex;
  justify-content: space-between;
  padding-top: var(--agentory-spacing-2);
}

.equipment-analysis-panel__scale span:nth-child(2) {
  color: var(--agentory-color-text-subtle);
}

.equipment-analysis-panel__state {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  text-align: center;
}
</style>
