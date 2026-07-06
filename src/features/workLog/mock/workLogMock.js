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
    task: '컨베이어 02 진동 센서 점검',
    time: '10:30',
  },
  {
    operator: '김도현',
    status: 'complete',
    task: '프레스 01 안전 커버 확인',
    time: '09:40',
  },
  {
    operator: '박서연',
    status: 'progress',
    task: '프레스 02 압력 편차 재측정',
    time: '09:30',
  },
  {
    operator: '최민재',
    status: 'complete',
    task: '로봇암 01 그리퍼 토크 확인',
    time: '08:55',
  },
  {
    operator: '한서윤',
    status: 'waiting',
    task: '제어반 02 통신 모듈 재기동',
    time: '08:20',
  },
  {
    operator: '김도현',
    status: 'progress',
    task: 'A 라인 가스 유량 기준값 확인',
    time: '07:50',
  },
]

function compactDate(date) {
  return date.replaceAll('-', '')
}

export const workLogGroups = workLogDates.map((date, dateIndex) => ({
  date,
  id: date,
  logs: workLogTemplates.map((template, templateIndex) => ({
    ...template,
    id: `log-${compactDate(date)}-${template.time.replace(':', '')}-${templateIndex}`,
    time:
      dateIndex % 2 === 0
        ? template.time
        : `${String(Number(template.time.slice(0, 2)) + 1).padStart(2, '0')}${template.time.slice(2)}`,
  })),
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
