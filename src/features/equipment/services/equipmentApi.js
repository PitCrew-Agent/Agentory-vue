import { fetchFactoryScene } from '@/features/dashboard/services/telemetryApi'
import { getAcceptLanguage } from '@/features/i18n/services/localePreference'
import { fetchNotificationPage } from '@/features/notification/services/notificationApi'

const alarmMessageCache = new Map()

const ALARM_MESSAGE_PAGE_SIZE = 50
// 활성 알람은 최신 알림이므로 최근 페이지만 조회한다. 담당 라인 밖(서버 라인 스코핑) 알람은
// 라인 스코핑된 /notifications 에 존재하지 않으므로, 전체 순회 대신 상한을 둬 요청 폭주를 막는다.
const MAX_ALARM_MESSAGE_PAGES = 3

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

  // 성공/실패(네거티브) 캐시를 먼저 반영해 조회 대상을 줄인다. 빈 문자열은 "스코프 밖/부재"로 공란 처리.
  pendingAlarmByEquipmentId.forEach((alarmCode, equipmentId) => {
    const cachedMessage = alarmMessageCache.get(`${locale}:${equipmentId}:${alarmCode}`)

    if (cachedMessage === undefined) {
      return
    }

    if (cachedMessage) {
      notificationMessageByEquipmentId.set(equipmentId, cachedMessage)
    }

    pendingAlarmByEquipmentId.delete(equipmentId)
  })

  if (!pendingAlarmByEquipmentId.size) {
    return notificationMessageByEquipmentId
  }

  const applyNotifications = (items = []) => {
    items.forEach((notification) => {
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
  }

  const firstPage = await fetchNotificationPage({
    limit: ALARM_MESSAGE_PAGE_SIZE,
    page: 1,
    unreadOnly: false,
  })

  applyNotifications(firstPage.items)

  // 최근 페이지만 병렬로 상한 조회한다(순차 전체 순회 금지).
  const lastPage = Math.min(MAX_ALARM_MESSAGE_PAGES, firstPage.totalPages || 1)

  if (pendingAlarmByEquipmentId.size && lastPage > 1) {
    const remainingPages = await Promise.all(
      Array.from({ length: lastPage - 1 }, (_, index) =>
        fetchNotificationPage({
          limit: ALARM_MESSAGE_PAGE_SIZE,
          page: index + 2,
          unreadOnly: false,
        }),
      ),
    )

    remainingPages.forEach((page) => applyNotifications(page.items))
  }

  // 상한 내에서 못 찾은 알람은 네거티브 캐시로 남겨 폴링마다 재순회하지 않는다.
  // 새 알람은 alarm_code 가 달라 새 키로 다시 조회된다.
  pendingAlarmByEquipmentId.forEach((alarmCode, equipmentId) => {
    alarmMessageCache.set(`${locale}:${equipmentId}:${alarmCode}`, '')
  })

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
