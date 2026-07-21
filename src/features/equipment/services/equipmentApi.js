import { fetchFactoryScene } from '@/features/dashboard/services/telemetryApi'
import { getAcceptLanguage } from '@/features/i18n/services/localePreference'
import { fetchNotificationPage } from '@/features/notification/services/notificationApi'

const alarmMessageCache = new Map()

function getMetricValue(equipment, metricId) {
  return equipment.metrics.find((metric) => metric.id === metricId)?.value ?? '-'
}

function createEquipmentRow(equipment, notificationMessageByEquipmentId = new Map()) {
  return {
    alarm: equipment.alarmCode ?? '-',
    equipmentId: equipment.equipmentCode ?? equipment.sequence ?? equipment.id,
    gasFlow: getMetricValue(equipment, 'gasFlow'),
    id: equipment.id,
    lineId: equipment.lineId,
    name: equipment.name,
    note: notificationMessageByEquipmentId.get(equipment.id) ?? '',
    pressure: getMetricValue(equipment, 'pressure'),
    rfPower: getMetricValue(equipment, 'rfPower'),
    status: equipment.status.tone,
    temperature: getMetricValue(equipment, 'temperature'),
    type: equipment.type,
  }
}

export function createEquipmentListGroups(scene, notificationMessageByEquipmentId = new Map()) {
  return scene.lineGroups.map((line) => ({
    date: line.label,
    id: line.id,
    rows: line.equipment.map((equipment) =>
      createEquipmentRow(equipment, notificationMessageByEquipmentId),
    ),
  }))
}

async function fetchCurrentAlarmMessages(scene) {
  const locale = getAcceptLanguage()
  const pendingAlarmByEquipmentId = new Map(
    scene.equipmentList
      .filter((equipment) => equipment.alarmCode && equipment.alarmCode !== '-')
      .map((equipment) => [equipment.id, equipment.alarmCode]),
  )
  const notificationMessageByEquipmentId = new Map()
  let pageNumber = 1

  pendingAlarmByEquipmentId.forEach((alarmCode, equipmentId) => {
    const cachedMessage = alarmMessageCache.get(`${locale}:${equipmentId}:${alarmCode}`)

    if (cachedMessage) {
      notificationMessageByEquipmentId.set(equipmentId, cachedMessage)
      pendingAlarmByEquipmentId.delete(equipmentId)
    }
  })

  while (pendingAlarmByEquipmentId.size) {
    const page = await fetchNotificationPage({
      limit: 50,
      page: pageNumber,
      unreadOnly: false,
    })

    page.items.forEach((notification) => {
      const alarmCode = pendingAlarmByEquipmentId.get(notification.equipmentId)

      if (alarmCode && alarmCode === notification.code && notification.message) {
        notificationMessageByEquipmentId.set(notification.equipmentId, notification.message)
        alarmMessageCache.set(
          `${locale}:${notification.equipmentId}:${notification.code}`,
          notification.message,
        )
        pendingAlarmByEquipmentId.delete(notification.equipmentId)
      }
    })

    if (!page.hasMore || page.page >= page.totalPages) {
      break
    }

    pageNumber = page.page + 1
  }

  return notificationMessageByEquipmentId
}

export async function fetchEquipmentListPageData() {
  const scene = await fetchFactoryScene()
  let notificationMessageByEquipmentId = new Map()

  try {
    notificationMessageByEquipmentId = await fetchCurrentAlarmMessages(scene)
  } catch {
    // Equipment data remains usable even when notification history is temporarily unavailable.
  }

  return {
    groups: createEquipmentListGroups(scene, notificationMessageByEquipmentId),
    lineGroups: scene.lineGroups,
  }
}
