import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

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
  const isDarkMode = ref(false)
  const isInitialized = ref(false)
  const currentTheme = computed(() => (isDarkMode.value ? 'dark' : 'light'))

  function initialize() {
    if (isInitialized.value) {
      return
    }

    isDarkMode.value = getSavedTheme() === 'dark'
    applyDocumentTheme(currentTheme.value)
    isInitialized.value = true
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
    currentTheme,
    initialize,
    isDarkMode,
    toggleTheme,
  }
})
