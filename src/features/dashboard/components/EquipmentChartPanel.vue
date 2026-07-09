<script setup>
import LineChart from '@/features/dashboard/components/LineChart.vue'

defineProps({
  chart: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <section class="chart-panel" aria-labelledby="equipment-chart-title" data-test="equipment-chart-panel">
    <div class="chart-panel__section-header">
      <h2 id="equipment-chart-title">그래프</h2>
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
  gap: var(--agentory-spacing-8);
  min-width: 0;
  height: 100%;
  padding: var(--agentory-spacing-16) var(--agentory-spacing-10) var(--agentory-spacing-8);
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel);
}

.chart-panel__section-header {
  display: flex;
  align-items: center;
  min-height: 26px;
  width: 100%;
  padding-bottom: var(--agentory-spacing-8);
  border-bottom: 2px solid var(--agentory-color-bg-primary);
}

.chart-panel__section-header h2 {
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body-lg);
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
