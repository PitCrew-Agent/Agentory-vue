<script setup>
import LineChart from '@/features/dashboard/components/LineChart.vue'

const props = defineProps({
  chart: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <section class="chart-panel" aria-labelledby="equipment-chart-title" data-test="equipment-chart-panel">
    <div class="chart-panel__section-header">
      <div class="chart-panel__title-group">
        <h2 id="equipment-chart-title">그래프</h2>
        <span class="chart-panel__metric-title" data-test="metric-chart-title">{{ props.chart.title }}</span>
      </div>
    </div>

    <div class="chart-panel__body">
      <LineChart :chart="chart" />
    </div>
  </section>
</template>

<style scoped>
.chart-panel {
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
  padding-right: var(--agentory-spacing-40);
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

.chart-panel__body :deep(.line-chart__svg) {
  height: 100%;
}
</style>
