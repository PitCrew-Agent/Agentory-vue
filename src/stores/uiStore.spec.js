import { beforeEach, describe, expect, it } from 'vitest'

import { createPinia, setActivePinia } from 'pinia'

import { useUiStore } from '@/stores/uiStore'

describe('useUiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('다크 모드를 문서 토큰과 저장 상태에 반영한다', () => {
    const uiStore = useUiStore()

    uiStore.initialize()
    uiStore.toggleTheme()

    expect(uiStore.currentTheme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('agentory-theme')).toBe('dark')
  })
})
