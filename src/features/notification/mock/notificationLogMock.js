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
    message: '컨베이어 02 진동 초과',
    readStatus: 'unread',
  },
  {
    code: 'ERR-402',
    message: '프레스 02 압력 편차',
    readStatus: 'read',
  },
  {
    code: 'ERR-403',
    message: '제어반 02 통신 끊김',
    readStatus: 'unread',
  },
  {
    code: 'OFFLINE',
    message: '프레스 01 안전 커버 확인',
    readStatus: 'read',
  },
  {
    code: 'WARN-210',
    message: '로봇 암 01 온도 상승',
    readStatus: 'read',
  },
  {
    code: 'WARN-208',
    message: 'A 라인 가스 유량 저하',
    readStatus: 'unread',
  },
]

function compactDate(date) {
  return date.replaceAll('-', '')
}

function compactCode(code) {
  return code.toLowerCase().replaceAll('-', '')
}

export const notificationLogGroups = notificationDates.map((date, dateIndex) => ({
  date,
  id: date,
  rows: notificationTemplates.map((template, templateIndex) => ({
    ...template,
    id: `notification-${compactDate(date)}-${compactCode(template.code)}`,
    occurredAt: `${date} ${String(10 + (dateIndex % 3)).padStart(2, '0')}:${String(
      templateIndex * 7 + 2,
    ).padStart(2, '0')}`,
  })),
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
