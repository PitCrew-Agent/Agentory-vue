<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import themeMoonIcon from '@/assets/icons/dashboard/theme-moon.svg'
import themeSunIcon from '@/assets/icons/dashboard/theme-sun.svg'
import { LOCALE_OPTIONS } from '@/features/i18n/constants/locales'
import { useUiStore } from '@/stores/uiStore'

const props = defineProps({
  reloadOnLocaleChange: {
    type: Boolean,
    default: false,
  },
  testPrefix: {
    type: String,
    default: 'preferences',
  },
  variant: {
    type: String,
    default: 'auth',
    validator: (value) => ['auth', 'header'].includes(value),
  },
})

const { t } = useI18n()
const uiStore = useUiStore()
const themeIcon = computed(() => (uiStore.isDarkMode ? themeSunIcon : themeMoonIcon))
const themeLabel = computed(() =>
  uiStore.isDarkMode ? t('common.switchToLight') : t('common.switchToDark'),
)
const themeTitle = computed(() =>
  uiStore.isDarkMode ? t('common.lightMode') : t('common.darkMode'),
)

function selectLocale(locale) {
  if (!uiStore.setLocale(locale) || !props.reloadOnLocaleChange) {
    return
  }

  window.location.reload()
}
</script>

<template>
  <div class="app-preferences" :class="`app-preferences--${variant}`">
    <button
      class="app-preferences__theme"
      type="button"
      :aria-label="themeLabel"
      :aria-pressed="uiStore.isDarkMode"
      :title="themeTitle"
      :data-test="`${testPrefix}-theme-toggle`"
      @click="uiStore.toggleTheme"
    >
      <img class="app-preferences__theme-icon" :src="themeIcon" alt="" width="20" height="20" />
    </button>

    <div class="app-preferences__language" role="group" :aria-label="t('common.language')">
      <button
        v-for="option in LOCALE_OPTIONS"
        :key="option.locale"
        class="app-preferences__language-option"
        :class="{
          'app-preferences__language-option--active': uiStore.currentLocale === option.locale,
        }"
        type="button"
        :aria-label="t(option.nameKey)"
        :aria-pressed="uiStore.currentLocale === option.locale"
        :data-test="`${testPrefix}-locale-${option.locale}`"
        @click="selectLocale(option.locale)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.app-preferences {
  --preference-active-background: var(--agentory-color-text-inverse);
  --preference-active-color: var(--agentory-color-bg-primary);
  --preference-control-background: var(--agentory-color-bg-glass-white);
  --preference-control-color: var(--agentory-color-text-inverse);
  --preference-focus-color: var(--agentory-color-border-inverse);

  display: inline-flex;
  align-items: center;
  gap: var(--agentory-spacing-8);
}

.app-preferences__theme {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-pill);
  cursor: pointer;
  transition:
    background-color 160ms var(--agentory-ease-soft),
    transform 180ms var(--agentory-ease-soft);
}

.app-preferences--auth .app-preferences__theme {
  background: color-mix(in srgb, var(--preference-control-background), transparent 12%);
}

.app-preferences__theme:hover {
  background: var(--preference-control-background);
}

.app-preferences__theme:active {
  transform: scale(0.94);
}

.app-preferences__theme:focus-visible,
.app-preferences__language-option:focus-visible {
  outline: 2px solid var(--preference-focus-color);
  outline-offset: 2px;
}

.app-preferences__theme-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.app-preferences__language {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: var(--agentory-spacing-2);
  background: var(--preference-control-background);
  border-radius: var(--agentory-radius-8);
}

.app-preferences__language-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 26px;
  padding: 0 var(--agentory-spacing-6);
  color: color-mix(in srgb, var(--preference-control-color), transparent 28%);
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-5);
  font-family: var(--agentory-font-family-base);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 160ms var(--agentory-ease-soft),
    background-color 160ms var(--agentory-ease-soft);
}

.app-preferences__language-option:hover {
  color: var(--preference-control-color);
}

.app-preferences__language-option--active {
  color: var(--preference-active-color);
  background: var(--preference-active-background);
}

@media (prefers-reduced-motion: reduce) {
  .app-preferences__language-option,
  .app-preferences__theme {
    transition: none;
  }
}
</style>
