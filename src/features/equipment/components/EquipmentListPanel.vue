<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import structureIcon from '@/assets/icons/dashboard/action-3d-object.png'
import closeIcon from '@/assets/icons/dashboard/close.svg'
import listIcon from '@/assets/icons/dashboard/nav-list.svg'
import { equipmentStatusMap } from '@/constants/equipmentStatus'
import DashboardTablePanel from '@/features/dashboard/components/DashboardTablePanel.vue'
import FactoryViewport from '@/features/dashboard/components/FactoryViewport.vue'

const props = defineProps({
  groups: {
    type: Array,
    required: true,
  },
  lineGroups: {
    type: Array,
    default: () => [],
  },
})

const { locale, t } = useI18n()

const tablePanelRef = ref(null)
const isLineMenuOpen = ref(false)
const isStructureOpen = ref(false)
const selectedStructureEquipmentId = ref('')

const selectedStructureEquipment = computed(() =>
  props.lineGroups
    .flatMap((line) => line.equipment)
    .find((equipment) => equipment.id === selectedStructureEquipmentId.value),
)

const selectedStructureChecklist = computed(() => selectedStructureEquipment.value?.checklist ?? [])

function formatLineLabel(label) {
  const source = String(label ?? '').trim()

  return locale.value === 'en' ? source.replace(/라인/g, 'Line') : source
}

const displayedGroups = computed(() =>
  props.groups.map((group) => ({
    ...group,
    date: formatLineLabel(group.date),
  })),
)

const equipmentColumns = computed(() => [
  {
    key: 'equipmentId',
    label: t('equipmentList.columns.equipmentId'),
    cellClass: 'dashboard-table-panel__cell--light',
  },
  {
    key: 'name',
    label: t('equipmentList.columns.name'),
    cellClass: 'dashboard-table-panel__cell--strong',
  },
  {
    key: 'type',
    label: t('equipmentList.columns.type'),
    cellClass: 'dashboard-table-panel__cell--strong',
  },
  {
    key: 'status',
    label: t('equipmentList.columns.status'),
    cellClass: 'dashboard-table-panel__cell--center',
    headerClass: 'dashboard-table-panel__header-cell--center',
  },
  {
    key: 'temperature',
    label: t('equipmentList.columns.temperature'),
    cellClass: 'dashboard-table-panel__cell--strong',
  },
  {
    key: 'pressure',
    label: t('equipmentList.columns.pressure'),
    cellClass: 'dashboard-table-panel__cell--strong',
  },
  {
    key: 'rfPower',
    label: t('equipmentList.columns.rfPower'),
    cellClass: 'dashboard-table-panel__cell--strong',
  },
  {
    key: 'gasFlow',
    label: t('equipmentList.columns.gasFlow'),
    cellClass: 'dashboard-table-panel__cell--strong',
  },
  {
    key: 'alarm',
    label: t('equipmentList.columns.alarm'),
    cellClass: 'dashboard-table-panel__cell--strong',
  },
  {
    key: 'note',
    label: t('equipmentList.columns.note'),
    cellClass: 'dashboard-table-panel__cell--strong dashboard-table-panel__cell--fill',
  },
])

function scrollToLine(lineId) {
  tablePanelRef.value?.scrollToGroup(lineId)
  isLineMenuOpen.value = false
}

function openStructure() {
  selectedStructureEquipmentId.value = props.lineGroups[0]?.equipment[0]?.id ?? ''
  isStructureOpen.value = true
}

function selectStructureEquipment(equipmentId) {
  selectedStructureEquipmentId.value = equipmentId
}
</script>

<template>
  <div class="equipment-list-panel">
    <DashboardTablePanel
      ref="tablePanelRef"
      :title="t('equipmentList.title')"
      data-test="equipment-list-panel"
      row-test-prefix="equipment-list-row"
      :action-label="t('equipmentList.action')"
      :action-icon="structureIcon"
      :columns="equipmentColumns"
      column-gap="20px"
      :groups="displayedGroups"
      grid-template-columns="92px 136px 124px 78px 72px 82px 82px 92px 88px minmax(220px, 1fr)"
      table-min-width="1290px"
      @action="openStructure"
    >
      <template #title-actions>
        <div class="equipment-list-panel__line-picker">
          <button
            class="equipment-list-panel__line-button"
            type="button"
            :aria-expanded="isLineMenuOpen"
            data-test="equipment-line-toggle"
            @click="isLineMenuOpen = !isLineMenuOpen"
          >
            <img :src="listIcon" alt="" width="18" height="18" />
            <span>{{ t('equipmentList.lineSelect') }}</span>
          </button>

          <Transition name="equipment-line-menu">
            <div
              v-if="isLineMenuOpen"
              class="equipment-list-panel__line-menu"
              data-test="equipment-line-menu"
            >
              <button
                v-for="group in displayedGroups"
                :key="group.id"
                class="equipment-list-panel__line-item"
                type="button"
                :data-test="`equipment-line-${group.id}`"
                @click="scrollToLine(group.id)"
              >
                <strong>{{ group.date }}</strong>
                <span>
                  {{ group.rows.map((row) => row.name).join(', ') }}
                </span>
              </button>
            </div>
          </Transition>
        </div>
      </template>

      <template #cell-status="{ row }">
        <span class="equipment-list-panel__status">
          <span
            class="equipment-list-panel__status-dot"
            :class="`equipment-list-panel__status-dot--${equipmentStatusMap[row.status].tone}`"
            aria-hidden="true"
          ></span>
          {{ t(equipmentStatusMap[row.status].labelKey) }}
        </span>
      </template>

      <template #cell-note="{ row }">
        {{ row.note || (row.noteKey ? t(row.noteKey) : '-') }}
      </template>
    </DashboardTablePanel>

    <Transition name="equipment-structure-modal">
      <div
        v-if="isStructureOpen"
        class="equipment-list-panel__overlay"
        data-test="equipment-structure-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="t('equipmentList.structure')"
      >
        <section class="equipment-list-panel__structure">
          <button
            class="equipment-list-panel__structure-close"
            type="button"
            :aria-label="t('equipmentList.closeStructure')"
            data-test="equipment-structure-close"
            @click="isStructureOpen = false"
          >
            <img :src="closeIcon" alt="" width="22" height="22" />
          </button>
          <FactoryViewport
            :checklist-items="selectedStructureChecklist"
            :lines="lineGroups"
            :selected-equipment-id="selectedStructureEquipmentId"
            @select-equipment="selectStructureEquipment"
          />
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.equipment-list-panel {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.equipment-list-panel :deep(.dashboard-table-panel__date-line) {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 24%);
}

.equipment-list-panel__line-picker {
  position: relative;
}

.equipment-list-panel__line-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--agentory-spacing-6);
  min-height: 30px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-12);
  color: var(--agentory-color-text-muted);
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 84%);
  border: 0;
  border-radius: var(--agentory-radius-8);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  cursor: pointer;
  transition:
    background-color 160ms var(--agentory-ease-soft),
    transform 180ms var(--agentory-ease-soft);
}

.equipment-list-panel__line-button img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(48%) sepia(4%) saturate(14%) hue-rotate(33deg)
    brightness(96%) contrast(88%);
}

.equipment-list-panel__line-button:hover {
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 70%);
  transform: translateY(-1px);
}

.equipment-list-panel__line-menu {
  position: absolute;
  z-index: 12;
  top: calc(100% + var(--agentory-spacing-8));
  left: 0;
  display: flex;
  width: 360px;
  max-height: 340px;
  padding: var(--agentory-spacing-8);
  flex-direction: column;
  gap: var(--agentory-spacing-6);
  overflow: auto;
  background: var(--agentory-color-bg-app);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-muted), transparent 42%);
  border-radius: var(--agentory-radius-8);
  box-shadow: var(--agentory-shadow-panel-soft);
  scrollbar-color: color-mix(in srgb, var(--agentory-color-text-muted), transparent 62%) transparent;
  scrollbar-width: thin;
}

.equipment-list-panel__line-item {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-4);
  width: 100%;
  padding: var(--agentory-spacing-10);
  color: var(--agentory-color-text-primary);
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-5);
  text-align: left;
  cursor: pointer;
}

.equipment-list-panel__line-item:hover {
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 82%);
}

.equipment-list-panel__line-item strong {
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-body);
}

.equipment-list-panel__line-item span {
  overflow: hidden;
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  line-height: var(--agentory-line-height-body-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.equipment-line-menu-enter-active,
.equipment-line-menu-leave-active,
.equipment-structure-modal-enter-active,
.equipment-structure-modal-leave-active {
  transition:
    opacity 180ms ease,
    transform 200ms ease;
}

.equipment-line-menu-enter-from,
.equipment-line-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.equipment-list-panel__overlay {
  position: absolute;
  z-index: 20;
  inset: 0;
  padding: var(--agentory-spacing-24);
  background: color-mix(in srgb, var(--agentory-color-text-primary), transparent 78%);
  border-radius: var(--agentory-radius-8);
  backdrop-filter: var(--agentory-blur-glass);
}

.equipment-structure-modal-enter-from,
.equipment-structure-modal-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.equipment-list-panel__structure {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel-soft);
}

.equipment-list-panel__structure-close {
  position: absolute;
  z-index: 2;
  top: var(--agentory-spacing-16);
  right: var(--agentory-spacing-16);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  background: var(--agentory-color-bg-app);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  box-shadow: var(--agentory-shadow-control);
  cursor: pointer;
}

.equipment-list-panel__structure-close img {
  width: 22px;
  height: 22px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(22%);
}

.equipment-list-panel__structure :deep(.factory-viewport) {
  width: 100%;
  height: 100%;
  border-radius: var(--agentory-radius-16);
  box-shadow: none;
}

.equipment-list-panel__status {
  display: inline-flex;
  align-items: center;
  gap: var(--agentory-spacing-8);
  min-width: 0;
  color: var(--agentory-color-text-primary);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body);
  white-space: nowrap;
}

.equipment-list-panel__status-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--agentory-radius-pill);
  flex: 0 0 auto;
}

.equipment-list-panel__status-dot--danger {
  background: var(--agentory-color-status-danger-text);
}

.equipment-list-panel__status-dot--normal {
  background: var(--agentory-color-status-normal);
}

.equipment-list-panel__status-dot--warning {
  background: var(--agentory-color-status-warning);
}
</style>
