const statusCatalog = {
  danger: {
    label: '위험',
    tone: 'danger',
  },
  normal: {
    label: '양호',
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

const metricConfigs = {
  gasFlow: {
    icon: 'gasFlow',
    label: '가스유량',
    max: 300,
    min: 180,
    precision: 0,
    unit: 'sccm',
  },
  pressure: {
    icon: 'pressure',
    label: '압력',
    max: 62,
    min: 18,
    precision: 1,
    unit: 'mTorr',
  },
  rfPower: {
    icon: 'rfPower',
    label: 'RF 파워',
    max: 18,
    min: 8,
    precision: 1,
    unit: 'kW',
  },
  temperature: {
    icon: 'temperature',
    label: '온도',
    max: 72,
    min: 34,
    precision: 1,
    unit: '°C',
  },
}

const factoryLineRows = [
  {
    areaType: 'photo-etch-bay',
    code: 'A',
    description: '노광 이후 식각 공정 중심 bay',
    id: 'a-line',
    label: 'A 라인',
    owner: '김억산',
    sortOrder: 1,
  },
  {
    areaType: 'deposition-bay',
    code: 'B',
    description: '증착과 박막 계측 중심 bay',
    id: 'b-line',
    label: 'B 라인',
    owner: '정하린',
    sortOrder: 2,
  },
  {
    areaType: 'wet-clean-bay',
    code: 'C',
    description: '세정과 열처리 준비 bay',
    id: 'c-line',
    label: 'C 라인',
    owner: '이준호',
    sortOrder: 3,
  },
  {
    areaType: 'cmp-metrology-bay',
    code: 'D',
    description: 'CMP와 후공정 계측 bay',
    id: 'd-line',
    label: 'D 라인',
    owner: '박서연',
    sortOrder: 4,
  },
  {
    areaType: 'implant-anneal-bay',
    code: 'E',
    description: '이온주입과 열처리 bay',
    id: 'e-line',
    label: 'E 라인',
    owner: '최민재',
    sortOrder: 5,
  },
  {
    areaType: 'inspection-sort-bay',
    code: 'F',
    description: '검사와 웨이퍼 분류 bay',
    id: 'f-line',
    label: 'F 라인',
    owner: '오지훈',
    sortOrder: 6,
  },
]

const equipmentLayoutPresets = {
  north: { rotationY: 0, z: 1.65 },
  south: { rotationY: Math.PI, z: -1.65 },
}

const shapeByType = {
  ASHING: 'etch',
  CMP: 'deposition',
  DEPOSITION: 'deposition',
  DIFFUSION_FURNACE: 'deposition',
  ETCH: 'etch',
  FOUP_LOADPORT: 'foupLoader',
  ION_IMPLANT: 'etch',
  LITHOGRAPHY: 'metrology',
  LOADPORT: 'foupLoader',
  METROLOGY: 'metrology',
  SORTER: 'transferRobot',
  STOCKER: 'foupLoader',
  WET_CLEAN: 'deposition',
}

const equipmentRowsByLine = {
  'a-line': [
    ['stocker', 'FOUP 스토커', 'STOCKER', 'normal', -4.8, 'north'],
    ['loadport', '로드포트', 'LOADPORT', 'normal', -4.2, 'south'],
    ['lithography', '노광장비', 'LITHOGRAPHY', 'warning', -2.6, 'south'],
    ['etch-main', '식각장비', 'ETCH', 'normal', -1.0, 'north'],
    ['ash', '애싱장비', 'ASHING', 'danger', 1.5, 'north'],
    ['metrology', '검사장비', 'METROLOGY', 'normal', 2.7, 'south'],
    ['sorter', '웨이퍼 소터', 'SORTER', 'normal', 4.45, 'north'],
  ],
  'b-line': [
    ['stocker', 'FOUP 스토커', 'STOCKER', 'normal', -4.7, 'north'],
    ['loadport', '로드포트', 'LOADPORT', 'normal', -4.1, 'south'],
    ['deposition-1', 'PVD 증착장비', 'DEPOSITION', 'normal', -2.7, 'north'],
    ['deposition-2', 'CVD 증착장비', 'DEPOSITION', 'warning', -1.4, 'south'],
    ['metrology-thinfilm', '박막 검사장비', 'METROLOGY', 'normal', 1.6, 'south'],
    ['etch-clean', '프리클린 장비', 'WET_CLEAN', 'normal', 2.8, 'north'],
    ['sorter', '웨이퍼 소터', 'SORTER', 'offline', 4.4, 'north'],
  ],
  'c-line': [
    ['stocker', 'FOUP 스토커', 'STOCKER', 'normal', -4.6, 'north'],
    ['wet-clean-1', '세정장비', 'WET_CLEAN', 'normal', -3.1, 'north'],
    ['wet-clean-2', '메가소닉 세정장비', 'WET_CLEAN', 'warning', -1.8, 'south'],
    ['diffusion', '확산로', 'DIFFUSION_FURNACE', 'normal', -0.25, 'north'],
    ['metrology', '표면 검사장비', 'METROLOGY', 'normal', 2.3, 'south'],
    ['loadport', '로드포트', 'LOADPORT', 'normal', 4.0, 'south'],
  ],
  'd-line': [
    ['stocker', 'FOUP 스토커', 'STOCKER', 'normal', -4.8, 'north'],
    ['cmp-1', 'CMP 장비', 'CMP', 'warning', -3.2, 'south'],
    ['cmp-2', 'CMP 장비', 'CMP', 'normal', -1.9, 'north'],
    ['post-clean', '후세정장비', 'WET_CLEAN', 'normal', -0.45, 'south'],
    ['metrology-1', '막두께 검사장비', 'METROLOGY', 'normal', 2.0, 'south'],
    ['metrology-2', '결함 검사장비', 'METROLOGY', 'danger', 3.2, 'north'],
    ['sorter', '웨이퍼 소터', 'SORTER', 'normal', 4.6, 'north'],
  ],
  'e-line': [
    ['stocker', 'FOUP 스토커', 'STOCKER', 'normal', -4.6, 'north'],
    ['implant-1', '이온주입장비', 'ION_IMPLANT', 'warning', -3.1, 'south'],
    ['implant-2', '이온주입장비', 'ION_IMPLANT', 'normal', -1.8, 'north'],
    ['anneal', '어닐링 장비', 'DIFFUSION_FURNACE', 'normal', -0.4, 'south'],
    ['metrology-dose', '도즈 검사장비', 'METROLOGY', 'normal', 2.45, 'south'],
    ['loadport', '로드포트', 'LOADPORT', 'offline', 4.1, 'south'],
  ],
  'f-line': [
    ['stocker', 'FOUP 스토커', 'STOCKER', 'normal', -4.7, 'north'],
    ['sorter-1', '웨이퍼 소터', 'SORTER', 'normal', -3.3, 'north'],
    ['inspection-1', '광학 검사장비', 'METROLOGY', 'warning', -1.9, 'south'],
    ['inspection-2', '결함 리뷰장비', 'METROLOGY', 'normal', -0.6, 'north'],
    ['inspection-3', '전기 검사장비', 'METROLOGY', 'danger', 2.1, 'south'],
    ['loadport', '로드포트', 'LOADPORT', 'normal', 3.55, 'south'],
    ['out-stocker', '출하 스토커', 'STOCKER', 'normal', 4.7, 'north'],
  ],
}

function createFactoryEquipmentRows() {
  return factoryLineRows.flatMap((line) => {
    const configs = equipmentRowsByLine[line.id] ?? []

    return configs.map(([slotId, label, type, statusTone, x, zone], equipmentIndex) => {
      const layout = equipmentLayoutPresets[zone]
      const sequence = line.sortOrder * 100 + equipmentIndex + 1
      const lineCode = line.code

      return {
        bayZone: zone,
        displayOrder: equipmentIndex + 1,
        equipmentCode: `EQP-${lineCode}${String(equipmentIndex + 1).padStart(2, '0')}`,
        id: `factory-${line.id}-${slotId}`,
        inspectedAt: `2026-07-${String(1 + ((line.sortOrder + equipmentIndex) % 6)).padStart(
          2,
          '0',
        )}`,
        lineId: line.id,
        metricBase: {
          gasFlow: 232 + line.sortOrder * 5 + equipmentIndex * 3,
          pressure: Number((32 + equipmentIndex * 1.8 + line.sortOrder * 1.1).toFixed(1)),
          rfPower: Number((11.8 + line.sortOrder * 0.22 + equipmentIndex * 0.16).toFixed(1)),
          temperature: Number((39.6 + line.sortOrder * 0.55 + equipmentIndex * 0.48).toFixed(1)),
        },
        name: `${label}-${lineCode}${String(equipmentIndex + 1).padStart(2, '0')}`,
        owner: line.owner,
        ownerDepartment: `Main-Tech ${line.sortOrder}`,
        ownerDisplay: `Main-Tech ${line.sortOrder} · ${line.owner}`,
        position: {
          x,
          y: 0,
          z: layout.z,
        },
        processGroup: line.areaType,
        rotationY: layout.rotationY,
        sequence: `EQP-${String(sequence).padStart(3, '0')}`,
        shape: shapeByType[type],
        statusTone,
        type,
        updatedAt: {
          date: '2026-07-07',
          time: `${String(9 + line.sortOrder).padStart(2, '0')}:${String(equipmentIndex * 7).padStart(
            2,
            '0',
          )}:00`,
        },
      }
    })
  })
}

export const factory3dDataset = {
  equipment: createFactoryEquipmentRows(),
  lines: factoryLineRows,
}

const statusMetricOffset = {
  danger: 8,
  normal: 0,
  offline: -4,
  warning: 4,
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function formatMetricValue(value, precision) {
  return precision === 0 ? `${Math.round(value)}` : value.toFixed(precision)
}

function createChart(metricId, currentValue, rowIndex) {
  const config = metricConfigs[metricId]
  const points = Array.from({ length: 10 }, (_, pointIndex) => {
    const wave = Math.sin((pointIndex + rowIndex) * 0.72)
    const trend = (pointIndex - 8) * 0.12
    const range = config.max - config.min
    const value = clamp(currentValue + wave * range * 0.035 + trend, config.min, config.max)

    return {
      time: `${String(9 + Math.floor(pointIndex / 2)).padStart(2, '0')}:${
        pointIndex % 2 === 0 ? '00' : '30'
      }`,
      value: Number(value.toFixed(config.precision)),
    }
  })

  points[points.length - 1] = {
    ...points.at(-1),
    value: Number(currentValue.toFixed(config.precision)),
  }

  return {
    max: config.max,
    min: config.min,
    points,
    title: `${config.label}(${config.unit})`,
  }
}

function createMetrics(equipmentRow, rowIndex) {
  const offset = statusMetricOffset[equipmentRow.statusTone]
  const values = {
    gasFlow: clamp(equipmentRow.metricBase.gasFlow + offset * 2, 180, 300),
    pressure: clamp(equipmentRow.metricBase.pressure + offset * 0.35, 18, 62),
    rfPower: clamp(equipmentRow.metricBase.rfPower + offset * 0.08, 8, 18),
    temperature: clamp(equipmentRow.metricBase.temperature + offset, 34, 72),
  }

  const metrics = Object.entries(metricConfigs).map(([metricId, config]) => ({
    icon: config.icon,
    id: metricId,
    label: config.label,
    unit: config.unit,
    value: formatMetricValue(values[metricId], config.precision),
  }))

  const charts = Object.fromEntries(
    Object.keys(metricConfigs).map((metricId) => [
      metricId,
      createChart(metricId, values[metricId], rowIndex),
    ]),
  )

  return { charts, metrics }
}

function createChecklist(equipmentRow, line) {
  return [
    {
      checked: false,
      id: `${equipmentRow.id}-load-port`,
      label: `${equipmentRow.name} 로드포트 체결 상태 확인`,
    },
    {
      checked: false,
      id: `${equipmentRow.id}-utility`,
      label: `${line.label} 유틸리티 연결 상태 확인`,
    },
    {
      checked: false,
      id: `${equipmentRow.id}-log`,
      label: '점검 결과를 작업 로그에 등록',
    },
    {
      checked: false,
      id: `${equipmentRow.id}-diagnosis`,
      label: '동일 알림 재발 여부 확인',
    },
  ]
}

function mapEquipmentRow(equipmentRow, line, rowIndex) {
  const { charts, metrics } = createMetrics(equipmentRow, rowIndex)

  return {
    bayZone: equipmentRow.bayZone,
    charts,
    checklist: createChecklist(equipmentRow, line),
    equipmentCode: equipmentRow.equipmentCode,
    id: equipmentRow.id,
    inspectedAt: equipmentRow.inspectedAt,
    lineId: line.id,
    lineLabel: line.label,
    metrics,
    name: equipmentRow.name,
    owner: equipmentRow.owner,
    ownerDepartment: equipmentRow.ownerDepartment,
    ownerDisplay: equipmentRow.ownerDisplay,
    position: {
      x: equipmentRow.position.x,
      y: equipmentRow.position.y,
      z: equipmentRow.position.z,
    },
    processGroup: equipmentRow.processGroup,
    rotationY: equipmentRow.rotationY,
    sequence: equipmentRow.sequence,
    shape: equipmentRow.shape,
    status: statusCatalog[equipmentRow.statusTone],
    type: equipmentRow.type,
    updatedAt: equipmentRow.updatedAt,
  }
}

export function createFactory3dScene(dataset = factory3dDataset) {
  const lineGroups = dataset.lines
    .toSorted((first, second) => first.sortOrder - second.sortOrder)
    .map((line) => ({
      ...line,
      equipment: dataset.equipment
        .filter((equipment) => equipment.lineId === line.id)
        .toSorted((first, second) => first.displayOrder - second.displayOrder)
        .map((equipment, equipmentIndex) => mapEquipmentRow(equipment, line, equipmentIndex)),
    }))

  const equipmentList = lineGroups.flatMap((line) => line.equipment)
  const statusSummary = ['normal', 'warning', 'danger', 'offline'].map((statusTone) => ({
    count: equipmentList.filter((equipment) => equipment.status.tone === statusTone).length,
    id: statusTone,
    label: statusCatalog[statusTone].label,
    tone: statusTone,
  }))

  return {
    defaultEquipmentId: equipmentList[0]?.id ?? '',
    equipmentList,
    lineGroups,
    statusSummary,
  }
}

export function loadFactory3dSceneMock() {
  return Promise.resolve(createFactory3dScene(factory3dDataset))
}

export const factorySceneMock = createFactory3dScene(factory3dDataset)
export const factoryLineGroups = factorySceneMock.lineGroups
export const factoryEquipmentList = factorySceneMock.equipmentList
export const defaultFactoryEquipmentId = factorySceneMock.defaultEquipmentId
export const factoryStatusSummary = factorySceneMock.statusSummary

export function loadEquipmentChecklistMock(equipmentId) {
  const equipment = factorySceneMock.equipmentList.find((item) => item.id === equipmentId)

  return Promise.resolve(equipment?.checklist ?? [])
}
