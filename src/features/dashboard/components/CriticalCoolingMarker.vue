<script setup>
defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <span
    class="critical-cooling-marker"
    :class="{ 'critical-cooling-marker--compact': compact }"
    role="img"
    aria-label="ERR-402"
    title="ERR-402"
  >
    <i aria-hidden="true"></i>
  </span>
</template>

<style scoped>
.critical-cooling-marker {
  --critical-cooling-marker-size: 18px;
  --critical-cooling-marker-core-size: 5px;

  position: relative;
  display: inline-grid;
  width: var(--critical-cooling-marker-size);
  height: var(--critical-cooling-marker-size);
  flex: 0 0 var(--critical-cooling-marker-size);
  place-items: center;
  isolation: isolate;
}

.critical-cooling-marker--compact {
  --critical-cooling-marker-size: 14px;
  --critical-cooling-marker-core-size: 4px;
}

.critical-cooling-marker::before,
.critical-cooling-marker::after {
  position: absolute;
  inset: 2px;
  border: 1px solid var(--agentory-color-status-danger-text);
  border-radius: var(--agentory-radius-pill);
  content: '';
  pointer-events: none;
}

.critical-cooling-marker::before {
  opacity: 0.82;
  animation: critical-cooling-marker-pulse 1.8s var(--agentory-ease-soft) infinite;
}

.critical-cooling-marker::after {
  inset: 0;
  opacity: 0.34;
  animation: critical-cooling-marker-pulse 1.8s var(--agentory-ease-soft) 320ms infinite;
}

.critical-cooling-marker i {
  z-index: 1;
  width: var(--critical-cooling-marker-core-size);
  height: var(--critical-cooling-marker-core-size);
  background: var(--agentory-color-status-danger-text);
  border-radius: var(--agentory-radius-pill);
  box-shadow: 0 0 var(--agentory-spacing-6)
    color-mix(in srgb, var(--agentory-color-status-danger-text), transparent 34%);
}

@keyframes critical-cooling-marker-pulse {
  0%,
  100% {
    opacity: 0.82;
    transform: scale(0.82);
  }

  54% {
    opacity: 0.16;
    transform: scale(1.18);
  }
}

@media (prefers-reduced-motion: reduce) {
  .critical-cooling-marker::before,
  .critical-cooling-marker::after {
    animation: none;
  }
}
</style>
