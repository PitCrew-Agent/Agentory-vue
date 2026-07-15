import { normalizeWorkLogStatus } from '@/constants/workLogStatus'
import { http } from '@/services/api/http'

function normalizeNumber(value) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : null
}

function normalizeDeviation(item = {}) {
  return {
    baseline: normalizeNumber(item.baseline),
    delta: normalizeNumber(item.delta),
    incident: normalizeNumber(item.incident),
    label: String(item.label ?? item.metric ?? '').trim(),
    metric: String(item.metric ?? '').trim(),
    unit: String(item.unit ?? '').trim(),
  }
}

function normalizeCitation(item = {}) {
  return {
    docId: String(item.doc_id ?? '').trim(),
    excerpt: String(item.excerpt ?? '').trim(),
    score: normalizeNumber(item.score),
  }
}

function normalizeWorkLogDraft(draft = {}) {
  return {
    endedAt: draft.ended_at ?? null,
    plan: String(draft.plan ?? '').trim(),
    sourceNotificationId: draft.source_notification_id ?? null,
    startedAt: draft.started_at ?? '',
    status: normalizeWorkLogStatus(draft.status),
    workType: String(draft.work_type ?? '').trim(),
  }
}

export function normalizeIncidentPlan(plan = {}) {
  return {
    alarmCode: String(plan.alarm_code ?? '').trim(),
    citations: (plan.citations ?? []).map(normalizeCitation),
    deviations: (plan.deviations ?? []).map(normalizeDeviation),
    equipmentId: String(plan.equipment_id ?? '').trim(),
    notificationId: plan.notification_id ?? null,
    occurredAt: plan.occurred_at ?? '',
    summary: String(plan.summary ?? '').trim(),
    warnings: (plan.warnings ?? []).map((warning) => String(warning).trim()).filter(Boolean),
    workLogDraft: normalizeWorkLogDraft(plan.work_log_draft),
  }
}

export async function createIncidentPlanRequest(notificationId) {
  const response = await http.post('/api/v1/incident-plans', {
    notification_id: Number(notificationId),
  })

  return normalizeIncidentPlan(response)
}
