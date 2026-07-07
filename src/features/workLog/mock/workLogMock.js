import { factoryEquipmentList } from '@/features/dashboard/mock/factory3dMock'

const workLogDates = [
  '2026-07-06',
  '2026-07-05',
  '2026-07-04',
  '2026-07-03',
  '2026-07-02',
  '2026-07-01',
  '2026-06-30',
  '2026-06-29',
]

const workLogTemplates = [
  {
    operator: '이준호',
    status: 'waiting',
    task: (equipment) => `${equipment.name} RF 파워 기준값 재확인`,
    time: '10:30',
  },
  {
    operator: '김도현',
    status: 'complete',
    task: (equipment) => `${equipment.name} 로드포트 체결 상태 확인`,
    time: '09:40',
  },
  {
    operator: '박서연',
    status: 'progress',
    task: (equipment) => `${equipment.name} 챔버 압력 편차 재측정`,
    time: '09:30',
  },
  {
    operator: '최민재',
    status: 'complete',
    task: (equipment) => `${equipment.lineLabel} OHT 인터페이스 연결 상태 확인`,
    time: '08:55',
  },
  {
    operator: '한서윤',
    status: 'waiting',
    task: (equipment) => `${equipment.name} 제어 통신 모듈 재기동`,
    time: '08:20',
  },
  {
    operator: '김도현',
    status: 'progress',
    task: (equipment) => `${equipment.lineLabel} 가스 유량 기준값 확인`,
    time: '07:50',
  },
]

function compactDate(date) {
  return date.replaceAll('-', '')
}

function getEquipment(index) {
  return factoryEquipmentList[index % factoryEquipmentList.length]
}

export const workLogGroups = workLogDates.map((date, dateIndex) => ({
  date,
  id: date,
  logs: workLogTemplates.map((template, templateIndex) => {
    const equipment = getEquipment(dateIndex * workLogTemplates.length + templateIndex)
    const time =
      dateIndex % 2 === 0
        ? template.time
        : `${String(Number(template.time.slice(0, 2)) + 1).padStart(2, '0')}${template.time.slice(2)}`

    return {
      equipmentCode: equipment.equipmentCode,
      equipmentId: equipment.id,
      id: `log-${compactDate(date)}-${template.time.replace(':', '')}-${templateIndex}`,
      lineId: equipment.lineId,
      operator: template.operator,
      status: template.status,
      task: template.task(equipment),
      time,
    }
  }),
}))

export const workLogStatusMap = {
  complete: {
    label: '완료',
    tone: 'complete',
  },
  progress: {
    label: '진행중',
    tone: 'progress',
  },
  waiting: {
    label: '대기',
    tone: 'waiting',
  },
}
