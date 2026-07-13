import { beforeEach, describe, expect, it } from 'vitest'

import { createPinia, setActivePinia } from 'pinia'

import { useUiStore } from '@/stores/uiStore'

describe('useUiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
    document.documentElement.removeAttribute('lang')
  })

  it('다크 모드를 문서 토큰과 저장 상태에 반영한다', () => {
    const uiStore = useUiStore()

    uiStore.initialize()
    uiStore.toggleTheme()

    expect(uiStore.currentTheme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('agentory-theme')).toBe('dark')
  })

  it('응답 로케일을 저장하고 문서 언어에 반영한다', () => {
    const uiStore = useUiStore()

    uiStore.initialize()
    uiStore.setLocale('en')

    expect(uiStore.currentLocale).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(window.localStorage.getItem('agentory-locale')).toBe('en')
  })
})
