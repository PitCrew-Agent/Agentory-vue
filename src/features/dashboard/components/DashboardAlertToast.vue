<script setup>
defineProps({
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
  toast: {
    type: Object,
    default: null,
  },
})

defineEmits(['respond'])
</script>

<template>
  <Transition name="dashboard-alert-toast">
    <aside
      v-if="toast"
      class="dashboard-alert-toast"
      :class="`dashboard-alert-toast--${toast.tone}`"
      role="status"
      aria-live="polite"
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
          {{ activeNotificationId === Number(toast.id) ? '계획 생성 중' : '대응 시작' }}
        </button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.dashboard-alert-toast {
  position: fixed;
  z-index: 46;
  top: var(--dashboard-header-height);
  left: calc(var(--dashboard-sidebar-width) + (100vw - var(--dashboard-sidebar-width)) / 2);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--agentory-spacing-10);
  width: min(520px, calc(100vw - var(--dashboard-sidebar-width) - 48px));
  min-height: 54px;
  padding: var(--agentory-spacing-10) var(--agentory-spacing-16);
  color: var(--agentory-color-text-primary);
  background: color-mix(in srgb, var(--agentory-color-bg-app), transparent 12%);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 78%);
  border-radius: var(--agentory-radius-16);
  box-shadow:
    var(--agentory-shadow-panel-soft),
    inset 0 1px 0 color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 2%);
  backdrop-filter: var(--agentory-blur-glass-strong);
  transform: translate(-50%, -50%);
  transition: left 260ms ease;
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
.dashboard-alert-toast-leave-active {
  transition:
    opacity 220ms var(--agentory-ease-soft),
    transform 360ms var(--agentory-ease-elastic);
}

.dashboard-alert-toast-enter-from,
.dashboard-alert-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -64%) scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-alert-toast,
  .dashboard-alert-toast-enter-active,
  .dashboard-alert-toast-leave-active {
    transition: none;
  }
}
</style>
