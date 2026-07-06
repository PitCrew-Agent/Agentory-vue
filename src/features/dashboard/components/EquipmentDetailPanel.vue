<script setup>
import gasFlowIcon from '@/assets/icons/dashboard/metric-gas-flow.svg'
import pressureIcon from '@/assets/icons/dashboard/metric-pressure.png'
import rfPowerIcon from '@/assets/icons/dashboard/metric-rf-power.svg'
import dangerStatusIcon from '@/assets/icons/dashboard/status-danger.svg'
import normalStatusIcon from '@/assets/icons/dashboard/status-normal.svg'
import offlineStatusIcon from '@/assets/icons/dashboard/status-offline.svg'
import warningStatusIcon from '@/assets/icons/dashboard/status-warning.svg'
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

const metricIconMap = {
  gasFlow: gasFlowIcon,
  pressure: pressureIcon,
  rfPower: rfPowerIcon,
  temperature: temperatureIcon,
}

const statusIconMap = {
  danger: dangerStatusIcon,
  normal: normalStatusIcon,
  offline: offlineStatusIcon,
  warning: warningStatusIcon,
}

function selectMetric(metricId) {
  emit('update:selectedMetricId', metricId)
}
</script>

<template>
  <section class="detail-panel" aria-labelledby="equipment-detail-title">
    <div class="detail-panel__section-header">
      <h2 id="equipment-detail-title">상세 정보</h2>
    </div>

    <div class="detail-panel__title-row">
      <h3>{{ equipment.name }}</h3>
      <span class="detail-panel__status" :class="`detail-panel__status--${equipment.status.tone}`">
        <img
          class="detail-panel__status-icon"
          :src="statusIconMap[equipment.status.tone]"
          alt=""
          width="17"
          height="17"
        />
        {{ equipment.status.label }}
      </span>
    </div>

    <div class="detail-panel__body">
      <div class="detail-panel__info-grid">
        <div class="detail-panel__info-item">
          <span>설비 유형</span>
          <strong>{{ equipment.type }}</strong>
        </div>
        <div class="detail-panel__info-item">
          <span>책임자</span>
          <strong>{{ equipment.owner }}</strong>
        </div>
        <div class="detail-panel__info-item">
          <span>최근 업데이트</span>
          <strong>{{ equipment.updatedAt.date }} {{ equipment.updatedAt.time }}</strong>
        </div>
        <div class="detail-panel__info-item">
          <span>마지막 점검</span>
          <strong>{{ equipment.inspectedAt }}</strong>
        </div>
      </div>

      <div class="detail-panel__metric-grid">
        <button
          v-for="metric in equipment.metrics"
          :key="metric.id"
          type="button"
          class="detail-panel__metric"
          :class="{ 'detail-panel__metric--active': selectedMetricId === metric.id }"
          :data-test="`metric-${metric.id}`"
          :aria-pressed="selectedMetricId === metric.id"
          @click="selectMetric(metric.id)"
        >
          <img :src="metricIconMap[metric.icon]" alt="" width="24" height="24" />
          <div>
            <span>{{ metric.label }}</span>
            <strong>
              {{ metric.value }}
              <small v-if="metric.unit">{{ metric.unit }}</small>
            </strong>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.detail-panel {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-10);
  min-width: 0;
  height: 100%;
  padding: var(--agentory-spacing-20) var(--agentory-spacing-16);
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel);
  container-type: inline-size;
}

.detail-panel__section-header {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-4);
  width: 100%;
  padding-bottom: 6px;
  border-bottom: 2px solid var(--agentory-color-bg-primary);
}

.detail-panel__section-header h2 {
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-black);
  line-height: var(--agentory-line-height-body-sm);
}

.detail-panel__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--agentory-spacing-16);
}

.detail-panel__title-row h3 {
  min-width: 0;
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-h2);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-h2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-panel__status {
  display: inline-flex;
  align-items: center;
  gap: var(--agentory-spacing-10);
  padding: var(--agentory-spacing-4) var(--agentory-spacing-14);
  color: var(--agentory-color-text-primary);
  background: rgba(50, 50, 50, 0.1);
  border-radius: var(--agentory-radius-22);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body);
  white-space: nowrap;
}

.detail-panel__status-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
  flex: 0 0 auto;
}

.detail-panel__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--agentory-spacing-14);
  min-height: 0;
  padding-right: 4px;
  overflow: auto;
  scrollbar-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 52%) transparent;
  scrollbar-width: thin;
}

.detail-panel__body::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.detail-panel__body::-webkit-scrollbar-track {
  background: transparent;
}

.detail-panel__body::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 58%);
  border-radius: var(--agentory-radius-pill);
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
  font-size: var(--agentory-font-size-body);
  line-height: var(--agentory-line-height-body);
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
  gap: var(--agentory-spacing-10);
  min-height: 164px;
  overflow: hidden;
  border-radius: var(--agentory-radius-8);
}

.detail-panel__metric {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--agentory-spacing-8);
  min-height: 78px;
  padding: var(--agentory-spacing-10);
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-surface);
  border: 0;
  border-radius: var(--agentory-radius-8);
  text-align: left;
  transition:
    color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease;
}

.detail-panel__metric--active {
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary-glass);
  box-shadow: var(--agentory-shadow-panel-strong);
}

.detail-panel__metric:focus-visible {
  outline: 2px solid var(--agentory-color-bg-primary);
  outline-offset: 2px;
}

.detail-panel__metric img {
  width: 19px;
  height: 19px;
  object-fit: contain;
  flex: 0 0 auto;
}

.detail-panel__metric div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.detail-panel__metric span {
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-regular);
  line-height: var(--agentory-line-height-body);
}

.detail-panel__metric strong {
  display: inline-flex;
  align-items: flex-start;
  gap: var(--agentory-spacing-10);
  font-size: 26px;
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: 1.5;
  white-space: nowrap;
}

.detail-panel__metric small {
  padding-top: var(--agentory-spacing-8);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-extra-light);
  line-height: var(--agentory-line-height-body);
}

@container (max-width: 520px) {
  .detail-panel__info-item {
    align-items: flex-start;
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
