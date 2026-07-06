<script setup>
import { ref } from 'vue'

defineProps({
  actionIcon: {
    type: String,
    default: '',
  },
  actionLabel: {
    type: String,
    default: '',
  },
  columns: {
    type: Array,
    required: true,
  },
  columnGap: {
    type: String,
    default: 'var(--agentory-spacing-30)',
  },
  dataTest: {
    type: String,
    default: 'dashboard-table-panel',
  },
  groups: {
    type: Array,
    required: true,
  },
  gridTemplateColumns: {
    type: String,
    required: true,
  },
  rowTestPrefix: {
    type: String,
    default: 'dashboard-table-row',
  },
  tableMinWidth: {
    type: String,
    default: '720px',
  },
  title: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['action'])
const contentRef = ref(null)

function scrollToGroup(groupId) {
  const target = Array.from(contentRef.value?.querySelectorAll('.dashboard-table-panel__group') ?? []).find(
    (element) => element.dataset.groupId === groupId,
  )

  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

defineExpose({
  scrollToGroup,
})
</script>

<template>
  <article
    class="dashboard-table-panel"
    :data-test="dataTest"
    :style="{
      '--dashboard-table-columns': gridTemplateColumns,
      '--dashboard-table-column-gap': columnGap,
      '--dashboard-table-min-width': tableMinWidth,
    }"
  >
    <header class="dashboard-table-panel__header">
      <div class="dashboard-table-panel__title-row">
        <h1 class="dashboard-table-panel__title">{{ title }}</h1>
        <slot name="title-actions"></slot>
      </div>

      <button
        v-if="actionLabel"
        class="dashboard-table-panel__action"
        type="button"
        :data-test="`${dataTest}-action`"
        @click="emit('action')"
      >
        <img v-if="actionIcon" class="dashboard-table-panel__action-icon" :src="actionIcon" alt="" />
        <span>{{ actionLabel }}</span>
      </button>
    </header>

    <div ref="contentRef" class="dashboard-table-panel__content">
      <section
        v-for="group in groups"
        :key="group.id"
        class="dashboard-table-panel__group"
        :aria-labelledby="`${dataTest}-date-${group.id}`"
        :data-group-id="group.id"
      >
        <div class="dashboard-table-panel__date-row">
          <span
            class="dashboard-table-panel__date-line dashboard-table-panel__date-line--short"
            aria-hidden="true"
          ></span>
          <h2 :id="`${dataTest}-date-${group.id}`" class="dashboard-table-panel__date">
            {{ group.date }}
          </h2>
          <span class="dashboard-table-panel__date-line" aria-hidden="true"></span>
        </div>

        <div class="dashboard-table-panel__table" role="table" :aria-label="`${group.date} ${title}`">
          <div class="dashboard-table-panel__table-header" role="row">
            <span v-for="column in columns" :key="column.key" role="columnheader">
              {{ column.label }}
            </span>
          </div>

          <div class="dashboard-table-panel__table-body">
            <div
              v-for="row in group.rows"
              :key="row.id"
              class="dashboard-table-panel__row"
              role="row"
              :data-test="`${rowTestPrefix}-${row.id}`"
            >
              <span
                v-for="column in columns"
                :key="column.key"
                class="dashboard-table-panel__cell"
                :class="column.cellClass"
                role="cell"
              >
                <slot :name="`cell-${column.key}`" :row="row" :column="column">
                  {{ row[column.key] }}
                </slot>
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </article>
</template>

<style scoped>
.dashboard-table-panel {
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: var(--agentory-spacing-20) var(--agentory-spacing-24);
  flex-direction: column;
  gap: var(--agentory-spacing-30);
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-8);
  box-shadow: var(--agentory-shadow-panel-soft);
}

.dashboard-table-panel__header {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--agentory-spacing-20);
  width: 100%;
}

.dashboard-table-panel__title-row {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-10);
  min-width: 0;
}

.dashboard-table-panel__title {
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-title);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-title);
  white-space: nowrap;
}

.dashboard-table-panel__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--agentory-spacing-10);
  min-height: 30px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-14);
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border: 0;
  border-radius: var(--agentory-radius-22);
  box-shadow: var(--agentory-shadow-control-strong);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body);
  white-space: nowrap;
}

.dashboard-table-panel__action-icon {
  width: 19px;
  height: 19px;
  object-fit: contain;
}

.dashboard-table-panel__content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--agentory-spacing-40);
  overflow: auto;
  padding-right: var(--agentory-spacing-5);
  scrollbar-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 48%) transparent;
  scrollbar-width: thin;
}

.dashboard-table-panel__content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.dashboard-table-panel__content::-webkit-scrollbar-track {
  background: transparent;
}

.dashboard-table-panel__content::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 48%);
  border-radius: var(--agentory-radius-pill);
}

.dashboard-table-panel__group {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}

.dashboard-table-panel__date-row {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-10);
  width: 100%;
  padding: var(--agentory-spacing-20) 0;
}

.dashboard-table-panel__date-line {
  height: 2px;
  min-width: 0;
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  flex: 1;
}

.dashboard-table-panel__date-line--short {
  width: 56px;
  flex: 0 0 56px;
}

.dashboard-table-panel__date {
  color: var(--agentory-color-text-primary);
  font-size: 22px;
  font-weight: var(--agentory-font-weight-thin);
  line-height: 1.2;
  white-space: nowrap;
}

.dashboard-table-panel__table {
  width: 100%;
  min-width: var(--dashboard-table-min-width);
  overflow: hidden;
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-16) var(--agentory-radius-16) var(--agentory-radius-5)
    var(--agentory-radius-5);
}

.dashboard-table-panel__table-header,
.dashboard-table-panel__row {
  display: grid;
  grid-template-columns: var(--dashboard-table-columns);
  align-items: center;
  column-gap: var(--dashboard-table-column-gap);
}

.dashboard-table-panel__table-header {
  min-height: 54px;
  padding: var(--agentory-spacing-15) var(--agentory-spacing-30) var(--agentory-spacing-15)
    var(--agentory-spacing-60);
  color: var(--agentory-color-text-inverse);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-bold);
  line-height: 1.1;
}

.dashboard-table-panel__table-body {
  display: flex;
  flex-direction: column;
  padding: 0 var(--agentory-spacing-10) var(--agentory-spacing-10);
}

.dashboard-table-panel__row {
  min-height: 84px;
  padding: var(--agentory-spacing-24) var(--agentory-spacing-20) var(--agentory-spacing-24)
    var(--agentory-spacing-60);
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-app);
  font-size: var(--agentory-font-size-body);
  line-height: 1.1;
}

.dashboard-table-panel__row:nth-child(even) {
  background: var(--agentory-color-bg-surface);
}

.dashboard-table-panel__cell {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-table-panel__cell--light {
  font-weight: var(--agentory-font-weight-light);
}

.dashboard-table-panel__cell--strong {
  font-weight: var(--agentory-font-weight-semi-bold);
}

.dashboard-table-panel__cell--center {
  display: flex;
  justify-content: center;
}

@media (max-width: 1180px) {
  .dashboard-table-panel {
    padding-inline: var(--agentory-spacing-20);
  }

  .dashboard-table-panel__table {
    overflow-x: auto;
  }
}
</style>
