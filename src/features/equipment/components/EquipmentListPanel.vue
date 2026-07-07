<script setup>
import { ref } from 'vue'

import structureIcon from '@/assets/icons/dashboard/action-3d-object.png'
import closeIcon from '@/assets/icons/dashboard/close.svg'
import listIcon from '@/assets/icons/dashboard/nav-list.svg'
import DashboardTablePanel from '@/features/dashboard/components/DashboardTablePanel.vue'
import FactoryViewport from '@/features/dashboard/components/FactoryViewport.vue'
import { equipmentStatusMap } from '@/features/equipment/mock/equipmentListMock'

defineProps({
  groups: {
    type: Array,
    required: true,
  },
})

const tablePanelRef = ref(null)
const isLineMenuOpen = ref(false)
const isStructureOpen = ref(false)

const equipmentColumns = [
  { key: 'equipmentId', label: '장비 ID', cellClass: 'dashboard-table-panel__cell--light' },
  { key: 'name', label: '장비명', cellClass: 'dashboard-table-panel__cell--strong dashboard-table-panel__cell--fit' },
  { key: 'type', label: '유형', cellClass: 'dashboard-table-panel__cell--strong dashboard-table-panel__cell--fit' },
  { key: 'status', label: '상태' },
  { key: 'temperature', label: '온도', cellClass: 'dashboard-table-panel__cell--strong' },
  { key: 'pressure', label: '압력', cellClass: 'dashboard-table-panel__cell--strong' },
  { key: 'rfPower', label: 'RF 파워', cellClass: 'dashboard-table-panel__cell--strong' },
  { key: 'gasFlow', label: '가스 유량', cellClass: 'dashboard-table-panel__cell--strong' },
  { key: 'alarm', label: '알림', cellClass: 'dashboard-table-panel__cell--strong' },
  { key: 'note', label: '비고', cellClass: 'dashboard-table-panel__cell--strong dashboard-table-panel__cell--fill' },
]

function scrollToLine(lineId) {
  tablePanelRef.value?.scrollToGroup(lineId)
  isLineMenuOpen.value = false
}
</script>

<template>
  <div class="equipment-list-panel">
    <DashboardTablePanel
      ref="tablePanelRef"
      title="설비 목록"
      data-test="equipment-list-panel"
      row-test-prefix="equipment-list-row"
      action-label="3D 구조 확인"
      :action-icon="structureIcon"
      :columns="equipmentColumns"
      column-gap="24px"
      :groups="groups"
      grid-template-columns="80px max-content max-content 74px 58px 70px 70px 74px 72px minmax(180px, 1fr)"
      table-min-width="1180px"
      @action="isStructureOpen = true"
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
            <span>라인 선택</span>
          </button>

          <Transition name="equipment-line-menu">
            <div v-if="isLineMenuOpen" class="equipment-list-panel__line-menu" data-test="equipment-line-menu">
              <button
                v-for="group in groups"
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
          {{ equipmentStatusMap[row.status].label }}
        </span>
      </template>
    </DashboardTablePanel>

    <Transition name="equipment-structure-modal">
      <div
        v-if="isStructureOpen"
        class="equipment-list-panel__overlay"
        data-test="equipment-structure-modal"
        role="dialog"
        aria-modal="true"
        aria-label="3D 구조 확인"
      >
        <section class="equipment-list-panel__structure">
          <button
            class="equipment-list-panel__structure-close"
            type="button"
            aria-label="3D 구조 확인 닫기"
            data-test="equipment-structure-close"
            @click="isStructureOpen = false"
          >
            <img :src="closeIcon" alt="" width="22" height="22" />
          </button>
          <FactoryViewport />
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
  color: var(--agentory-color-bg-primary);
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 90%);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  cursor: pointer;
}

.equipment-list-panel__line-button img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(43%) sepia(85%) saturate(2682%) hue-rotate(197deg)
    brightness(93%) contrast(91%);
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
  border: 1px solid color-mix(in srgb, var(--agentory-color-border-primary), transparent 58%);
  border-radius: var(--agentory-radius-8);
  box-shadow: var(--agentory-shadow-panel-soft);
  scrollbar-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 48%) transparent;
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
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 90%);
}

.equipment-list-panel__line-item strong {
  color: var(--agentory-color-bg-primary);
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
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 76%);
  border-radius: var(--agentory-radius-8);
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

.equipment-list-panel__status-dot--offline {
  background: var(--agentory-color-status-offline);
}

.equipment-list-panel__status-dot--warning {
  background: var(--agentory-color-status-warning);
}
</style>
