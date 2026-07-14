import { createI18n } from 'vue-i18n'

import { messages } from '@/features/i18n/messages'
import { getSavedLocale, normalizeLocale } from '@/features/i18n/services/localePreference'

export const i18n = createI18n({
  fallbackLocale: 'ko',
  globalInjection: true,
  legacy: false,
  locale: getSavedLocale(),
  messages,
})

export function syncI18nLocale(locale) {
  i18n.global.locale.value = normalizeLocale(locale)
}

export function translate(key, params) {
  return i18n.global.t(key, params)
}
