<script setup>
import { useI18n } from 'vue-i18n'

import gasFlowIcon from '@/assets/icons/dashboard/metric-gas-flow.svg'
import pressureIcon from '@/assets/icons/dashboard/metric-pressure.png'
import rfPowerIcon from '@/assets/icons/dashboard/metric-rf-power.svg'
import temperatureIcon from '@/assets/icons/dashboard/metric-temperature.png'

defineProps({
  equipment: {
    type: Object,
    required: true,
  },
  selectedMetricId: {
    type: String,
    default: 'temperature',
  },
})

const emit = defineEmits(['update:selectedMetricId'])
const { t } = useI18n()

const metricIconMap = {
  gasFlow: gasFlowIcon,
  pressure: pressureIcon,
  rfPower: rfPowerIcon,
  temperature: temperatureIcon,
}

function selectMetric(metricId) {
  emit('update:selectedMetricId', metricId)
}

function isAlertMetric(metric) {
  return ['warning', 'danger'].includes(metric.statusTone)
}

function getMetricStatusLabel(metric) {
  return t(`status.${metric.statusTone ?? 'normal'}`)
}
</script>

<template>
  <section class="detail-panel" aria-labelledby="equipment-detail-title">
    <div class="detail-panel__section-header">
      <h2 id="equipment-detail-title">{{ t('detail.title') }}</h2>
    </div>

    <div class="detail-panel__title-row">
      <h3>{{ equipment.name }}</h3>
      <Transition name="detail-status-flow" mode="out-in">
        <div
          :key="`${equipment.status.tone}-${equipment.alarmCode}`"
          class="detail-panel__status-row"
        >
          <span
            v-if="
              ['warning', 'danger'].includes(equipment.status.tone) &&
              equipment.alarmCode &&
              equipment.alarmCode !== '-'
            "
            class="detail-panel__alarm-code"
            :class="`detail-panel__alarm-code--${equipment.status.tone}`"
          >
            {{ equipment.alarmCode }}
          </span>
        </div>
      </Transition>
    </div>

    <div class="detail-panel__body">
      <div class="detail-panel__info-grid">
        <div class="detail-panel__info-item">
          <span>{{ t('detail.equipmentType') }}</span>
          <strong>{{ equipment.type }}</strong>
        </div>
        <div class="detail-panel__info-item">
          <span>{{ t('detail.owner') }}</span>
          <strong>{{ equipment.ownerDisplay ?? equipment.owner }}</strong>
        </div>
        <div class="detail-panel__info-item">
          <span>{{ t('detail.updatedAt') }}</span>
          <strong>{{ equipment.updatedAt.date }} {{ equipment.updatedAt.time }}</strong>
        </div>
        <div class="detail-panel__info-item">
          <span>{{ t('detail.lastInspection') }}</span>
          <strong>{{ equipment.inspectedAt }}</strong>
        </div>
      </div>

      <div class="detail-panel__metric-grid">
        <button
          v-for="metric in equipment.metrics"
          :key="metric.id"
          type="button"
          class="detail-panel__metric"
          :class="[
            {
              'detail-panel__metric--selected': selectedMetricId === metric.id,
              'detail-panel__metric--alert': isAlertMetric(metric),
            },
            isAlertMetric(metric) ? `detail-panel__metric--${metric.statusTone}` : '',
          ]"
          :data-test="`metric-${metric.id}`"
          :aria-pressed="selectedMetricId === metric.id"
          @click="selectMetric(metric.id)"
        >
          <span class="detail-panel__metric-icon">
            <img :src="metricIconMap[metric.icon]" alt="" width="24" height="24" />
          </span>
          <div class="detail-panel__metric-copy">
            <span class="detail-panel__metric-label">{{
              t(metric.labelKey ?? `metrics.${metric.id}`)
            }}</span>
            <Transition name="detail-value-flow" mode="out-in">
              <strong :key="`${metric.id}-${metric.value}-${metric.unit}`">
                {{ metric.value }}
                <small v-if="metric.unit">{{ metric.unit }}</small>
              </strong>
            </Transition>
          </div>
          <span
            v-if="isAlertMetric(metric)"
            class="detail-panel__metric-alert"
            :class="`detail-panel__metric-alert--${metric.statusTone}`"
            :aria-label="getMetricStatusLabel(metric)"
            :title="getMetricStatusLabel(metric)"
          >
          </span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.detail-panel {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-14);
  min-width: 0;
  height: 100%;
  padding: var(--agentory-spacing-20) var(--agentory-spacing-16) var(--agentory-spacing-8);
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel);
  container-type: size;
}

.detail-panel__section-header {
  display: flex;
  align-items: center;
  min-height: 28px;
  width: 100%;
  padding-bottom: var(--agentory-spacing-10);
  border-bottom: 2px solid var(--agentory-color-bg-primary);
}

.detail-panel__section-header h2 {
  margin: 0;
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body-lg);
}

.detail-panel__title-row {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--agentory-spacing-8);
}

.detail-panel__title-row h3 {
  min-width: 0;
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  font-size: clamp(var(--agentory-font-size-body-lg), 6cqw, var(--agentory-font-size-h2));
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-h2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-panel__status-row {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  flex: 0 0 auto;
}

.detail-panel__alarm-code {
  display: inline-flex;
  align-items: center;
  max-width: min(112px, 34cqw);
  min-height: 25px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-10);
  overflow: hidden;
  color: var(--agentory-color-status-danger-text);
  background: color-mix(in srgb, var(--agentory-color-status-danger-text), transparent 88%);
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-body-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-panel__alarm-code--warning {
  color: color-mix(
    in srgb,
    var(--agentory-color-status-warning),
    var(--agentory-color-text-primary) 26%
  );
  background: color-mix(in srgb, var(--agentory-color-status-warning), transparent 84%);
}

.detail-panel__alarm-code--danger {
  color: var(--agentory-color-status-danger-text);
  background: color-mix(in srgb, var(--agentory-color-status-danger-text), transparent 88%);
}

.detail-panel__body {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  flex: 1 1 auto;
  gap: var(--agentory-spacing-10);
  min-height: 0;
  overflow: hidden;
}

.detail-panel__info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--agentory-spacing-6) var(--agentory-spacing-10);
  min-width: 0;
}

.detail-panel__info-item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: var(--agentory-spacing-6);
  min-width: 0;
  color: var(--agentory-color-text-primary);
  font-size: clamp(var(--agentory-font-size-caption), 3.8cqw, var(--agentory-font-size-body));
  line-height: 1.35;
}

.detail-panel__info-item span {
  font-weight: var(--agentory-font-weight-semi-bold);
}

.detail-panel__info-item strong {
  min-width: 0;
  overflow: hidden;
  font-weight: var(--agentory-font-weight-light);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-panel__metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: var(--agentory-spacing-8);
  min-height: 0;
  overflow: hidden;
  border-radius: var(--agentory-radius-8);
}

.detail-panel__metric {
  position: relative;
  display: grid;
  grid-template-columns: clamp(26px, 8cqw, 36px) minmax(0, 1fr);
  align-items: center;
  align-content: center;
  gap: var(--agentory-spacing-8);
  min-height: 0;
  padding: var(--agentory-spacing-8) var(--agentory-spacing-10);
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-surface);
  border: 1px solid transparent;
  border-radius: var(--agentory-radius-8);
  text-align: left;
  transition:
    color 180ms ease,
    background 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.detail-panel__metric--alert {
  padding-right: var(--agentory-spacing-20);
}

.detail-panel__metric--selected {
  color: var(--agentory-color-text-primary);
  background: color-mix(
    in srgb,
    var(--agentory-color-bg-primary),
    var(--agentory-color-bg-surface) 94%
  );
  border-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 52%);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 76%),
    0 8px 18px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 88%);
}

.detail-panel__metric--selected.detail-panel__metric--warning,
.detail-panel__metric--selected.detail-panel__metric--danger {
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 78%),
    0 8px 18px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 88%);
}

.detail-panel__metric--selected.detail-panel__metric--warning {
  color: var(--agentory-color-text-primary);
}

.detail-panel__metric--selected.detail-panel__metric--danger {
  color: var(--agentory-color-text-primary);
}

.detail-panel__metric:focus-visible {
  outline: 2px solid var(--agentory-color-bg-primary);
  outline-offset: 2px;
}

.detail-panel__metric-icon {
  display: inline-flex;
  grid-row: 1;
  align-items: center;
  align-self: start;
  justify-content: center;
  width: clamp(26px, 8cqw, 36px);
  height: clamp(26px, 8cqw, 36px);
  background: color-mix(in srgb, var(--agentory-color-bg-app), transparent 10%);
  border-radius: var(--agentory-radius-8);
}

.detail-panel__metric-icon img {
  width: clamp(15px, 4.8cqw, 21px);
  height: clamp(15px, 4.8cqw, 21px);
  object-fit: contain;
}

.detail-panel__metric-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  justify-content: center;
}

.detail-panel__metric-label {
  overflow: hidden;
  font-size: clamp(var(--agentory-font-size-caption), 3.8cqw, var(--agentory-font-size-body));
  font-weight: var(--agentory-font-weight-regular);
  line-height: var(--agentory-line-height-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-panel__metric strong {
  display: inline-flex;
  align-items: flex-start;
  gap: var(--agentory-spacing-6);
  min-width: 0;
  overflow: hidden;
  font-size: clamp(14px, 6.8cqw, 28px);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-panel__metric-alert {
  position: absolute;
  top: var(--agentory-spacing-8);
  right: var(--agentory-spacing-8);
  width: 9px;
  height: 9px;
  border-radius: var(--agentory-radius-pill);
  box-shadow: 0 0 0 3px var(--agentory-color-bg-surface);
}

.detail-panel__metric-alert--warning {
  background: var(--agentory-color-status-warning);
}

.detail-panel__metric-alert--danger {
  background: var(--agentory-color-status-danger-text);
}

.detail-status-flow-enter-active,
.detail-status-flow-leave-active,
.detail-value-flow-enter-active,
.detail-value-flow-leave-active {
  transition:
    opacity 260ms var(--agentory-ease-soft),
    transform 360ms var(--agentory-ease-elastic);
}

.detail-status-flow-enter-from,
.detail-value-flow-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.detail-status-flow-leave-to,
.detail-value-flow-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.detail-panel__metric small {
  min-width: 0;
  padding-top: var(--agentory-spacing-2);
  overflow: hidden;
  font-size: clamp(var(--agentory-font-size-caption), 3.6cqw, var(--agentory-font-size-body));
  font-weight: var(--agentory-font-weight-extra-light);
  line-height: var(--agentory-line-height-body);
  text-overflow: ellipsis;
}

@container (max-width: 520px) {
  .detail-panel__info-item {
    align-items: flex-start;
    grid-template-columns: 1fr;
    gap: 2px;
  }
}

@container (max-width: 320px) {
  .detail-panel__info-item {
    font-size: 10px;
    line-height: 1.25;
  }

  .detail-panel__metric {
    grid-template-columns: 22px minmax(0, 1fr);
    gap: var(--agentory-spacing-4);
    padding: var(--agentory-spacing-4) var(--agentory-spacing-6);
  }

  .detail-panel__metric-icon {
    width: 22px;
    height: 22px;
  }

  .detail-panel__metric-icon img {
    width: 14px;
    height: 14px;
  }

  .detail-panel__metric-label,
  .detail-panel__metric small {
    font-size: 10px;
    line-height: 1.25;
  }

  .detail-panel__metric strong {
    gap: var(--agentory-spacing-2);
    font-size: 14px;
  }
}

@container (max-height: 330px) {
  .detail-panel__title-row h3 {
    font-size: var(--agentory-font-size-body-lg);
    line-height: var(--agentory-line-height-body-lg);
  }

  .detail-panel__body,
  .detail-panel__info-grid,
  .detail-panel__metric-grid {
    gap: var(--agentory-spacing-4) var(--agentory-spacing-6);
  }

  .detail-panel__metric {
    grid-template-columns: 26px minmax(0, 1fr);
    gap: var(--agentory-spacing-6);
    padding: var(--agentory-spacing-4) var(--agentory-spacing-8);
  }

  .detail-panel__metric-icon {
    width: 24px;
    height: 24px;
  }

  .detail-panel__metric-icon img {
    width: 15px;
    height: 15px;
  }

  .detail-panel__metric strong {
    font-size: 18px;
  }

  .detail-panel__metric-alert {
    top: var(--agentory-spacing-6);
    right: var(--agentory-spacing-6);
    width: 7px;
    height: 7px;
  }
}
</style>
