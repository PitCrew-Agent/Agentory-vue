<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  activeNotificationId: {
    type: Number,
    default: null,
  },
  isResponding: {
    type: Boolean,
    default: false,
  },
  responseError: {
    type: String,
    default: '',
  },
  responseErrorNotificationId: {
    type: Number,
    default: null,
  },
  toasts: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['pause', 'respond', 'resume'])

const { t } = useI18n()
const visibleToasts = computed(() => props.toasts.slice(0, 2))
</script>

<template>
  <TransitionGroup
    name="dashboard-alert-toast"
    tag="div"
    class="dashboard-alert-toast-stack"
    role="status"
    aria-live="polite"
    @mouseenter="$emit('pause')"
    @mouseleave="$emit('resume')"
  >
    <aside
      v-for="(toast, index) in visibleToasts"
      :key="toast.toastKey ?? toast.id"
      class="dashboard-alert-toast"
      :class="`dashboard-alert-toast--${toast.tone}`"
      :style="{ '--dashboard-toast-stack-index': index }"
    >
      <span class="dashboard-alert-toast__dot" aria-hidden="true"></span>
      <div class="dashboard-alert-toast__copy">
        <strong>{{ toast.code }}</strong>
        <span>{{ toast.message }}</span>
        <small v-if="responseErrorNotificationId === Number(toast.id)">{{ responseError }}</small>
      </div>
      <div class="dashboard-alert-toast__actions">
        <time>{{ toast.occurredAt }}</time>
        <button
          type="button"
          :disabled="isResponding || !Number.isInteger(Number(toast.id))"
          @click="$emit('respond', toast)"
        >
          {{
            activeNotificationId === Number(toast.id) ? t('incident.creating') : t('incident.start')
          }}
        </button>
      </div>
    </aside>
  </TransitionGroup>
</template>

<style scoped>
.dashboard-alert-toast-stack {
  position: fixed;
  z-index: 46;
  top: var(--dashboard-header-height);
  left: calc(var(--dashboard-sidebar-width) + (100vw - var(--dashboard-sidebar-width)) / 2);
  display: grid;
  width: min(520px, calc(100vw - var(--dashboard-sidebar-width) - 48px));
  transform: translate(-50%, -50%);
  transition: left 260ms ease;
}

.dashboard-alert-toast {
  grid-area: 1 / 1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--agentory-spacing-10);
  width: 100%;
  min-height: 54px;
  padding: var(--agentory-spacing-10) var(--agentory-spacing-16);
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
  backdrop-filter: blur(22px) saturate(165%) contrast(118%);
  -webkit-backdrop-filter: blur(22px) saturate(165%) contrast(118%);
  transform: translateY(calc(var(--dashboard-toast-stack-index) * 10px))
    scale(calc(1 - var(--dashboard-toast-stack-index) * 0.025));
  transform-origin: top center;
  transition:
    opacity 220ms var(--agentory-ease-soft),
    transform 360ms var(--agentory-ease-elastic);
}

.dashboard-alert-toast:nth-child(1) {
  z-index: 2;
}

.dashboard-alert-toast:nth-child(2) {
  z-index: 1;
  opacity: 0.84;
}

.dashboard-alert-toast__dot {
  width: 12px;
  height: 12px;
  background: var(--agentory-color-status-warning);
  border-radius: var(--agentory-radius-pill);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--agentory-color-status-warning), transparent 76%);
}

.dashboard-alert-toast--danger .dashboard-alert-toast__dot {
  background: var(--agentory-color-status-danger);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--agentory-color-status-danger), transparent 78%);
}

.dashboard-alert-toast__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--agentory-spacing-4);
}

.dashboard-alert-toast__copy strong {
  overflow: hidden;
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-alert-toast__copy span,
.dashboard-alert-toast time {
  overflow: hidden;
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-alert-toast__copy small {
  color: var(--agentory-color-status-danger-text);
  font-size: var(--agentory-font-size-caption);
  line-height: var(--agentory-line-height-caption);
}

.dashboard-alert-toast time {
  color: var(--agentory-color-text-subtle);
}

.dashboard-alert-toast__actions {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-8);
}

.dashboard-alert-toast__actions button {
  min-height: 30px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-12);
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  white-space: nowrap;
  cursor: pointer;
}

.dashboard-alert-toast__actions button:disabled {
  opacity: 0.58;
  cursor: wait;
}

.dashboard-alert-toast-enter-active,
.dashboard-alert-toast-leave-active,
.dashboard-alert-toast-move {
  transition:
    opacity 220ms var(--agentory-ease-soft),
    transform 360ms var(--agentory-ease-elastic);
}

.dashboard-alert-toast-enter-from,
.dashboard-alert-toast-leave-to {
  opacity: 0;
  transform: translateY(-14px) scale(0.96);
}

.dashboard-alert-toast-leave-active {
  position: absolute;
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-alert-toast-stack,
  .dashboard-alert-toast,
  .dashboard-alert-toast-enter-active,
  .dashboard-alert-toast-leave-active,
  .dashboard-alert-toast-move {
    transition: none;
  }
}
</style>
