export const statusSummary = [
  {
    id: 'normal',
    label: '정상',
    count: 5,
    tone: 'normal',
  },
  {
    id: 'warning',
    label: '주의',
    count: 1,
    tone: 'warning',
  },
  {
    id: 'danger',
    label: '위험',
    count: 1,
    tone: 'danger',
  },
  {
    id: 'offline',
    label: '오프라인',
    count: 1,
    tone: 'offline',
  },
]

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

export const selectedEquipment = {
  id: 'robot-arm-01',
  name: '로봇 암 01',
  type: 'ROBOT',
  status: {
    label: '정상',
    tone: 'normal',
  },
  updatedAt: {
    date: '2026-07-02',
    time: '10:00:00',
  },
  owner: '김억산',
  inspectedAt: '2026-06-30',
  metrics: [
    {
      id: 'temperature',
      label: '온도',
      value: '42.0',
      unit: '°C',
      icon: 'temperature',
    },
    {
      id: 'pressure',
      label: '압력',
      value: '1.08',
      unit: 'MPa',
      icon: 'pressure',
    },
    {
      id: 'rfPower',
      label: 'RF 파워',
      value: '13.2',
      unit: 'kW',
      icon: 'rfPower',
    },
    {
      id: 'gasFlow',
      label: '가스 유량',
      value: '245',
      unit: 'sccm',
      icon: 'gasFlow',
    },
  ],
  charts: {
    temperature: {
      title: '온도(°C)',
      min: 34,
      max: 44,
      points: [
        { time: '10:00', value: 38.2 },
        { time: '10:10', value: 37.8 },
        { time: '10:20', value: 39.1 },
        { time: '10:30', value: 38.7 },
        { time: '10:40', value: 38.0 },
        { time: '10:50', value: 39.0 },
        { time: '11:00', value: 39.6 },
        { time: '11:10', value: 38.9 },
      ],
    },
    pressure: {
      title: '압력(MPa)',
      min: 0.8,
      max: 1.3,
      points: [
        { time: '10:00', value: 1.02 },
        { time: '10:10', value: 1.05 },
        { time: '10:20', value: 1.09 },
        { time: '10:30', value: 1.08 },
        { time: '10:40', value: 1.12 },
        { time: '10:50', value: 1.1 },
        { time: '11:00', value: 1.07 },
        { time: '11:10', value: 1.08 },
      ],
    },
    rfPower: {
      title: 'RF 파워(kW)',
      min: 8,
      max: 16,
      points: [
        { time: '10:00', value: 11.8 },
        { time: '10:10', value: 12.4 },
        { time: '10:20', value: 13.1 },
        { time: '10:30', value: 12.9 },
        { time: '10:40', value: 13.6 },
        { time: '10:50', value: 13.3 },
        { time: '11:00', value: 13.7 },
        { time: '11:10', value: 13.2 },
      ],
    },
    gasFlow: {
      title: '가스 유량(sccm)',
      min: 180,
      max: 280,
      points: [
        { time: '10:00', value: 232 },
        { time: '10:10', value: 238 },
        { time: '10:20', value: 241 },
        { time: '10:30', value: 247 },
        { time: '10:40', value: 252 },
        { time: '10:50', value: 249 },
        { time: '11:00', value: 244 },
        { time: '11:10', value: 245 },
      ],
    },
  },
  checklist: [
    {
      id: 'pressure-valve',
      label: '라인 정지 없이 압력 밸브 상태 확인',
      checked: false,
    },
    {
      id: 'sensor-baseline',
      label: '센서 기준값 재측정',
      checked: false,
    },
    {
      id: 'register-log',
      label: '점검 결과를 작업 로그에 등록',
      checked: false,
    },
    {
      id: 'rerun-diagnosis',
      label: '동일 알림 재발 시 검증·재진단 실행',
      checked: false,
    },
  ],
}
