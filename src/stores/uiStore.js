import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { DEFAULT_LOCALE } from '@/features/i18n/constants/locales'
import { syncI18nLocale } from '@/features/i18n'
import {
  applyDocumentLocale,
  getSavedLocale,
  normalizeLocale,
  saveLocale,
} from '@/features/i18n/services/localePreference'

const THEME_STORAGE_KEY = 'agentory-theme'

function applyDocumentTheme(theme) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = theme
}

function getSavedTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

export const useUiStore = defineStore('ui', () => {
  const currentLocale = ref(DEFAULT_LOCALE)
  const isDarkMode = ref(false)
  const isInitialized = ref(false)
  const currentTheme = computed(() => (isDarkMode.value ? 'dark' : 'light'))

  function initialize() {
    if (isInitialized.value) {
      return
    }

    isDarkMode.value = getSavedTheme() === 'dark'
    currentLocale.value = getSavedLocale()
    applyDocumentTheme(currentTheme.value)
    applyDocumentLocale(currentLocale.value)
    syncI18nLocale(currentLocale.value)
    isInitialized.value = true
  }

  function setLocale(locale) {
    initialize()

    const normalizedLocale = normalizeLocale(locale)
    const hasChanged = currentLocale.value !== normalizedLocale

    currentLocale.value = normalizedLocale
    saveLocale(normalizedLocale)
    applyDocumentLocale(normalizedLocale)
    syncI18nLocale(normalizedLocale)

    return hasChanged
  }

  function toggleTheme() {
    initialize()
    isDarkMode.value = !isDarkMode.value
    applyDocumentTheme(currentTheme.value)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, currentTheme.value)
    }
  }

  return {
    currentLocale,
    currentTheme,
    initialize,
    isDarkMode,
    setLocale,
    toggleTheme,
  }
})
