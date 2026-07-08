const dashboardNavigationItems = [
  {
    id: 'dashboard',
    label: '대시 보드 홈',
    icon: 'dashboard',
    to: '/dashboard',
  },
  {
    id: 'workLog',
    label: '작업 로그',
    icon: 'note',
    to: '/work-log',
  },
  {
    id: 'equipment',
    label: '설비 목록',
    icon: 'list',
    to: '/equipment',
  },
  {
    id: 'notification',
    label: '알림 이력',
    icon: 'bell',
    to: '/notifications',
  },
]

export function createDashboardNavigation(activeId = 'dashboard') {
  return dashboardNavigationItems.map((item) => ({
    ...item,
    active: item.id === activeId,
  }))
}

export const dashboardNavigation = createDashboardNavigation('dashboard')
