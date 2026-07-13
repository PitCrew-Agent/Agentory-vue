import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from '@/features/i18n/constants/locales'

const ACCEPT_LANGUAGE_BY_LOCALE = {
  en: 'en-US,en;q=0.9,ko;q=0.8',
  ko: 'ko-KR,ko;q=0.9,en;q=0.8',
}

export function normalizeLocale(locale) {
  const primaryLocale = String(locale ?? '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0]

  return SUPPORTED_LOCALES.includes(primaryLocale) ? primaryLocale : DEFAULT_LOCALE
}

export function getSavedLocale() {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE
  }

  return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY))
}

export function saveLocale(locale) {
  const normalizedLocale = normalizeLocale(locale)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, normalizedLocale)
  }

  return normalizedLocale
}

export function applyDocumentLocale(locale) {
  const normalizedLocale = normalizeLocale(locale)

  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalizedLocale
  }

  return normalizedLocale
}

export function getAcceptLanguage(locale = getSavedLocale()) {
  return ACCEPT_LANGUAGE_BY_LOCALE[normalizeLocale(locale)]
}
