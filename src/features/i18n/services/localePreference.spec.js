import { beforeEach, describe, expect, it } from 'vitest'

import { LOCALE_STORAGE_KEY } from '@/features/i18n/constants/locales'
import {
  applyDocumentLocale,
  getAcceptLanguage,
  getSavedLocale,
  normalizeLocale,
  saveLocale,
} from '@/features/i18n/services/localePreference'

describe('localePreference', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('lang')
  })

  it('지원 로케일을 정규화하고 미지원 값은 한국어로 대체한다', () => {
    expect(normalizeLocale('en-US')).toBe('en')
    expect(normalizeLocale('ko_KR')).toBe('ko')
    expect(normalizeLocale('fr')).toBe('ko')
  })

  it('선택 로케일을 저장하고 문서 언어에 반영한다', () => {
    saveLocale('en')
    applyDocumentLocale('en')

    expect(getSavedLocale()).toBe('en')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('선택 언어를 우선하는 Accept-Language 값을 생성한다', () => {
    expect(getAcceptLanguage('ko')).toBe('ko-KR,ko;q=0.9,en;q=0.8')
    expect(getAcceptLanguage('en')).toBe('en-US,en;q=0.9,ko;q=0.8')
  })
})
