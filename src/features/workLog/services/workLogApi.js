import { normalizeWorkLogStatus, toWorkLogStatusLabel } from '@/constants/workLogStatus'
import { http } from '@/services/api/http'

function formatDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value ?? '').slice(0, 10)
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function formatTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value ?? '').split('T').at(-1)?.slice(0, 5) ?? ''
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function toLocalDateTime(date, time) {
  return `${date}T${time || '00:00'}:00`
}

function normalizeWorkLog(item) {
  const date = formatDate(item.started_at)

  return {
    date,
    equipmentCode: '',
    equipmentId: '',
    id: item.id,
    lineId: '',
    operator: item.worker_name,
    status: normalizeWorkLogStatus(item.status),
    task: item.content,
    time: formatTime(item.started_at),
  }
}

function groupWorkLogs(items) {
  const groupMap = new Map()

  items.forEach((item) => {
    const row = normalizeWorkLog(item)
    const logs = groupMap.get(row.date) ?? []

    logs.push(row)
    groupMap.set(row.date, logs)
  })

  return [...groupMap.entries()]
    .toSorted(([firstDate], [secondDate]) => secondDate.localeCompare(firstDate))
    .map(([date, logs]) => ({
      date,
      id: date,
      logs: logs.toSorted((first, second) => second.time.localeCompare(first.time)),
    }))
}

export async function fetchWorkLogGroups() {
  const workLogs = await http.get('/api/v1/work-logs')

  return groupWorkLogs(workLogs)
}

export async function createWorkLogRequest(log) {
  const createdLog = await http.post('/api/v1/work-logs', {
    content: log.task.trim(),
    started_at: toLocalDateTime(log.date, log.time),
    status: toWorkLogStatusLabel(log.status),
  })

  return normalizeWorkLog(createdLog)
}
