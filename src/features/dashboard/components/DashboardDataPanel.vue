<script setup>
defineProps({
  context: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <section class="dashboard-data-panel">
    <header class="dashboard-data-panel__header">
      <h2>{{ title }}</h2>
      <span v-if="context">{{ context }}</span>
    </header>
    <div v-if="$slots.default" class="dashboard-data-panel__body">
      <slot></slot>
    </div>
  </section>
</template>

<style scoped>
.dashboard-data-panel {
  display: flex;
  min-width: 0;
  height: 100%;
  padding: var(--agentory-spacing-20) var(--agentory-spacing-16) var(--agentory-spacing-12);
  flex-direction: column;
  gap: var(--agentory-spacing-14);
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel);
}

.dashboard-data-panel__header {
  display: flex;
  min-width: 0;
  min-height: 28px;
  align-items: center;
  gap: var(--agentory-spacing-8);
  padding-right: var(--agentory-spacing-40);
  padding-bottom: var(--agentory-spacing-10);
  border-bottom: 2px solid var(--agentory-color-bg-primary);
}

.dashboard-data-panel__header h2 {
  flex: 0 0 auto;
  margin: 0;
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body-lg);
}

.dashboard-data-panel__header span {
  min-width: 0;
  overflow: hidden;
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-data-panel__body {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  container-type: size;
}
</style>
