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

      <div v-if="$slots['header-actions'] || actionLabel" class="dashboard-table-panel__actions">
        <slot name="header-actions"></slot>
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
      </div>
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
            <span
              v-for="column in columns"
              :key="column.key"
              :class="column.headerClass"
              role="columnheader"
            >
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

    <slot name="footer"></slot>
  </article>
</template>

<style scoped>
.dashboard-table-panel {
  --dashboard-table-body-inset: 0px;
  --dashboard-table-content-left: var(--agentory-spacing-20);
  --dashboard-table-content-right: var(--agentory-spacing-20);

  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: var(--agentory-spacing-20);
  flex-direction: column;
  gap: var(--agentory-spacing-20);
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-8);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-muted), transparent 52%);
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
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-h2);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-h2);
  white-space: nowrap;
}

.dashboard-table-panel__actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--agentory-spacing-8);
  margin-left: auto;
}

.dashboard-table-panel__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--agentory-spacing-10);
  min-height: 30px;
  padding: var(--agentory-spacing-5) var(--agentory-spacing-14);
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border: 0;
  border-radius: var(--agentory-radius-8);
  box-shadow: var(--agentory-shadow-control-strong);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body);
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 160ms var(--agentory-ease-soft),
    transform 180ms var(--agentory-ease-soft),
    box-shadow 180ms var(--agentory-ease-soft);
}

.dashboard-table-panel__action:hover {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), var(--agentory-color-text-primary) 14%);
  transform: translateY(-1px);
}

.dashboard-table-panel__action:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 34%);
  outline-offset: 2px;
}

.dashboard-table-panel__action-icon {
  width: 19px;
  height: 19px;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.88;
}

.dashboard-table-panel__content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--agentory-spacing-24);
  overflow: auto;
  padding-right: var(--agentory-spacing-4);
  scrollbar-color: color-mix(in srgb, var(--agentory-color-text-muted), transparent 62%) transparent;
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
  background: color-mix(in srgb, var(--agentory-color-text-muted), transparent 62%);
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
  gap: var(--agentory-spacing-8);
  width: 100%;
  padding: var(--agentory-spacing-4) 0 var(--agentory-spacing-10);
}

.dashboard-table-panel__date-line {
  height: 1px;
  min-width: 0;
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 24%);
  border-radius: var(--agentory-radius-pill);
  flex: 1;
}

.dashboard-table-panel__date-line--short {
  display: none;
}

.dashboard-table-panel__date {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body);
  white-space: nowrap;
}

.dashboard-table-panel__table {
  width: 100%;
  min-width: var(--dashboard-table-min-width);
  overflow: hidden;
  background: color-mix(in srgb, var(--agentory-color-bg-app), var(--agentory-color-border-inverse) 72%);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-muted), transparent 36%);
  border-radius: var(--agentory-radius-8);
}

.dashboard-table-panel__table-header,
.dashboard-table-panel__row {
  display: grid;
  grid-template-columns: var(--dashboard-table-columns);
  align-items: center;
  column-gap: var(--dashboard-table-column-gap);
}

.dashboard-table-panel__table-header {
  min-height: 42px;
  padding: var(--agentory-spacing-10)
    calc(var(--dashboard-table-content-right) + var(--dashboard-table-body-inset))
    var(--agentory-spacing-10)
    calc(var(--dashboard-table-content-left) + var(--dashboard-table-body-inset));
  color: var(--agentory-color-text-muted);
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 78%);
  border-bottom: 1px solid color-mix(in srgb, var(--agentory-color-bg-muted), transparent 36%);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body-sm);
}

.dashboard-table-panel__header-cell--center {
  width: 100%;
  justify-self: center;
  text-align: center;
}

.dashboard-table-panel__table-body {
  display: flex;
  flex-direction: column;
  padding: 0;
}

.dashboard-table-panel__row {
  min-height: 58px;
  padding: var(--agentory-spacing-14) var(--dashboard-table-content-right)
    var(--agentory-spacing-14) var(--dashboard-table-content-left);
  color: var(--agentory-color-text-primary);
  background: transparent;
  border-bottom: 1px solid color-mix(in srgb, var(--agentory-color-bg-muted), transparent 42%);
  font-size: var(--agentory-font-size-body);
  line-height: var(--agentory-line-height-body);
  transition: background-color 160ms var(--agentory-ease-soft);
}

.dashboard-table-panel__row:last-child {
  border-bottom: 0;
}

.dashboard-table-panel__row:hover {
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 86%);
}

.dashboard-table-panel__cell {
  min-width: 0;
  overflow: hidden;
  line-height: var(--agentory-line-height-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-table-panel__cell--light {
  font-weight: var(--agentory-font-weight-light);
}

.dashboard-table-panel__cell--strong {
  font-weight: var(--agentory-font-weight-semi-bold);
}

.dashboard-table-panel__cell--fit {
  min-width: max-content;
  overflow: visible;
  text-overflow: clip;
}

.dashboard-table-panel__cell--fill {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
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
