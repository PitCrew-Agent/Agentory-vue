<script setup>
import { useI18n } from 'vue-i18n'

import gasFlowIcon from '@/assets/icons/dashboard/metric-gas-flow.svg'
import pressureIcon from '@/assets/icons/dashboard/metric-pressure.png'
import rfPowerIcon from '@/assets/icons/dashboard/metric-rf-power.svg'
import temperatureIcon from '@/assets/icons/dashboard/metric-temperature.png'
import RollingMetricValue from '@/features/dashboard/components/RollingMetricValue.vue'

defineProps({
  equipment: {
    type: Object,
    required: true,
  },
  selectedMetricId: {
    type: String,
    default: 'gasFlow',
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
          <span
            class="detail-panel__metric-icon"
            :class="`detail-panel__metric-icon--${metric.id}`"
          >
            <img :src="metricIconMap[metric.icon]" alt="" width="24" height="24" />
          </span>
          <div class="detail-panel__metric-copy">
            <span class="detail-panel__metric-label">{{
              t(metric.labelKey ?? `metrics.${metric.id}`)
            }}</span>
            <strong>
              <RollingMetricValue :value="metric.value" />
              <small v-if="metric.unit">{{ metric.unit }}</small>
            </strong>
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
  --detail-fluid-header: clamp(15px, min(3.4cqw, 4.2cqh), 30px);
  --detail-fluid-title: clamp(16px, min(4.2cqw, 6cqh), 40px);
  --detail-fluid-body: clamp(11px, min(3cqw, 3.8cqh), 28px);
  --detail-fluid-value: clamp(16px, min(6cqw, 8.6cqh), 56px);
  --detail-fluid-unit: clamp(10px, min(2.8cqw, 3.6cqh), 26px);
  --detail-fluid-icon-box: clamp(26px, min(7.2cqw, 10cqh), 72px);
  --detail-fluid-icon: clamp(15px, min(4.4cqw, 6cqh), 44px);

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
  font-size: var(--detail-fluid-header);
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
  font-size: var(--detail-fluid-title);
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
  max-width: min(180px, 34cqw);
  min-height: clamp(24px, min(6.4cqw, 7cqh), 56px);
  padding: var(--agentory-spacing-4) var(--agentory-spacing-10);
  overflow: hidden;
  color: var(--agentory-color-status-danger-text);
  background: color-mix(in srgb, var(--agentory-color-status-danger-text), transparent 88%);
  border-radius: var(--agentory-radius-pill);
  font-size: var(--detail-fluid-body);
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
  grid-template-columns: clamp(68px, 17cqw, 160px) minmax(0, 1fr);
  align-items: center;
  gap: var(--agentory-spacing-6);
  min-width: 0;
  color: var(--agentory-color-text-primary);
  font-size: var(--detail-fluid-body);
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
  grid-template-columns: var(--detail-fluid-icon-box) minmax(0, 1fr);
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
  width: var(--detail-fluid-icon-box);
  height: var(--detail-fluid-icon-box);
  background: color-mix(in srgb, var(--agentory-color-bg-app), transparent 10%);
  border-radius: var(--agentory-radius-8);
}

.detail-panel__metric-icon img {
  width: var(--detail-fluid-icon);
  height: var(--detail-fluid-icon);
  object-fit: contain;
  transform-origin: center;
  will-change: transform;
}

.detail-panel__metric--selected .detail-panel__metric-icon--gasFlow img {
  animation: detail-metric-gas-flame 1.1s ease-in-out infinite;
}

.detail-panel__metric--selected .detail-panel__metric-icon--pressure img {
  animation: detail-metric-pressure-gauge 1.6s var(--agentory-ease-soft) infinite;
}

.detail-panel__metric--selected .detail-panel__metric-icon--rfPower img {
  animation: detail-metric-rf-pulse 1.25s linear infinite;
}

.detail-panel__metric--selected .detail-panel__metric-icon--temperature img {
  animation: detail-metric-temperature-rise 1.8s var(--agentory-ease-soft) infinite;
}

.detail-panel__metric-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  justify-content: center;
}

.detail-panel__metric-label {
  overflow: hidden;
  font-size: var(--detail-fluid-body);
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
  font-size: var(--detail-fluid-value);
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
.detail-status-flow-leave-active {
  transition:
    opacity 260ms var(--agentory-ease-soft),
    transform 360ms var(--agentory-ease-elastic);
}

.detail-status-flow-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.detail-status-flow-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@keyframes detail-metric-gas-flame {
  0%,
  100% {
    transform: translateY(1px) rotate(-2deg) scaleX(0.96) scaleY(1);
  }

  28% {
    transform: translateY(-2px) rotate(3deg) scaleX(1.04) scaleY(1.12);
  }

  58% {
    transform: translateY(0) rotate(-3deg) scaleX(0.92) scaleY(1.06);
  }

  78% {
    transform: translateY(-1px) rotate(2deg) scaleX(1.02) scaleY(1.1);
  }
}

@keyframes detail-metric-pressure-gauge {
  0%,
  100% {
    transform: rotate(-7deg) scale(0.98);
  }

  50% {
    transform: rotate(7deg) scale(1.04);
  }
}

@keyframes detail-metric-rf-pulse {
  0%,
  18%,
  24%,
  62%,
  100% {
    filter: drop-shadow(0 0 0 color-mix(in srgb, var(--agentory-color-bg-primary), transparent));
    transform: translateX(0) scale(1);
  }

  20% {
    filter: drop-shadow(
      0 0 4px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 34%)
    );
    transform: translateX(-2px) scale(1.08);
  }

  22% {
    filter: drop-shadow(
      0 0 6px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 22%)
    );
    transform: translateX(2px) scale(1.12);
  }

  58% {
    filter: drop-shadow(
      0 0 4px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 38%)
    );
    transform: translateX(1px) scale(1.06);
  }
}

@keyframes detail-metric-temperature-rise {
  0%,
  100% {
    transform: translateY(2px) scaleY(0.96);
  }

  50% {
    transform: translateY(-3px) scaleY(1.08);
  }
}

.detail-panel__metric small {
  min-width: 0;
  padding-top: var(--agentory-spacing-2);
  overflow: hidden;
  font-size: var(--detail-fluid-unit);
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
  .detail-panel {
    --detail-fluid-title: clamp(15px, min(4cqw, 5cqh), 22px);
    --detail-fluid-body: clamp(10px, min(3.4cqw, 4cqh), 14px);
    --detail-fluid-value: clamp(14px, min(5.6cqw, 8cqh), 28px);
    --detail-fluid-unit: clamp(9px, min(3cqw, 3.6cqh), 13px);
    --detail-fluid-icon-box: clamp(22px, min(7cqw, 9cqh), 36px);
    --detail-fluid-icon: clamp(14px, min(4.4cqw, 5.8cqh), 22px);
  }

  .detail-panel__info-item {
    line-height: 1.25;
  }

  .detail-panel__metric {
    gap: var(--agentory-spacing-4);
    padding: var(--agentory-spacing-4) var(--agentory-spacing-6);
  }

  .detail-panel__metric-label,
  .detail-panel__metric small {
    line-height: 1.25;
  }

  .detail-panel__metric strong {
    gap: var(--agentory-spacing-2);
  }
}

@container (max-height: 330px) {
  .detail-panel {
    --detail-fluid-title: clamp(15px, min(4cqw, 5cqh), 24px);
    --detail-fluid-body: clamp(10px, min(2.9cqw, 3.8cqh), 16px);
    --detail-fluid-value: clamp(14px, min(5.6cqw, 8cqh), 32px);
    --detail-fluid-unit: clamp(9px, min(2.7cqw, 3.5cqh), 15px);
    --detail-fluid-icon-box: clamp(23px, min(6.8cqw, 9cqh), 42px);
    --detail-fluid-icon: clamp(14px, min(4.2cqw, 5.6cqh), 25px);
  }

  .detail-panel__body,
  .detail-panel__info-grid,
  .detail-panel__metric-grid {
    gap: var(--agentory-spacing-4) var(--agentory-spacing-6);
  }

  .detail-panel__metric {
    gap: var(--agentory-spacing-6);
    padding: var(--agentory-spacing-4) var(--agentory-spacing-8);
  }

  .detail-panel__metric-alert {
    top: var(--agentory-spacing-6);
    right: var(--agentory-spacing-6);
    width: 7px;
    height: 7px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .detail-panel__metric-icon img {
    animation: none;
  }
}
</style>
