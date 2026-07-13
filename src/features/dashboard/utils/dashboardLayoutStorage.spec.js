import { beforeEach, describe, expect, it } from 'vitest'

import {
  loadDashboardLayoutState,
  saveDashboardLayoutState,
} from '@/features/dashboard/utils/dashboardLayoutStorage'

describe('dashboardLayoutStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('위젯 배치와 표시 상태를 저장하고 불러온다', () => {
    const state = {
      layouts: { detail: { col: 1, cols: 2, row: 0, rows: 1 } },
      visibleWidgets: { detail: true },
    }

    saveDashboardLayoutState(state)

    expect(loadDashboardLayoutState()).toMatchObject(state)
  })

  it('지원하지 않는 버전이나 손상된 값을 무시한다', () => {
    window.localStorage.setItem('agentory-dashboard-layout', '{broken')
    expect(loadDashboardLayoutState()).toBeNull()

    window.localStorage.setItem('agentory-dashboard-layout', JSON.stringify({ version: 99 }))
    expect(loadDashboardLayoutState()).toBeNull()
  })
})
