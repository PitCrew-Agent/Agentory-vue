<script setup>
import dangerStatusIcon from '@/assets/icons/dashboard/status-danger.svg'
import normalStatusIcon from '@/assets/icons/dashboard/status-normal.svg'
import offlineStatusIcon from '@/assets/icons/dashboard/status-offline.svg'
import warningStatusIcon from '@/assets/icons/dashboard/status-warning.svg'
import logoImage from '@/assets/images/agentory-logo.png'

defineProps({
  summary: {
    type: Array,
    required: true,
  },
})

const statusIconMap = {
  danger: dangerStatusIcon,
  normal: normalStatusIcon,
  offline: offlineStatusIcon,
  warning: warningStatusIcon,
}
</script>

<template>
  <header class="dashboard-header">
    <img class="dashboard-header__logo" :src="logoImage" alt="Agentory" width="266" height="49" />

    <ul class="dashboard-header__summary" aria-label="설비 상태 요약">
      <li
        v-for="item in summary"
        :key="item.id"
        class="dashboard-header__status"
        :class="`dashboard-header__status--${item.tone}`"
      >
        <img
          class="dashboard-header__dot"
          :src="statusIconMap[item.tone]"
          alt=""
          width="20"
          height="20"
        />
        <span>{{ item.label }}</span>
        <span class="dashboard-header__divider">·</span>
        <strong>{{ item.count }}</strong>
      </li>
    </ul>
  </header>
</template>

<style scoped>
.dashboard-header {
  position: fixed;
  z-index: 30;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-10);
  height: var(--dashboard-header-height, 90px);
  padding: var(--agentory-spacing-10) var(--agentory-spacing-25)
    var(--agentory-spacing-10) var(--agentory-spacing-40);
  background: var(--agentory-color-bg-primary);
}

.dashboard-header__logo {
  width: 213px;
  height: 39px;
  object-fit: contain;
}

.dashboard-header__summary {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-24);
  height: 56px;
  padding: var(--agentory-spacing-17) var(--agentory-spacing-20);
}

.dashboard-header__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--agentory-spacing-10);
  min-width: 0;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-14);
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-glass-light);
  border-radius: var(--agentory-radius-22);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-lg);
  white-space: nowrap;
}

.dashboard-header__dot {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex: 0 0 auto;
}

.dashboard-header__divider {
  font-size: var(--agentory-font-size-h2);
  font-weight: var(--agentory-font-weight-black);
  line-height: var(--agentory-line-height-h2);
}

.dashboard-header__status strong {
  font-weight: var(--agentory-font-weight-medium);
}

.dashboard-header__status--normal strong {
  color: var(--agentory-color-status-normal-text);
}

.dashboard-header__status--warning strong {
  color: var(--agentory-color-status-warning);
}

.dashboard-header__status--danger strong {
  color: var(--agentory-color-status-danger);
}

.dashboard-header__status--offline strong {
  color: var(--agentory-color-status-offline);
}

@media (max-width: 980px) {
  .dashboard-header {
    padding-left: var(--agentory-spacing-20);
  }

  .dashboard-header__summary {
    gap: var(--agentory-spacing-8);
    overflow-x: auto;
    padding-inline: var(--agentory-spacing-12);
  }

  .dashboard-header__status {
    font-size: var(--agentory-font-size-body-sm);
  }
}
</style>
