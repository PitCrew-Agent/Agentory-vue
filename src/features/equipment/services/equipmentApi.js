import { fetchFactoryScene } from '@/features/dashboard/services/telemetryApi'

const noteByStatusTone = {
  danger: '긴급 점검 필요',
  normal: '-',
  warning: '주의 관찰',
}

function getMetricValue(equipment, metricId) {
  return equipment.metrics.find((metric) => metric.id === metricId)?.value ?? '-'
}

function createEquipmentRow(equipment) {
  return {
    alarm: equipment.alarmCode ?? '-',
    equipmentId: equipment.equipmentCode ?? equipment.sequence ?? equipment.id,
    gasFlow: getMetricValue(equipment, 'gasFlow'),
    id: equipment.id,
    lineId: equipment.lineId,
    name: equipment.name,
    note: noteByStatusTone[equipment.status.tone] ?? '-',
    pressure: getMetricValue(equipment, 'pressure'),
    rfPower: getMetricValue(equipment, 'rfPower'),
    status: equipment.status.tone,
    temperature: getMetricValue(equipment, 'temperature'),
    type: equipment.type,
  }
}

export function createEquipmentListGroups(scene) {
  return scene.lineGroups.map((line) => ({
    date: line.label,
    id: line.id,
    rows: line.equipment.map(createEquipmentRow),
  }))
}

export async function fetchEquipmentListPageData() {
  const scene = await fetchFactoryScene()

  return {
    groups: createEquipmentListGroups(scene),
    lineGroups: scene.lineGroups,
  }
}
