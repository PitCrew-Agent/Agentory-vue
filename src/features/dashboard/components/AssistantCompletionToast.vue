<script setup>
import { useI18n } from 'vue-i18n'

import openConversationIcon from '@/assets/icons/dashboard/notification-open-page.svg'
import { useDashboardSidebar } from '@/features/dashboard/composables/useDashboardSidebar'

defineProps({
  stackIndex: {
    type: Number,
    default: 0,
  },
  toast: {
    type: Object,
    default: null,
  },
})

defineEmits(['open', 'pause', 'resume'])

const { t } = useI18n()
const { isSidebarOpen } = useDashboardSidebar()
</script>

<template>
  <Transition name="assistant-completion-toast">
    <aside
      v-if="toast"
      class="assistant-completion-toast"
      :class="[
        `assistant-completion-toast--${toast.status}`,
        { 'assistant-completion-toast--sidebar-open': isSidebarOpen },
      ]"
      :style="{
        '--dashboard-toast-stack-index': stackIndex,
        zIndex: 46 - stackIndex,
      }"
      role="status"
      aria-live="polite"
      data-test="assistant-completion-toast"
      @mouseenter="$emit('pause')"
      @mouseleave="$emit('resume')"
    >
      <span class="assistant-completion-toast__status" aria-hidden="true"></span>

      <div class="assistant-completion-toast__copy">
        <strong>
          {{
            toast.status === 'error'
              ? t('assistant.responseToastErrorTitle')
              : t('assistant.responseToastTitle')
          }}
        </strong>
        <span>
          {{
            toast.status === 'error'
              ? t('assistant.responseToastErrorBody')
              : t('assistant.responseToastBody', { equipment: toast.equipmentId || '-' })
          }}
        </span>
      </div>

      <button
        type="button"
        class="assistant-completion-toast__open"
        :aria-label="t('assistant.responseToastOpen')"
        :title="t('assistant.responseToastOpen')"
        data-test="assistant-completion-toast-open"
        @click="$emit('open', toast)"
      >
        <img :src="openConversationIcon" alt="" width="20" height="20" />
      </button>
    </aside>
  </Transition>
</template>

<style scoped>
.assistant-completion-toast {
  position: fixed;
  --assistant-completion-sidebar-width: 90px;

  top: var(--agentory-toast-top);
  left: calc(
    var(--assistant-completion-sidebar-width) +
      (100vw - var(--assistant-completion-sidebar-width)) / 2
  );
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--agentory-toast-card-gap);
  width: min(
    var(--agentory-toast-width),
    calc(100vw - var(--assistant-completion-sidebar-width) - 48px)
  );
  min-height: var(--agentory-toast-min-height);
  padding: var(--agentory-toast-padding-block) var(--agentory-toast-padding-inline);
  color: var(--agentory-color-text-primary);
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--agentory-color-border-inverse), transparent 82%),
    color-mix(in srgb, var(--agentory-color-bg-app), transparent 42%) 48%,
    color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 58%)
  );
  border: 0;
  border-radius: var(--agentory-radius-16);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--agentory-color-border-inverse), transparent 28%),
    inset 0 -1px 0 color-mix(in srgb, var(--agentory-color-text-primary), transparent 94%),
    var(--agentory-shadow-panel-strong);
  -webkit-backdrop-filter: blur(22px) saturate(165%) contrast(118%);
  backdrop-filter: blur(22px) saturate(165%) contrast(118%);
  transform: translate(-50%, -50%)
    translateY(calc(var(--dashboard-toast-stack-index) * var(--agentory-toast-stack-offset)))
    scale(calc(1 - var(--dashboard-toast-stack-index) * 0.025));
  transform-origin: top center;
  transition:
    left 260ms ease,
    opacity 220ms var(--agentory-ease-soft),
    transform 360ms var(--agentory-ease-elastic);
}

.assistant-completion-toast--sidebar-open {
  --assistant-completion-sidebar-width: 162px;
}

.assistant-completion-toast__status {
  width: 12px;
  height: 12px;
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 84%);
}

.assistant-completion-toast--error .assistant-completion-toast__status {
  background: var(--agentory-color-status-danger-text);
  box-shadow: 0 0 0 4px
    color-mix(in srgb, var(--agentory-color-status-danger-text), transparent 84%);
}

.assistant-completion-toast__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--agentory-toast-copy-gap);
}

.assistant-completion-toast__copy strong,
.assistant-completion-toast__copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assistant-completion-toast__copy strong {
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-body);
}

.assistant-completion-toast__copy span {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
}

.assistant-completion-toast__open {
  display: grid;
  width: 30px;
  height: 30px;
  padding: 0;
  place-items: center;
  color: var(--agentory-color-bg-primary);
  background: color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 58%);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  box-shadow: inset 0 1px 0
    color-mix(in srgb, var(--agentory-color-border-inverse), transparent 48%);
  cursor: pointer;
  transition:
    background 180ms var(--agentory-ease-soft),
    transform 220ms var(--agentory-ease-elastic);
}

.assistant-completion-toast__open img {
  width: 20px;
  height: 20px;
  filter: var(--agentory-filter-header-action);
}

.assistant-completion-toast__open:hover {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 82%);
  transform: translateY(-1px);
}

.assistant-completion-toast__open:focus-visible {
  outline: 2px solid var(--agentory-color-border-primary);
  outline-offset: 2px;
}

.assistant-completion-toast-enter-active,
.assistant-completion-toast-leave-active {
  transition:
    opacity 220ms var(--agentory-ease-soft),
    transform 380ms var(--agentory-ease-elastic),
    translate 380ms var(--agentory-ease-elastic);
}

.assistant-completion-toast-enter-from {
  opacity: 0;
  transform: translate(-50%, -50%)
    translateY(calc(var(--dashboard-toast-stack-index) * var(--agentory-toast-stack-offset) - 14px))
    scale(0.96);
}

.assistant-completion-toast-leave-to {
  opacity: 0;
  translate: 72px 0;
}

@media (max-width: 640px) {
  .assistant-completion-toast {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: var(--agentory-spacing-8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .assistant-completion-toast-enter-active,
  .assistant-completion-toast-leave-active {
    transition: none;
  }
}
</style>
