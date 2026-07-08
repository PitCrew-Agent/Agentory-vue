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

const workLogStatusValueByLabel = {
  complete: 'complete',
  progress: 'progress',
  waiting: 'waiting',
  대기: 'waiting',
  완료: 'complete',
  진행중: 'progress',
}

export function normalizeWorkLogStatus(status) {
  const normalizedStatus = String(status ?? '').trim()

  return workLogStatusValueByLabel[normalizedStatus] ?? 'waiting'
}

export function toWorkLogStatusLabel(status) {
  return workLogStatusMap[normalizeWorkLogStatus(status)].label
}
