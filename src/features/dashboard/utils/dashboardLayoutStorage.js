const DASHBOARD_LAYOUT_STORAGE_KEY = 'agentory-dashboard-layout'
const DASHBOARD_LAYOUT_STORAGE_VERSION = 1

export function loadDashboardLayoutState() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedValue = window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)

    if (!storedValue) {
      return null
    }

    const state = JSON.parse(storedValue)

    return state?.version === DASHBOARD_LAYOUT_STORAGE_VERSION ? state : null
  } catch {
    return null
  }
}

export function saveDashboardLayoutState(state) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      DASHBOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...state,
        version: DASHBOARD_LAYOUT_STORAGE_VERSION,
      }),
    )
  } catch {
    // 브라우저 저장 공간을 사용할 수 없으면 현재 세션의 배치만 유지한다.
  }
}

export function resolveDashboardWidgetVisibility(
  defaultVisibility,
  state = loadDashboardLayoutState(),
) {
  return Object.fromEntries(
    Object.entries(defaultVisibility).map(([widgetId, isVisible]) => {
      const storedVisibility = state?.visibleWidgets?.[widgetId]

      return [widgetId, typeof storedVisibility === 'boolean' ? storedVisibility : isVisible]
    }),
  )
}
