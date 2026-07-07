<script setup>
defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
  label: {
    type: String,
    default: '화면을 불러오는 중',
  },
})
</script>

<template>
  <div
    class="dashboard-content-loader"
    :class="{ 'dashboard-content-loader--compact': compact }"
    role="status"
    aria-live="polite"
  >
    <span class="sr-only">{{ label }}</span>
    <span class="dashboard-content-loader__spinner" aria-hidden="true"></span>
  </div>
</template>

<style scoped>
.dashboard-content-loader {
  --dashboard-loader-size: 72px;
  --dashboard-loader-border: 7px;

  position: absolute;
  z-index: 30;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 50% 44%, color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 20%), transparent 30%),
    color-mix(in srgb, var(--agentory-color-bg-app), transparent 42%);
  backdrop-filter: var(--agentory-blur-glass-strong);
  -webkit-backdrop-filter: var(--agentory-blur-glass-strong);
  pointer-events: none;
}

.dashboard-content-loader--compact {
  --dashboard-loader-size: 56px;
  --dashboard-loader-border: 6px;

  border-radius: inherit;
  background:
    radial-gradient(circle at 50% 46%, color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 12%), transparent 34%),
    color-mix(in srgb, var(--agentory-color-bg-app), transparent 56%);
}

.dashboard-content-loader__spinner {
  width: var(--dashboard-loader-size);
  height: var(--dashboard-loader-size);
  border: var(--dashboard-loader-border) solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 82%);
  border-top-color: var(--agentory-color-bg-primary);
  border-right-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 30%);
  border-radius: var(--agentory-radius-pill);
  box-shadow:
    0 0 0 10px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 92%),
    var(--agentory-shadow-control);
  animation:
    dashboard-loader-spin 880ms linear infinite,
    dashboard-loader-pulse 1160ms var(--agentory-ease-elastic) infinite;
}

@keyframes dashboard-loader-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes dashboard-loader-pulse {
  0%,
  100% {
    opacity: 0.88;
    scale: 0.92;
  }

  46% {
    opacity: 1;
    scale: 1.08;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-content-loader__spinner {
    animation: none;
  }
}
</style>
