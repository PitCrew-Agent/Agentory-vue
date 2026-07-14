<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  items: {
    type: Array,
    required: true,
  },
})

const { t } = useI18n()
</script>

<template>
  <section class="checklist-panel" aria-labelledby="dashboard-checklist-title">
    <div class="checklist-panel__header">
      <h2 id="dashboard-checklist-title">{{ t('factory.checklist') }}</h2>
    </div>

    <ul class="checklist-panel__list">
      <li v-for="item in items" :key="item.id" class="checklist-panel__item">
        <span class="checklist-panel__checkbox" :class="{ 'is-checked': item.checked }"></span>
        <span>{{ item.label }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.checklist-panel {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-14);
  min-width: 0;
  height: 100%;
  padding: var(--agentory-spacing-20) var(--agentory-spacing-16);
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel);
}

.checklist-panel__header {
  display: flex;
  align-items: center;
  min-height: 28px;
  width: 100%;
  padding-bottom: var(--agentory-spacing-10);
  border-bottom: 2px solid var(--agentory-color-bg-primary);
}

.checklist-panel__header h2 {
  color: var(--agentory-color-bg-primary);
  font-family: var(--agentory-font-family-checklist);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body-lg);
}

.checklist-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-10);
  padding-top: var(--agentory-spacing-6);
}

.checklist-panel__item {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-8);
  min-width: 0;
  color: var(--agentory-color-text-primary);
  font-family: var(--agentory-font-family-checklist);
  font-size: 12px;
  font-weight: var(--agentory-font-weight-medium);
  line-height: 18px;
}

.checklist-panel__checkbox {
  width: 13px;
  height: 13px;
  border: 2px solid var(--agentory-color-bg-primary);
  border-radius: 50%;
  flex: 0 0 auto;
}

.checklist-panel__checkbox.is-checked {
  background: var(--agentory-color-bg-primary);
  box-shadow: inset 0 0 0 3px var(--agentory-color-bg-app);
}
</style>
