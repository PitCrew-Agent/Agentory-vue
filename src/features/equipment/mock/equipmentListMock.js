const lineDefinitions = [
  { id: 'a-line', label: 'A 라인' },
  { id: 'b-line', label: 'B 라인' },
  { id: 'c-line', label: 'C 라인' },
  { id: 'd-line', label: 'D 라인' },
  { id: 'e-line', label: 'E 라인' },
  { id: 'f-line', label: 'F 라인' },
]

const equipmentTemplates = [
  { alarm: '-', name: '프레스', status: 'normal', type: 'PRESS' },
  { alarm: 'ERR-402', name: '프레스', status: 'warning', type: 'PRESS' },
  { alarm: 'ERR-501', name: '컨베이어', status: 'danger', type: 'CONVEYOR' },
  { alarm: '-', name: '로봇암', status: 'normal', type: 'ROBOT' },
  { alarm: 'OFFLINE', name: '제어반', status: 'offline', type: 'CONTROL' },
  { alarm: 'WARN-210', name: '검사기', status: 'warning', type: 'INSPECTION' },
]

function createEquipment(line, lineIndex, template, templateIndex) {
  const sequence = lineIndex * equipmentTemplates.length + templateIndex + 1
  const paddedSequence = String(sequence).padStart(3, '0')
  const lineCode = line.label.slice(0, 1)

  return {
    alarm: template.alarm,
    equipmentId: `EQP-${paddedSequence}`,
    gasFlow: `${235 + lineIndex * 4 + templateIndex * 3}`,
    id: `eqp-${line.id}-${templateIndex + 1}`,
    name: `${template.name}-${lineCode}${String(templateIndex + 1).padStart(2, '0')}`,
    note: template.status === 'offline' ? '점검 필요' : '-',
    pressure: `${(1.02 + templateIndex * 0.03).toFixed(2)}`,
    rfPower: `${(12.4 + lineIndex * 0.2 + templateIndex * 0.1).toFixed(1)}`,
    status: template.status,
    temperature: `${(42.2 + lineIndex * 0.4 + templateIndex * 0.3).toFixed(1)}`,
    type: template.type,
  }
}

export const equipmentListGroups = lineDefinitions.map((line, lineIndex) => ({
  date: line.label,
  id: line.id,
  rows: equipmentTemplates.map((template, templateIndex) =>
    createEquipment(line, lineIndex, template, templateIndex),
  ),
}))

export const equipmentStatusMap = {
  danger: {
    label: '위험',
    tone: 'danger',
  },
  normal: {
    label: '정상',
    tone: 'normal',
  },
  offline: {
    label: '오프라인',
    tone: 'offline',
  },
  warning: {
    label: '주의',
    tone: 'warning',
  },
}
