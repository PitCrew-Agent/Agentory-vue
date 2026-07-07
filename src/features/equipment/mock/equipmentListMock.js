import { factorySceneMock } from '@/features/dashboard/mock/factory3dMock'

const alarmCodeByStatus = {
  danger: 'ERR-501',
  normal: '-',
  offline: 'OFFLINE',
  warning: 'WARN-210',
}

const noteByStatus = {
  danger: '긴급 점검 필요',
  normal: '-',
  offline: '통신 확인 필요',
  warning: '주의 관찰',
}

function getMetricValue(equipment, metricId) {
  return equipment.metrics.find((metric) => metric.id === metricId)?.value ?? '-'
}

function createEquipmentRow(equipment) {
  return {
    alarm: alarmCodeByStatus[equipment.status.tone] ?? '-',
    equipmentId: equipment.equipmentCode ?? equipment.sequence,
    gasFlow: getMetricValue(equipment, 'gasFlow'),
    id: equipment.id,
    lineId: equipment.lineId,
    name: equipment.name,
    note: noteByStatus[equipment.status.tone] ?? '-',
    pressure: getMetricValue(equipment, 'pressure'),
    rfPower: getMetricValue(equipment, 'rfPower'),
    status: equipment.status.tone,
    temperature: getMetricValue(equipment, 'temperature'),
    type: equipment.type,
  }
}

export function createEquipmentListGroups(scene = factorySceneMock) {
  return scene.lineGroups.map((line) => ({
    date: line.label,
    id: line.id,
    rows: line.equipment.map(createEquipmentRow),
  }))
}

export function loadEquipmentListMock() {
  return Promise.resolve(createEquipmentListGroups(factorySceneMock))
}

export const equipmentListGroups = createEquipmentListGroups(factorySceneMock)

export const equipmentStatusMap = Object.fromEntries(
  factorySceneMock.statusSummary.map((status) => [
    status.id,
    {
      label: status.label,
      tone: status.tone,
    },
  ]),
)
