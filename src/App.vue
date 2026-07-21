<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterView, useRoute, useRouter } from 'vue-router'

import AssistantCompletionToast from '@/features/dashboard/components/AssistantCompletionToast.vue'
import { useNotificationToastStackState } from '@/features/notification/composables/useNotificationToast'
import { useAssistantStore } from '@/stores/assistantStore'

const route = useRoute()
const router = useRouter()
const assistantStore = useAssistantStore()
const { completionToast } = storeToRefs(assistantStore)
const { visibleAlertToastCount } = useNotificationToastStackState()
const isRouteLoading = ref(false)
const dashboardRouteNames = new Set(['Dashboard', 'WorkLog', 'EquipmentList', 'NotificationLog'])
const authRouteNames = new Set(['Login'])
let loadingTimer = 0

function isDashboardRoute(routeTarget = route) {
  return dashboardRouteNames.has(routeTarget.name)
}

function isAuthRoute(routeTarget = route) {
  return authRouteNames.has(routeTarget.name)
}

function shouldSkipRouteLoading(routeTarget = route) {
  return isDashboardRoute(routeTarget) || isAuthRoute(routeTarget)
}

function getRouteViewKey(routeTarget) {
  if (isAuthRoute(routeTarget)) {
    return 'auth'
  }

  return routeTarget.name ?? routeTarget.fullPath
}

async function openCompletedAssistantConversation() {
  assistantStore.requestConversationOpen()
  assistantStore.dismissCompletionToast()

  if (route.name !== 'Dashboard') {
    await router.push({ name: 'Dashboard' })
  }
}

watch(
  () => route.fullPath,
  () => {
    window.clearTimeout(loadingTimer)

    if (shouldSkipRouteLoading()) {
      isRouteLoading.value = false
      return
    }

    isRouteLoading.value = true
    loadingTimer = window.setTimeout(() => {
      isRouteLoading.value = false
    }, 520)
  },
)

watch(
  [visibleAlertToastCount, completionToast],
  ([alertToastCount, assistantToast]) => {
    if (!assistantToast) {
      return
    }

    if (alertToastCount > 0) {
      assistantStore.pauseCompletionToast()
      return
    }

    assistantStore.resumeCompletionToast()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.clearTimeout(loadingTimer)
})
</script>

<template>
  <div class="app-route-shell" :class="{ 'app-route-shell--loading': isRouteLoading }">
    <AssistantCompletionToast
      :stack-index="visibleAlertToastCount"
      :toast="completionToast"
      @open="openCompletedAssistantConversation"
      @pause="assistantStore.pauseCompletionToast"
      @resume="assistantStore.resumeCompletionToast"
    />

    <Transition name="route-loader">
      <div
        v-if="isRouteLoading && !shouldSkipRouteLoading()"
        class="app-route-loader"
        aria-hidden="true"
      ></div>
    </Transition>

    <RouterView v-slot="{ Component, route: currentRoute }">
      <component
        :is="Component"
        v-if="shouldSkipRouteLoading(currentRoute)"
        :key="getRouteViewKey(currentRoute)"
        class="app-route-view"
      />

      <Transition v-else name="route-elastic" mode="out-in" appear>
        <component
          :is="Component"
          :key="currentRoute.name ?? currentRoute.fullPath"
          class="app-route-view"
        />
      </Transition>
    </RouterView>
  </div>
</template>

<style scoped>
.app-route-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: var(--agentory-color-bg-app);
}

.app-route-loader {
  position: fixed;
  z-index: 1000;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  overflow: hidden;
  pointer-events: none;
}

.app-route-loader::before {
  display: block;
  width: 38%;
  height: 100%;
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  box-shadow: var(--agentory-shadow-control);
  content: '';
  transform-origin: left center;
  animation: route-loader-slide 620ms var(--agentory-ease-elastic) infinite;
}

.route-loader-enter-active,
.route-loader-leave-active {
  transition:
    opacity 180ms var(--agentory-ease-soft),
    transform 240ms var(--agentory-ease-elastic);
}

.route-loader-enter-from,
.route-loader-leave-to {
  opacity: 0;
  transform: scaleX(0.82);
}

.route-elastic-enter-active,
.route-elastic-leave-active {
  transition:
    opacity 240ms var(--agentory-ease-soft),
    transform 430ms var(--agentory-ease-elastic),
    filter 340ms var(--agentory-ease-soft);
  transform-origin: 50% 46%;
}

.route-elastic-enter-from {
  opacity: 0;
  filter: blur(2px);
  transform: translateY(14px) scale(0.984);
}

.route-elastic-leave-to {
  opacity: 0;
  filter: blur(1px);
  transform: translateY(-7px) scale(0.992);
}

.route-elastic-enter-to,
.route-elastic-leave-from {
  opacity: 1;
  filter: blur(0);
  transform: translateY(0) scale(1);
}

@keyframes route-loader-slide {
  0% {
    transform: translateX(-50%) scaleX(0.48);
  }

  48% {
    transform: translateX(92%) scaleX(1.18);
  }

  100% {
    transform: translateX(260%) scaleX(0.52);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-route-loader::before {
    animation: none;
  }

  .route-loader-enter-active,
  .route-loader-leave-active,
  .route-elastic-enter-active,
  .route-elastic-leave-active {
    transition: none;
  }
}
</style>
