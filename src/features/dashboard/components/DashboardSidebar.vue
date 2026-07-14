<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import bellIcon from '@/assets/icons/dashboard/nav-bell.svg'
import dashboardIcon from '@/assets/icons/dashboard/nav-dashboard.svg'
import listIcon from '@/assets/icons/dashboard/nav-list.svg'
import noteIcon from '@/assets/icons/dashboard/nav-note.svg'
import widgetStorageIcon from '@/assets/icons/dashboard/nav-widget-storage.svg'
import sidebarToggleIcon from '@/assets/icons/dashboard/sidebar-toggle.svg'
import { useDashboardSidebar } from '@/features/dashboard/composables/useDashboardSidebar'

const props = defineProps({
  dockWidgets: {
    type: Array,
    default: () => [],
  },
  items: {
    type: Array,
    required: true,
  },
  open: {
    type: Boolean,
    required: true,
  },
  showDock: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['restore-widget', 'toggle'])
const { t } = useI18n()
const { sidebarActiveIndex } = useDashboardSidebar()

const iconMap = {
  bell: bellIcon,
  dashboard: dashboardIcon,
  list: listIcon,
  note: noteIcon,
}

const toggleY = ref(32)
const isDockOpen = ref(false)
const hasDockWidgets = computed(() => props.dockWidgets.length > 0)
const activeItemIndex = computed(() => props.items.findIndex((item) => item.active))
const visualActiveIndex = ref(sidebarActiveIndex.value >= 0 ? sidebarActiveIndex.value : activeItemIndex.value)

watch(
  activeItemIndex,
  (nextIndex) => {
    if (nextIndex < 0) {
      return
    }

    if (sidebarActiveIndex.value < 0) {
      sidebarActiveIndex.value = nextIndex
      visualActiveIndex.value = nextIndex
      return
    }

    visualActiveIndex.value = sidebarActiveIndex.value
    window.requestAnimationFrame(() => {
      visualActiveIndex.value = nextIndex
      sidebarActiveIndex.value = nextIndex
    })
  },
  { immediate: true },
)

function syncTogglePosition(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const y = event.clientY - rect.top
  toggleY.value = Math.min(Math.max(y, 24), rect.height - 24)
}

function restoreWidget(id) {
  emit('restore-widget', id)
  isDockOpen.value = false
}

function getItemLabel(item) {
  return item.labelKey ? t(item.labelKey) : item.label
}
</script>

<template>
  <aside
    class="dashboard-sidebar"
    :class="{ 'dashboard-sidebar--open': props.open }"
    :data-open="String(props.open)"
    data-test="dashboard-sidebar"
  >
    <nav
      class="dashboard-sidebar__nav"
      :aria-label="t('navigation.label')"
      :style="{ '--sidebar-active-index': visualActiveIndex }"
    >
      <span v-if="visualActiveIndex >= 0" class="dashboard-sidebar__active-indicator" aria-hidden="true"></span>

      <template v-for="item in props.items" :key="item.id">
        <RouterLink
          v-if="item.to"
          class="dashboard-sidebar__item"
          :class="{ 'dashboard-sidebar__item--active': item.active }"
          :to="item.to"
          :aria-current="item.active ? 'page' : undefined"
        >
          <img class="dashboard-sidebar__icon" :src="iconMap[item.icon]" alt="" width="36" height="36" />
          <span class="dashboard-sidebar__label">{{ getItemLabel(item) }}</span>
        </RouterLink>

        <button
          v-else
          class="dashboard-sidebar__item"
          :class="{ 'dashboard-sidebar__item--active': item.active }"
          type="button"
          :aria-current="item.active ? 'page' : undefined"
        >
          <img class="dashboard-sidebar__icon" :src="iconMap[item.icon]" alt="" width="36" height="36" />
          <span class="dashboard-sidebar__label">{{ getItemLabel(item) }}</span>
        </button>
      </template>
    </nav>

    <div v-if="props.showDock" class="dashboard-sidebar__storage">
      <button
        class="dashboard-sidebar__item dashboard-sidebar__storage-button"
        type="button"
        :aria-expanded="isDockOpen"
        data-test="dashboard-widget-dock-toggle"
        @click="isDockOpen = !isDockOpen"
      >
        <img class="dashboard-sidebar__icon" :src="widgetStorageIcon" alt="" width="36" height="36" />
        <span class="dashboard-sidebar__label">{{ t('sidebar.widgetStorage') }}</span>
        <small v-if="dockWidgets.length > 0" class="dashboard-sidebar__storage-count">
          {{ dockWidgets.length }}
        </small>
      </button>

      <div v-if="isDockOpen" class="dashboard-sidebar__dock-panel" data-test="dashboard-widget-dock-panel">
        <div class="dashboard-sidebar__dock-header">
          <strong>{{ t('sidebar.widgetStorage') }}</strong>
          <span>{{ dockWidgets.length }}</span>
        </div>

        <div v-if="hasDockWidgets" class="dashboard-sidebar__dock-list">
          <button
            v-for="widget in dockWidgets"
            :key="widget.id"
            type="button"
            class="dashboard-sidebar__dock-item"
            :data-test="`dock-restore-${widget.id}`"
            @click="restoreWidget(widget.id)"
          >
            <span>{{ widget.label }}</span>
            <small>{{ t('sidebar.restore') }}</small>
          </button>
        </div>

        <p v-else class="dashboard-sidebar__dock-empty">{{ t('sidebar.emptyStorage') }}</p>
      </div>
    </div>

    <div
      class="dashboard-sidebar__toggle-hotspot"
      data-test="sidebar-toggle-hotspot"
      :style="{ '--sidebar-toggle-y': `${toggleY}px` }"
      @pointerenter="syncTogglePosition"
      @pointermove="syncTogglePosition"
    >
      <button
        class="dashboard-sidebar__toggle"
        :class="{ 'dashboard-sidebar__toggle--open': props.open }"
        type="button"
        :aria-label="props.open ? t('sidebar.close') : t('sidebar.open')"
        @click="emit('toggle')"
      >
        <img :src="sidebarToggleIcon" alt="" width="18" height="18" />
      </button>
    </div>
  </aside>
</template>

<style scoped>
.dashboard-sidebar {
  position: fixed;
  z-index: 20;
  top: var(--dashboard-header-height, 90px);
  bottom: 0;
  left: 0;
  width: var(--dashboard-sidebar-width);
  padding: 21px var(--agentory-spacing-20) var(--agentory-spacing-20);
  background: var(--agentory-color-bg-app);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
  transition:
    width 260ms ease,
    padding 260ms ease;
}

.dashboard-sidebar__nav {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 29px;
  align-items: flex-start;
  width: 100%;
  padding: var(--agentory-spacing-10);
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-8);
}

.dashboard-sidebar__active-indicator {
  position: absolute;
  z-index: 0;
  top: calc(var(--agentory-spacing-10) + (42px + 29px) * var(--sidebar-active-index));
  left: var(--agentory-spacing-10);
  width: 42px;
  height: 42px;
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-8);
  box-shadow: var(--agentory-shadow-sidebar-active);
  pointer-events: none;
  transition:
    top 520ms var(--agentory-ease-elastic),
    width 320ms var(--agentory-ease-elastic),
    transform 420ms var(--agentory-ease-elastic);
}

.dashboard-sidebar--open .dashboard-sidebar__active-indicator {
  width: 114px;
}

.dashboard-sidebar__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-10);
  width: 42px;
  min-height: 42px;
  padding: var(--agentory-spacing-8);
  color: var(--agentory-color-text-primary);
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-8);
  text-decoration: none;
  z-index: 1;
  transition:
    width 260ms ease,
    color 180ms ease;
}

.dashboard-sidebar--open .dashboard-sidebar__item {
  width: 114px;
}

.dashboard-sidebar__item--active {
  color: var(--agentory-color-text-inverse);
}

.dashboard-sidebar__icon {
  width: 29px;
  height: 29px;
  object-fit: contain;
  flex: 0 0 auto;
  filter: brightness(0) saturate(100%) invert(24%);
  transition: filter 180ms ease;
}

.dashboard-sidebar__item--active .dashboard-sidebar__icon {
  filter: brightness(0) invert(1);
}

.dashboard-sidebar__item:not(.dashboard-sidebar__item--active) .dashboard-sidebar__icon {
  width: 22px;
  height: 22px;
  margin: 3px;
}

.dashboard-sidebar__label {
  max-width: 0;
  overflow: hidden;
  color: inherit;
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body);
  opacity: 0;
  white-space: nowrap;
  transform: translateX(-8px);
  transition:
    max-width 260ms ease,
    opacity 180ms ease,
    transform 220ms ease;
}

.dashboard-sidebar--open .dashboard-sidebar__label {
  max-width: 72px;
  opacity: 1;
  transform: translateX(0);
}

.dashboard-sidebar__storage {
  position: absolute;
  right: var(--agentory-spacing-20);
  bottom: var(--agentory-spacing-20);
  left: var(--agentory-spacing-20);
  padding: var(--agentory-spacing-10);
}

.dashboard-sidebar__storage-button {
  width: 42px;
}

.dashboard-sidebar--open .dashboard-sidebar__storage-button {
  width: 114px;
}

.dashboard-sidebar__storage-count {
  position: absolute;
  top: 3px;
  right: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding-inline: 4px;
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  font-size: 9px;
  font-weight: var(--agentory-font-weight-bold);
  line-height: 1;
}

.dashboard-sidebar__dock-panel {
  position: absolute;
  bottom: var(--agentory-spacing-10);
  left: calc(100% + 10px);
  width: 230px;
  padding: 12px;
  background: color-mix(in srgb, var(--agentory-color-bg-app), transparent 4%);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 70%);
  border-radius: var(--agentory-radius-12);
  box-shadow: var(--agentory-shadow-panel);
}

.dashboard-sidebar__dock-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--agentory-color-bg-primary);
}

.dashboard-sidebar__dock-header strong {
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-extra-bold);
  line-height: var(--agentory-line-height-body);
}

.dashboard-sidebar__dock-header span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-caption);
}

.dashboard-sidebar__dock-list {
  display: flex;
  max-height: 210px;
  margin-top: 10px;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
  scrollbar-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 52%) transparent;
  scrollbar-width: thin;
}

.dashboard-sidebar__dock-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 11px;
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-surface);
  border: 0;
  border-radius: var(--agentory-radius-8);
  text-align: left;
  transition:
    background 160ms ease,
    transform 160ms ease;
}

.dashboard-sidebar__dock-item:hover,
.dashboard-sidebar__dock-item:focus-visible {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 86%);
  outline: none;
  transform: translateY(-1px);
}

.dashboard-sidebar__dock-item span {
  min-width: 0;
  overflow: hidden;
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-sidebar__dock-item small {
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-caption);
  flex: 0 0 auto;
}

.dashboard-sidebar__dock-empty {
  margin-top: 10px;
  padding: 18px 10px;
  color: var(--agentory-color-text-muted);
  background: var(--agentory-color-bg-surface);
  border-radius: var(--agentory-radius-8);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
  text-align: center;
}

.dashboard-sidebar__toggle-hotspot {
  position: absolute;
  top: 0;
  right: -22px;
  bottom: 0;
  width: 44px;
  z-index: 2;
}

.dashboard-sidebar__toggle {
  position: absolute;
  top: var(--sidebar-toggle-y);
  left: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  box-shadow: var(--agentory-shadow-control);
  opacity: 0;
  pointer-events: none;
  transform: translate(-58%, -50%) scale(0.68);
  transition:
    opacity 180ms ease,
    top 80ms linear,
    transform 340ms cubic-bezier(0.22, 1.45, 0.36, 1);
}

.dashboard-sidebar__toggle-hotspot:hover .dashboard-sidebar__toggle,
.dashboard-sidebar__toggle:focus-visible {
  opacity: 1;
  pointer-events: auto;
  transform: translate(-50%, -50%) scale(1);
}

.dashboard-sidebar__toggle img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  transition: transform 220ms ease;
}

.dashboard-sidebar__toggle--open img {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-sidebar,
  .dashboard-sidebar__item,
  .dashboard-sidebar__label,
  .dashboard-sidebar__toggle,
  .dashboard-sidebar__dock-item,
  .dashboard-sidebar__active-indicator {
    transition: none;
  }
}
</style>
