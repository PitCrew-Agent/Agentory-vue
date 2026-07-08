<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import DashboardContentLoader from '@/features/dashboard/components/DashboardContentLoader.vue'
import DashboardHeader from '@/features/dashboard/components/DashboardHeader.vue'
import DashboardSidebar from '@/features/dashboard/components/DashboardSidebar.vue'
import { createDashboardNavigation } from '@/features/dashboard/constants/dashboardNavigation'
import { useDashboardSidebar } from '@/features/dashboard/composables/useDashboardSidebar'

const props = defineProps({
  activeNavigationId: {
    type: String,
    required: true,
  },
  contentLabel: {
    type: String,
    required: true,
  },
})

const { isSidebarOpen, toggleSidebar } = useDashboardSidebar()
const navigationItems = computed(() => createDashboardNavigation(props.activeNavigationId))
const isContentLoading = ref(true)
let contentLoadingTimer = 0

function showContentLoading() {
  window.clearTimeout(contentLoadingTimer)
  isContentLoading.value = true
  contentLoadingTimer = window.setTimeout(() => {
    isContentLoading.value = false
  }, 620)
}

onMounted(showContentLoading)

onBeforeUnmount(() => {
  window.clearTimeout(contentLoadingTimer)
})

watch(() => props.activeNavigationId, showContentLoading)
</script>

<template>
  <main class="dashboard-frame-page" :class="{ 'dashboard-frame-page--sidebar-open': isSidebarOpen }">
    <DashboardHeader />
    <DashboardSidebar
      :items="navigationItems"
      :open="isSidebarOpen"
      :show-dock="false"
      @toggle="toggleSidebar"
    />

    <section class="dashboard-frame-page__content" :aria-label="props.contentLabel">
      <Transition name="dashboard-content-loader">
        <DashboardContentLoader v-if="isContentLoading" label="화면을 불러오는 중" />
      </Transition>

      <div
        class="dashboard-frame-page__content-body"
        :class="{ 'dashboard-frame-page__content-body--loading': isContentLoading }"
      >
        <slot />
      </div>
    </section>
  </main>
</template>

<style scoped>
.dashboard-frame-page {
  --dashboard-scale: 0.8;
  --dashboard-header-height: 72px;
  --dashboard-sidebar-width: 90px;
  --dashboard-page-gutter: 15px;
  --agentory-spacing-4: 3px;
  --agentory-spacing-5: 4px;
  --agentory-spacing-6: 5px;
  --agentory-spacing-8: 6px;
  --agentory-spacing-10: 8px;
  --agentory-spacing-12: 10px;
  --agentory-spacing-14: 11px;
  --agentory-spacing-15: 12px;
  --agentory-spacing-16: 13px;
  --agentory-spacing-17: 14px;
  --agentory-spacing-20: 16px;
  --agentory-spacing-24: 19px;
  --agentory-spacing-25: 20px;
  --agentory-spacing-30: 24px;
  --agentory-spacing-40: 32px;
  --agentory-spacing-60: 48px;
  --agentory-font-size-title: 29px;
  --agentory-line-height-title: 24px;
  --agentory-font-size-body-lg: 16px;
  --agentory-line-height-body-lg: 24px;
  --agentory-font-size-body: 13px;
  --agentory-line-height-body: 19px;
  --agentory-font-size-body-sm: 11px;
  --agentory-line-height-body-sm: 17px;
  --agentory-font-size-caption: 10px;
  --agentory-line-height-caption: 14px;

  min-width: 1024px;
  height: 100vh;
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-app);
}

.dashboard-frame-page--sidebar-open {
  --dashboard-sidebar-width: 162px;
}

.dashboard-frame-page__content {
  position: fixed;
  top: var(--dashboard-header-height);
  right: 0;
  bottom: 0;
  left: var(--dashboard-sidebar-width);
  min-width: 0;
  min-height: 0;
  padding: var(--dashboard-page-gutter);
  overflow: hidden;
  transition: left 260ms ease;
}

.dashboard-frame-page__content-body {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  transition:
    opacity 260ms var(--agentory-ease-soft),
    filter 360ms var(--agentory-ease-soft),
    transform 440ms var(--agentory-ease-elastic);
}

.dashboard-frame-page__content-body--loading {
  opacity: 0.38;
  filter: blur(1px);
  transform: translateY(8px) scale(0.992);
}

.dashboard-content-loader-enter-active,
.dashboard-content-loader-leave-active {
  transition:
    opacity 220ms var(--agentory-ease-soft),
    transform 380ms var(--agentory-ease-elastic);
}

.dashboard-content-loader-enter-from,
.dashboard-content-loader-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-frame-page__content,
  .dashboard-frame-page__content-body,
  .dashboard-content-loader-enter-active,
  .dashboard-content-loader-leave-active {
    transition: none;
  }
}
</style>
