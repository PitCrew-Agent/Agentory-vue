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
    return (
      String(value ?? '')
        .split('T')
        .at(-1)
        ?.slice(0, 5) ?? ''
    )
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function toLocalDateTime(date, time) {
  return `${date}T${time || '00:00'}:00`
}

function getWorkPlan(log) {
  return String(log.workPlan ?? log.task ?? '').trim()
}

function getWorkCompletion(log) {
  return String(log.workRecord ?? '').trim()
}

function isCompletionStatus(status) {
  return normalizeWorkLogStatus(status) === 'complete'
}

function createWorkLogPayload(log) {
  const status = isCompletionStatus(log.status) ? 'progress' : log.status

  return {
    ended_at: log.endedDate ? toLocalDateTime(log.endedDate, log.endedTime) : null,
    plan: getWorkPlan(log),
    source_notification_id: log.sourceNotificationId ?? null,
    started_at: toLocalDateTime(log.date, log.time),
    status: toWorkLogStatusLabel(status),
    work_type: log.workType || '기타',
  }
}

function createWorkLogUpdatePayload(log) {
  const payload = {
    ended_at: log.endedDate ? toLocalDateTime(log.endedDate, log.endedTime) : null,
    plan: getWorkPlan(log),
    started_at: toLocalDateTime(log.date, log.time),
    work_type: log.workType || '기타',
  }

  if (!isCompletionStatus(log.status) && !isCompletionStatus(log.originalStatus)) {
    payload.status = toWorkLogStatusLabel(log.status)
  }

  return payload
}

async function completeWorkLogRequest(logId, completion) {
  const normalizedCompletion = String(completion ?? '').trim()

  if (!normalizedCompletion) {
    throw new Error('Work log completion is required')
  }

  return http.post(`/api/v1/work-logs/${encodeURIComponent(logId)}/complete`, {
    completion: normalizedCompletion,
  })
}

function normalizeWorkLogItems(items) {
  return Array.isArray(items) ? items : []
}

function normalizeWorkLog(item) {
  const date = formatDate(item.started_at)
  const endedDate = item.ended_at ? formatDate(item.ended_at) : ''
  const workPlan = String(item.plan ?? '').trim()
  const workRecord = String(item.completion ?? '').trim()

  return {
    alarmCode: item.alarm_code ?? '',
    completedAt: item.completed_at ?? null,
    date,
    endedDate,
    endedTime: item.ended_at ? formatTime(item.ended_at) : '',
    equipmentCode: item.equipment_id ?? '',
    equipmentId: item.equipment_id ?? '',
    id: item.id,
    lineId: '',
    operator: item.worker_name,
    sourceNotificationId: item.source_notification_id ?? null,
    status: normalizeWorkLogStatus(item.status),
    task: workRecord || workPlan,
    time: formatTime(item.started_at),
    workPlan,
    workRecord,
    workType: item.work_type ?? '기타',
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

  return groupWorkLogs(normalizeWorkLogItems(workLogs))
}

export async function createWorkLogRequest(log) {
  const createdLog = await http.post('/api/v1/work-logs', createWorkLogPayload(log))

  if (isCompletionStatus(log.status)) {
    const completedLog = await completeWorkLogRequest(createdLog.id, getWorkCompletion(log))

    return normalizeWorkLog(completedLog)
  }

  return normalizeWorkLog(createdLog)
}

export async function updateWorkLogRequest(log) {
  const updatedLog = await http.patch(
    `/api/v1/work-logs/${encodeURIComponent(log.id)}`,
    createWorkLogUpdatePayload(log),
  )

  if (isCompletionStatus(log.status) && !isCompletionStatus(log.originalStatus)) {
    const completedLog = await completeWorkLogRequest(updatedLog.id, getWorkCompletion(log))

    return normalizeWorkLog(completedLog)
  }

  return normalizeWorkLog(updatedLog)
}

export function deleteWorkLogRequest(logId) {
  return http.remove(`/api/v1/work-logs/${encodeURIComponent(logId)}`)
}
