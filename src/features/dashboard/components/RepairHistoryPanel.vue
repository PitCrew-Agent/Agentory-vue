<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import DashboardDataPanel from '@/features/dashboard/components/DashboardDataPanel.vue'
import { fetchEquipmentRepairHistory } from '@/features/dashboard/services/equipmentInsightApi'

const props = defineProps({
  equipmentId: {
    type: String,
    default: '',
  },
  refreshKey: {
    type: Number,
    default: 0,
  },
})

const { locale, t } = useI18n()
const errorMessage = ref('')
const hasMore = ref(false)
const historyItems = ref([])
const isLoading = ref(false)
const nextCursor = ref(null)
let requestId = 0

const displayHistoryItems = computed(() =>
  historyItems.value.map((item) => ({
    ...item,
    displayTime: formatRepairTime(item.repairedAt),
  })),
)

function formatRepairTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value || '-'
  }

  const dateLocale = locale.value === 'en' ? 'en-US' : 'ko-KR'

  return new Intl.DateTimeFormat(dateLocale, {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

async function loadHistory({ append = false } = {}) {
  if (!props.equipmentId || isLoading.value) {
    if (!props.equipmentId) {
      historyItems.value = []
    }
    return
  }

  const currentRequestId = ++requestId

  isLoading.value = true
  errorMessage.value = ''

  try {
    const page = await fetchEquipmentRepairHistory(props.equipmentId, {
      before: append ? nextCursor.value : null,
      limit: 10,
    })

    if (currentRequestId !== requestId) {
      return
    }

    historyItems.value = append ? [...historyItems.value, ...page.items] : page.items
    hasMore.value = page.hasMore
    nextCursor.value = page.nextCursor
  } catch {
    if (currentRequestId === requestId) {
      if (!append) {
        historyItems.value = []
      }
      errorMessage.value = t('repairHistory.error')
    }
  } finally {
    if (currentRequestId === requestId) {
      isLoading.value = false
    }
  }
}

watch(
  () => [props.equipmentId, props.refreshKey],
  () => loadHistory(),
  { immediate: true },
)
</script>

<template>
  <DashboardDataPanel :title="t('repairHistory.title')" :context="equipmentId">
    <div v-if="historyItems.length" class="repair-history-panel">
      <ol class="repair-history-panel__ledger">
        <li v-for="item in displayHistoryItems" :key="item.id">
          <span class="repair-history-panel__rail" aria-hidden="true"><i></i></span>

          <article>
            <header>
              <time :datetime="item.repairedAt">{{ item.displayTime }}</time>
              <span v-if="item.alarmCode" class="repair-history-panel__code">
                {{ item.alarmCode }}
              </span>
            </header>
            <strong class="repair-history-panel__summary">
              {{ item.note || t('repairHistory.noNote') }}
            </strong>
            <p>
              <span>{{ t('repairHistory.repairedBy') }}</span>
              <b>{{ item.repairedByName || t('repairHistory.unassigned') }}</b>
            </p>
          </article>
        </li>
      </ol>

      <button
        v-if="hasMore"
        class="repair-history-panel__more"
        type="button"
        :disabled="isLoading"
        @click="loadHistory({ append: true })"
      >
        {{ isLoading ? t('repairHistory.loading') : t('repairHistory.more') }}
      </button>
    </div>

    <div v-else-if="isLoading" class="repair-history-panel__skeleton" aria-hidden="true">
      <span v-for="item in 3" :key="item"><i></i><b></b></span>
    </div>

    <p v-else class="repair-history-panel__state">
      {{ errorMessage || t('repairHistory.empty') }}
    </p>
  </DashboardDataPanel>
</template>

<style scoped>
.repair-history-panel {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 0;
  height: 100%;
  flex-direction: column;
}

.repair-history-panel__ledger {
  display: flex;
  height: 100%;
  min-height: 0;
  margin: 0;
  padding: 0 var(--agentory-spacing-4) 0 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow-y: auto;
  list-style: none;
}

.repair-history-panel__ledger li {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 84px;
  flex: 0 0 84px;
  grid-template-columns: 20px minmax(0, 1fr);
  align-items: center;
  gap: var(--agentory-spacing-8);
  padding: var(--agentory-spacing-12) var(--agentory-spacing-10);
  border-radius: var(--agentory-radius-5);
  transition: background-color 160ms var(--agentory-ease-soft);
}

.repair-history-panel__ledger li:hover {
  background: color-mix(in srgb, var(--agentory-color-bg-surface), transparent 16%);
}

.repair-history-panel time {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body);
  line-height: var(--agentory-line-height-body);
}

.repair-history-panel__rail {
  position: relative;
  display: flex;
  height: 100%;
  justify-content: center;
  align-items: center;
  min-height: 54px;
}

.repair-history-panel__rail::after {
  position: absolute;
  top: 50%;
  bottom: -50%;
  width: 1px;
  background: var(--agentory-color-table-divider);
  content: '';
}

.repair-history-panel__ledger li:last-child .repair-history-panel__rail::after {
  display: none;
}

.repair-history-panel__rail i {
  z-index: 1;
  width: 9px;
  height: 9px;
  background: var(--agentory-color-bg-primary);
  border: 3px solid var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-pill);
  box-sizing: content-box;
}

.repair-history-panel article {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: var(--agentory-spacing-6);
}

.repair-history-panel article header {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--agentory-spacing-6);
  flex-wrap: wrap;
}

.repair-history-panel__summary {
  display: -webkit-box;
  min-width: 0;
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.repair-history-panel__code {
  flex: 0 0 auto;
  padding: var(--agentory-spacing-2) var(--agentory-spacing-6);
  color: var(--agentory-color-text-muted);
  background: var(--agentory-color-bg-surface);
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-caption);
}

.repair-history-panel article p {
  display: flex;
  margin: 0;
  align-items: center;
  gap: var(--agentory-spacing-6);
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
  line-height: var(--agentory-line-height-caption);
}

.repair-history-panel article p b {
  color: var(--agentory-color-text-primary);
  font-weight: var(--agentory-font-weight-medium);
}

.repair-history-panel__more {
  width: 100%;
  min-height: 32px;
  padding: var(--agentory-spacing-6) var(--agentory-spacing-12);
  color: var(--agentory-color-bg-primary);
  background: transparent;
  border: 0;
  font-family: var(--agentory-font-family-base);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  cursor: pointer;
}

.repair-history-panel__more:disabled {
  opacity: 0.48;
  cursor: default;
}

.repair-history-panel__skeleton {
  display: grid;
  width: 100%;
  gap: var(--agentory-spacing-4);
}

.repair-history-panel__skeleton > span {
  display: grid;
  min-height: 62px;
  padding: var(--agentory-spacing-10);
  grid-template-columns: 18px minmax(0, 1fr);
  gap: var(--agentory-spacing-10);
}

.repair-history-panel__skeleton i,
.repair-history-panel__skeleton b {
  display: block;
  height: 12px;
  background: var(--agentory-color-bg-surface);
  border-radius: var(--agentory-radius-pill);
  animation: repair-history-pulse 1.1s var(--agentory-ease-soft) infinite alternate;
}

.repair-history-panel__skeleton b {
  width: 72%;
}

.repair-history-panel__state {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  text-align: center;
}

@keyframes repair-history-pulse {
  from {
    opacity: 0.45;
  }

  to {
    opacity: 0.9;
  }
}

@container (max-width: 320px) {
  .repair-history-panel__ledger li {
    grid-template-columns: 14px minmax(0, 1fr);
    gap: var(--agentory-spacing-6);
    padding-inline: var(--agentory-spacing-4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .repair-history-panel__skeleton i,
  .repair-history-panel__skeleton b {
    animation: none;
  }
}
</style>
