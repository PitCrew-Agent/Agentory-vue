import { factoryEquipmentList } from '@/features/dashboard/mock/factory3dMock'

const notificationDates = [
  '2026-07-06',
  '2026-07-05',
  '2026-07-04',
  '2026-07-03',
  '2026-07-02',
  '2026-07-01',
  '2026-06-30',
  '2026-06-29',
]

const notificationTemplates = [
  {
    code: 'ERR-501',
    message: (equipment) => `${equipment.name} RF 파워 위험 기준 초과`,
    readStatus: 'unread',
  },
  {
    code: 'ERR-402',
    message: (equipment) => `${equipment.name} 압력 편차 감지`,
    readStatus: 'read',
  },
  {
    code: 'ERR-403',
    message: (equipment) => `${equipment.name} 제어 통신 끊김`,
    readStatus: 'unread',
  },
  {
    code: 'OFFLINE',
    message: (equipment) => `${equipment.name} 오프라인 상태 확인 필요`,
    readStatus: 'read',
  },
  {
    code: 'WARN-210',
    message: (equipment) => `${equipment.name} 온도 상승 추세`,
    readStatus: 'read',
  },
  {
    code: 'WARN-208',
    message: (equipment) => `${equipment.lineLabel} 가스 유량 저하`,
    readStatus: 'unread',
  },
]

function compactDate(date) {
  return date.replaceAll('-', '')
}

function compactCode(code) {
  return code.toLowerCase().replaceAll('-', '')
}

function getEquipment(index) {
  return factoryEquipmentList[index % factoryEquipmentList.length]
}

export const notificationLogGroups = notificationDates.map((date, dateIndex) => ({
  date,
  id: date,
  rows: notificationTemplates.map((template, templateIndex) => {
    const equipment = getEquipment(dateIndex * notificationTemplates.length + templateIndex)

    return {
      code: template.code,
      equipmentCode: equipment.equipmentCode,
      equipmentId: equipment.id,
      id: `notification-${compactDate(date)}-${compactCode(template.code)}`,
      lineId: equipment.lineId,
      message: template.message(equipment),
      occurredAt: `${date} ${String(10 + (dateIndex % 3)).padStart(2, '0')}:${String(
        templateIndex * 7 + 2,
      ).padStart(2, '0')}`,
      readStatus: template.readStatus,
    }
  }),
}))

export const notificationReadStatusMap = {
  read: {
    label: '읽음',
    tone: 'read',
  },
  unread: {
    label: '읽지 않음',
    tone: 'unread',
  },
}
