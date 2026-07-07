<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import DashboardContentLoader from '@/features/dashboard/components/DashboardContentLoader.vue'
import {
  defaultFactoryEquipmentId,
  factoryLineGroups,
} from '@/features/dashboard/mock/factory3dMock'

const statusSummaryOrder = [
  { id: 'normal', label: '양호' },
  { id: 'warning', label: '주의' },
  { id: 'danger', label: '위험' },
  { id: 'offline', label: '오프라인' },
]

const props = defineProps({
  checklistItems: {
    type: Array,
    default: () => [],
  },
  lines: {
    type: Array,
    default: () => factoryLineGroups,
  },
  selectedEquipmentId: {
    type: String,
    default: defaultFactoryEquipmentId,
  },
})

const emit = defineEmits(['select-equipment'])

const canvasRef = ref(null)
const viewportRef = ref(null)
const canRenderScene = ref(true)
const currentSelectedEquipmentId = ref(props.selectedEquipmentId || defaultFactoryEquipmentId)
const isLineSelectorOpen = ref(false)
const isAlertChecklistOpen = ref(false)
const isLineSceneLoading = ref(false)
const selectedLineId = ref(props.lines[0]?.id ?? '')
const labelItems = ref([])

const selectedLine = computed(
  () => props.lines.find((line) => line.id === selectedLineId.value) ?? props.lines[0],
)

const activeEquipmentList = computed(() => selectedLine.value?.equipment ?? [])

const selectedLineSummary = computed(() =>
  selectedLine.value ? `${selectedLine.value.label} ${activeEquipmentList.value.length}대 설비` : '',
)

const activeStatusSummary = computed(() =>
  statusSummaryOrder.map((status) => ({
    ...status,
    count: activeEquipmentList.value.filter((equipment) => equipment.status.tone === status.id).length,
  })),
)

const equipmentById = computed(() => {
  const entries = props.lines.flatMap((line) =>
    line.equipment.map((equipment) => [equipment.id, equipment]),
  )

  return Object.fromEntries(entries)
})

const selectedEquipment = computed(() => equipmentById.value[currentSelectedEquipmentId.value])

const hasSelectedEquipmentChecklist = computed(() => {
  const equipmentId = selectedEquipment.value?.id

  return (
    Boolean(equipmentId) &&
    props.checklistItems.some(
      (item) => typeof item.id === 'string' && item.id.startsWith(`${equipmentId}-`),
    )
  )
})

const shouldShowAlertChecklist = computed(() => {
  const statusTone = selectedEquipment.value?.status?.tone

  return (
    isAlertChecklistOpen.value &&
    ['warning', 'danger'].includes(statusTone) &&
    hasSelectedEquipmentChecklist.value
  )
})

let animationFrame = 0
let camera
let controls
let equipmentGroup
let floorGroup
let pointerDownPosition = null
let raycaster
let renderer
let resizeObserver
let scene
let selectableObjects = []
let targetFocus = null
let labelLayoutSignature = ''
let lineSceneLoadingTimer = 0
let hasCompletedInitialOverview = false
let hasFocusedEquipmentByInteraction = false
let isLineOverviewFocused = true
let shouldFocusLineOverview = false

const equipmentGroups = new Map()
const labelAnchors = new Map()

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getEquipmentFrontDirection(equipment) {
  return new THREE.Vector3(0, 0, -1).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    equipment.rotationY ?? 0,
  )
}

function getCssToken(tokenName, fallback) {
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim()

  return value || fallback
}

function getScenePalette() {
  return {
    accent: getCssToken('--agentory-color-bg-primary', '#237ce2'),
    danger: getCssToken('--agentory-color-status-danger', '#a40601'),
    dark: getCssToken('--agentory-color-text-primary', '#323232'),
    floor: getCssToken('--agentory-color-bg-app', '#f8f9f6'),
    muted: getCssToken('--agentory-color-bg-muted', '#d9d9d9'),
    normal: getCssToken('--agentory-color-status-normal', '#00ff37'),
    offline: getCssToken('--agentory-color-status-offline', '#d9d9d9'),
    panel: getCssToken('--agentory-color-bg-surface', '#ededed'),
    warning: getCssToken('--agentory-color-status-warning', '#f4c300'),
  }
}

function createStandardMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: options.metalness ?? 0.08,
    roughness: options.roughness ?? 0.58,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  })
}

function addBox(group, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.set(position.x, position.y, position.z)
  group.add(mesh)

  return mesh
}

function addCylinder(group, radius, height, position, material, radialSegments = 32) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, radialSegments),
    material,
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.set(position.x, position.y, position.z)
  group.add(mesh)

  return mesh
}

function addHorizontalCylinder(group, radius, length, position, material, axis = 'x') {
  const mesh = addCylinder(group, radius, length, position, material, 24)

  if (axis === 'x') {
    mesh.rotation.z = Math.PI / 2
  }

  if (axis === 'z') {
    mesh.rotation.x = Math.PI / 2
  }

  return mesh
}

function addSelectionRing(group, palette) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 0.84, 64),
    new THREE.MeshBasicMaterial({
      color: palette.accent,
      opacity: 0.72,
      side: THREE.DoubleSide,
      transparent: true,
    }),
  )
  ring.userData.isSelectionRing = true
  ring.position.y = 0.035
  ring.rotation.x = -Math.PI / 2
  ring.visible = false
  group.add(ring)
  group.userData.selectionRing = ring
}

function registerSelectableMesh(group, equipmentId) {
  group.traverse((child) => {
    if (!child.isMesh || child.userData.isSelectionRing) {
      return
    }

    child.userData.equipmentId = equipmentId
    selectableObjects.push(child)
  })
}

function addToolPort(group, palette, x = 0) {
  const portMaterial = createStandardMaterial(palette.accent, {
    opacity: 0.58,
    transparent: true,
  })
  const beltMaterial = createStandardMaterial(palette.dark, {
    opacity: 0.62,
    transparent: true,
  })

  addBox(group, { x: 0.46, y: 0.26, z: 0.28 }, { x, y: 0.32, z: -0.72 }, portMaterial)
  addBox(group, { x: 0.4, y: 0.08, z: 0.46 }, { x, y: 0.14, z: -1.0 }, beltMaterial)
  addCylinder(group, 0.08, 0.18, { x: x - 0.16, y: 0.52, z: -0.7 }, portMaterial, 18)
  const efemArm = addBox(
    group,
    { x: 0.34, y: 0.05, z: 0.07 },
    { x: x + 0.08, y: 0.58, z: -0.72 },
    portMaterial,
  )
  efemArm.rotation.y = -0.26
}

function createFoupLoaderEquipment(group, palette) {
  const bodyMaterial = createStandardMaterial(palette.panel)
  const accentMaterial = createStandardMaterial(palette.accent)
  const glassMaterial = createStandardMaterial(palette.accent, {
    opacity: 0.28,
    transparent: true,
  })
  const podMaterial = createStandardMaterial(palette.muted, { roughness: 0.42 })

  addBox(group, { x: 1.18, y: 1.02, z: 0.72 }, { x: 0, y: 0.56, z: 0.02 }, bodyMaterial)
  addBox(group, { x: 0.88, y: 0.14, z: 0.78 }, { x: 0, y: 1.16, z: 0.02 }, accentMaterial)
  addBox(group, { x: 0.62, y: 0.4, z: 0.06 }, { x: 0, y: 0.68, z: -0.38 }, glassMaterial)

  ;[-0.34, 0.34].forEach((x) => {
    addCylinder(group, 0.18, 0.28, { x, y: 1.4, z: -0.12 }, podMaterial, 32)
    addBox(group, { x: 0.34, y: 0.16, z: 0.42 }, { x, y: 1.24, z: -0.12 }, podMaterial)
  })

  addToolPort(group, palette)
}

function createEtchEquipment(group, palette) {
  const bodyMaterial = createStandardMaterial(palette.panel)
  const accentMaterial = createStandardMaterial(palette.accent)
  const chamberMaterial = createStandardMaterial(palette.dark, {
    metalness: 0.24,
    opacity: 0.78,
    roughness: 0.36,
    transparent: true,
  })
  const glassMaterial = createStandardMaterial(palette.accent, {
    opacity: 0.32,
    transparent: true,
  })

  addBox(group, { x: 1.3, y: 1.08, z: 0.88 }, { x: 0, y: 0.6, z: 0 }, bodyMaterial)
  addCylinder(group, 0.42, 0.52, { x: -0.26, y: 0.98, z: -0.02 }, chamberMaterial, 48)
  addCylinder(group, 0.34, 0.42, { x: 0.36, y: 0.88, z: -0.02 }, chamberMaterial, 48)
  addBox(group, { x: 0.8, y: 0.2, z: 0.12 }, { x: 0.02, y: 1.3, z: -0.44 }, accentMaterial)
  addBox(group, { x: 0.56, y: 0.36, z: 0.06 }, { x: 0.05, y: 0.58, z: -0.48 }, glassMaterial)
  addHorizontalCylinder(group, 0.035, 1.12, { x: 0.02, y: 1.56, z: 0.44 }, accentMaterial)
  addToolPort(group, palette)
}

function createTransferRobotEquipment(group, palette) {
  const bodyMaterial = createStandardMaterial(palette.panel)
  const accentMaterial = createStandardMaterial(palette.accent, { metalness: 0.12, roughness: 0.38 })
  const darkMaterial = createStandardMaterial(palette.dark, { opacity: 0.84, transparent: true })

  addBox(group, { x: 1.08, y: 0.16, z: 1.18 }, { x: 0, y: 0.13, z: 0 }, darkMaterial)
  addCylinder(group, 0.34, 0.26, { x: 0, y: 0.34, z: 0 }, accentMaterial)
  addCylinder(group, 0.16, 0.72, { x: 0, y: 0.82, z: 0 }, bodyMaterial)

  const shoulder = addBox(group, { x: 1.08, y: 0.14, z: 0.18 }, { x: 0.32, y: 1.16, z: 0 }, accentMaterial)
  shoulder.rotation.z = -0.28
  const forearm = addBox(group, { x: 0.78, y: 0.12, z: 0.16 }, { x: 0.78, y: 1.26, z: 0 }, bodyMaterial)
  forearm.rotation.z = 0.36
  addBox(group, { x: 0.7, y: 0.08, z: 0.5 }, { x: 1.12, y: 1.12, z: -0.28 }, darkMaterial)
  addToolPort(group, palette, -0.28)
  addToolPort(group, palette, 0.34)
}

function createDepositionEquipment(group, palette) {
  const bodyMaterial = createStandardMaterial(palette.panel)
  const accentMaterial = createStandardMaterial(palette.accent)
  const chamberMaterial = createStandardMaterial(palette.muted, {
    metalness: 0.18,
    roughness: 0.34,
  })
  const glassMaterial = createStandardMaterial(palette.accent, {
    opacity: 0.26,
    transparent: true,
  })

  addBox(group, { x: 1.34, y: 1.22, z: 0.86 }, { x: 0, y: 0.68, z: 0 }, bodyMaterial)
  addCylinder(group, 0.3, 0.48, { x: -0.42, y: 1.18, z: 0.12 }, chamberMaterial, 44)
  addCylinder(group, 0.3, 0.48, { x: 0.42, y: 1.18, z: 0.12 }, chamberMaterial, 44)
  addBox(group, { x: 1.0, y: 0.12, z: 0.16 }, { x: 0, y: 1.5, z: -0.36 }, accentMaterial)
  addBox(group, { x: 0.66, y: 0.4, z: 0.06 }, { x: 0, y: 0.72, z: -0.48 }, glassMaterial)
  addToolPort(group, palette)
}

function createMetrologyEquipment(group, palette) {
  const bodyMaterial = createStandardMaterial(palette.panel)
  const accentMaterial = createStandardMaterial(palette.accent)
  const glassMaterial = createStandardMaterial(palette.accent, {
    opacity: 0.3,
    transparent: true,
  })

  addBox(group, { x: 1.2, y: 0.28, z: 0.86 }, { x: 0, y: 0.22, z: 0 }, bodyMaterial)
  addBox(group, { x: 0.16, y: 1.12, z: 0.16 }, { x: -0.5, y: 0.86, z: 0 }, accentMaterial)
  addBox(group, { x: 0.16, y: 1.12, z: 0.16 }, { x: 0.5, y: 0.86, z: 0 }, accentMaterial)
  addBox(group, { x: 1.22, y: 0.18, z: 0.18 }, { x: 0, y: 1.48, z: 0 }, accentMaterial)
  addBox(group, { x: 0.74, y: 0.5, z: 0.08 }, { x: 0, y: 0.86, z: -0.46 }, glassMaterial)
  addHorizontalCylinder(group, 0.028, 0.88, { x: 0, y: 1.72, z: 0.38 }, accentMaterial)
  addToolPort(group, palette)
}

function createEquipmentMesh(equipment, palette) {
  const group = new THREE.Group()
  group.position.set(equipment.position.x, 0, equipment.position.z)
  group.rotation.y = equipment.rotationY ?? 0
  group.userData.equipmentId = equipment.id
  group.userData.targetScale = 1

  addBox(
    group,
    { x: 1.46, y: 0.06, z: 1.04 },
    { x: 0, y: 0.03, z: 0 },
    createStandardMaterial(palette.muted, { opacity: 0.34, transparent: true }),
  )

  const createShape = {
    deposition: createDepositionEquipment,
    etch: createEtchEquipment,
    foupLoader: createFoupLoaderEquipment,
    metrology: createMetrologyEquipment,
    transferRobot: createTransferRobotEquipment,
  }[equipment.shape]

  createShape?.(group, palette)
  addSelectionRing(group, palette)

  const labelAnchor = new THREE.Object3D()
  labelAnchor.position.set(0, 2.16, 0)
  group.add(labelAnchor)
  labelAnchors.set(equipment.id, labelAnchor)

  registerSelectableMesh(group, equipment.id)

  return group
}

function clearGroup(targetGroup) {
  if (!targetGroup) {
    return
  }

  targetGroup.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose()
    }

    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => material.dispose())
    }
  })
  targetGroup.clear()
}

function buildProcessInfrastructure(group, palette) {
  const equipmentList = activeEquipmentList.value

  if (!equipmentList.length) {
    return
  }

  const minX = Math.min(...equipmentList.map((equipment) => equipment.position.x)) - 1
  const maxX = Math.max(...equipmentList.map((equipment) => equipment.position.x)) + 1
  const centerX = (minX + maxX) / 2
  const lineLength = maxX - minX
  const railMaterial = createStandardMaterial(palette.accent, {
    opacity: 0.5,
    roughness: 0.4,
    transparent: true,
  })
  const pipeMaterial = createStandardMaterial(palette.accent, {
    opacity: 0.62,
    transparent: true,
  })
  const utilityMaterial = createStandardMaterial(palette.muted, {
    opacity: 0.56,
    transparent: true,
  })
  const aisleMaterial = createStandardMaterial(palette.accent, {
    opacity: 0.08,
    transparent: true,
  })
  const bayMaterial = createStandardMaterial(palette.muted, {
    opacity: 0.12,
    transparent: true,
  })

  addBox(group, { x: lineLength, y: 0.025, z: 0.86 }, { x: centerX, y: 0.036, z: 0 }, aisleMaterial)
  addBox(group, { x: lineLength, y: 0.02, z: 1.3 }, { x: centerX, y: 0.028, z: 1.8 }, bayMaterial)
  addBox(group, { x: lineLength, y: 0.02, z: 1.3 }, { x: centerX, y: 0.028, z: -1.8 }, bayMaterial)

  addBox(group, { x: lineLength, y: 0.035, z: 0.08 }, { x: centerX, y: 0.09, z: -0.48 }, railMaterial)
  addBox(group, { x: lineLength, y: 0.035, z: 0.08 }, { x: centerX, y: 0.09, z: 0.48 }, railMaterial)

  addHorizontalCylinder(group, 0.04, lineLength, { x: centerX, y: 2.72, z: -0.32 }, railMaterial)
  addHorizontalCylinder(group, 0.04, lineLength, { x: centerX, y: 2.72, z: 0.32 }, railMaterial)
  addBox(group, { x: lineLength, y: 0.04, z: 0.72 }, { x: centerX, y: 2.58, z: 0 }, utilityMaterial)

  ;[minX + 1.2, centerX - 0.35, maxX - 1.2].forEach((x, index) => {
    const pod = addBox(
      group,
      { x: 0.44, y: 0.26, z: 0.38 },
      { x, y: 2.28, z: index === 1 ? -0.18 : 0.16 },
      createStandardMaterial(index === 1 ? palette.accent : palette.panel, {
        opacity: index === 1 ? 0.78 : 1,
        transparent: index === 1,
      }),
    )
    pod.rotation.y = index === 1 ? 0.06 : -0.04
    addBox(
      group,
      { x: 0.58, y: 0.08, z: 0.58 },
      { x, y: 2.48, z: index === 1 ? -0.18 : 0.16 },
      railMaterial,
    )
  })

  addBox(group, { x: lineLength, y: 0.08, z: 0.18 }, { x: centerX, y: 0.08, z: 2.72 }, utilityMaterial)
  addBox(group, { x: lineLength, y: 0.08, z: 0.18 }, { x: centerX, y: 0.08, z: -2.72 }, utilityMaterial)

  addHorizontalCylinder(group, 0.032, lineLength, { x: centerX, y: 2.96, z: 0.86 }, pipeMaterial)
  addHorizontalCylinder(group, 0.032, lineLength, { x: centerX, y: 2.96, z: -0.86 }, pipeMaterial)
  addHorizontalCylinder(group, 0.026, 1.72, { x: minX, y: 2.96, z: 0 }, utilityMaterial, 'z')
  addHorizontalCylinder(group, 0.026, 1.72, { x: maxX, y: 2.96, z: 0 }, utilityMaterial, 'z')

  equipmentList.forEach((equipment) => {
    const frontDirection = getEquipmentFrontDirection(equipment)
    const portZ = equipment.position.z + frontDirection.z * 0.82
    const bridgeZ = portZ / 2
    const bridgeLength = Math.max(Math.abs(portZ), 0.24)
    const trackZ = equipment.position.z > 0 ? 0.68 : equipment.position.z < 0 ? -0.68 : 0

    addBox(
      group,
      { x: 0.38, y: 0.08, z: bridgeLength },
      { x: equipment.position.x, y: 0.2, z: bridgeZ },
      railMaterial,
    )
    addBox(
      group,
      { x: 0.7, y: 0.045, z: 0.07 },
      { x: equipment.position.x, y: 0.31, z: portZ },
      railMaterial,
    )
    addCylinder(group, 0.018, 0.9, { x: equipment.position.x, y: 2.25, z: trackZ }, pipeMaterial, 16)
    addHorizontalCylinder(
      group,
      0.02,
      Math.max(Math.abs(equipment.position.z - trackZ), 0.28),
      { x: equipment.position.x, y: 2.7, z: (equipment.position.z + trackZ) / 2 },
      pipeMaterial,
      'z',
    )
  })
}

function buildFloor(palette) {
  if (floorGroup) {
    scene.remove(floorGroup)
  }

  clearGroup(floorGroup)
  floorGroup = new THREE.Group()
  const equipmentList = activeEquipmentList.value

  if (!equipmentList.length) {
    scene.add(floorGroup)
    return
  }

  const minX = Math.min(...equipmentList.map((equipment) => equipment.position.x)) - 1.25
  const maxX = Math.max(...equipmentList.map((equipment) => equipment.position.x)) + 1.25
  const minZ = Math.min(...equipmentList.map((equipment) => equipment.position.z)) - 1.65
  const maxZ = Math.max(...equipmentList.map((equipment) => equipment.position.z)) + 1.65
  const floorWidth = maxX - minX
  const floorDepth = maxZ - minZ
  const floorCenterX = (minX + maxX) / 2
  const floorCenterZ = (minZ + maxZ) / 2

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(floorWidth, floorDepth),
    new THREE.MeshStandardMaterial({
      color: palette.floor,
      metalness: 0,
      opacity: 0.94,
      roughness: 0.72,
      side: THREE.DoubleSide,
      transparent: true,
    }),
  )
  floor.receiveShadow = true
  floor.position.set(floorCenterX, 0, floorCenterZ)
  floor.rotation.x = -Math.PI / 2
  floorGroup.add(floor)

  const gridSize = Math.max(floorWidth, floorDepth)
  const grid = new THREE.GridHelper(gridSize, 14, palette.accent, palette.muted)
  grid.position.set(floorCenterX, 0.015, floorCenterZ)
  grid.material.opacity = 0.2
  grid.material.transparent = true
  floorGroup.add(grid)

  const laneMaterial = new THREE.MeshBasicMaterial({
    color: palette.accent,
    opacity: 0.38,
    transparent: true,
  })

  ;[-0.48, 0.48].forEach((z) => {
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(floorWidth - 0.9, 0.035), laneMaterial)
    lane.position.set(floorCenterX, 0.026, z)
    lane.rotation.x = -Math.PI / 2
    floorGroup.add(lane)
  })

  scene.add(floorGroup)
}

function buildActiveLine() {
  if (!scene) {
    return
  }

  const palette = getScenePalette()
  if (equipmentGroup) {
    scene.remove(equipmentGroup)
  }

  clearGroup(equipmentGroup)
  equipmentGroup = new THREE.Group()
  selectableObjects = []
  labelLayoutSignature = ''
  equipmentGroups.clear()
  labelAnchors.clear()

  buildFloor(palette)
  buildProcessInfrastructure(equipmentGroup, palette)

  activeEquipmentList.value.forEach((equipment) => {
    const group = createEquipmentMesh(equipment, palette)
    equipmentGroups.set(equipment.id, group)
    equipmentGroup.add(group)
  })

  scene.add(equipmentGroup)
  updateSelectionVisuals()
  updateLabels()
}

function updateSelectionVisuals() {
  equipmentGroups.forEach((group, equipmentId) => {
    const isSelected = equipmentId === currentSelectedEquipmentId.value
    group.userData.targetScale = isSelected ? 1.08 : 1

    if (group.userData.selectionRing) {
      group.userData.selectionRing.visible = isSelected
    }
  })
}

function setFocusForEquipment(equipment, immediate = false) {
  if (!camera || !controls || !equipment) {
    return
  }

  const target = new THREE.Vector3(equipment.position.x, 0.78, equipment.position.z)
  const currentOffset = camera.position.clone().sub(controls.target)
  const frontDirection = getEquipmentFrontDirection(equipment)
  const sideOffset = new THREE.Vector3(1.6, 3.15, 0)

  const focusDistance = clamp(currentOffset.length() || 5.6, 2.8, 8.8)
  const cameraTarget = target.clone().add(frontDirection.multiplyScalar(focusDistance)).add(sideOffset)

  isLineOverviewFocused = false
  targetFocus = { camera: cameraTarget, target }

  if (immediate) {
    camera.position.copy(cameraTarget)
    controls.target.copy(target)
    controls.update()
    targetFocus = null
  }
}

function getActiveLineBounds() {
  const equipmentList = activeEquipmentList.value

  if (!equipmentList.length) {
    return {
      centerX: 0,
      centerZ: 0,
      depth: 5,
      width: 8,
    }
  }

  const minX = Math.min(...equipmentList.map((equipment) => equipment.position.x)) - 2.2
  const maxX = Math.max(...equipmentList.map((equipment) => equipment.position.x)) + 2.2
  const minZ = Math.min(...equipmentList.map((equipment) => equipment.position.z)) - 2.9
  const maxZ = Math.max(...equipmentList.map((equipment) => equipment.position.z)) + 2.9

  return {
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    depth: maxZ - minZ,
    width: maxX - minX,
  }
}

function getLineOverviewCameraState() {
  const bounds = getActiveLineBounds()
  const aspect = camera?.aspect || 1
  const verticalFov = THREE.MathUtils.degToRad(camera?.fov || 45)
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect)
  const widthDistance = bounds.width / Math.max(Math.tan(horizontalFov / 2) * 1.5, 0.1)
  const depthDistance = bounds.depth / Math.max(Math.tan(verticalFov / 2) * 1.36, 0.1)
  const distance = clamp(Math.max(widthDistance, depthDistance) * 0.94, 6.8, 20)
  const target = new THREE.Vector3(bounds.centerX, 0.58, bounds.centerZ)
  const cameraDirection = new THREE.Vector3(0.22, 0.46, -0.86).normalize()

  return {
    camera: target.clone().add(cameraDirection.multiplyScalar(distance)),
    target,
  }
}

function setLineOverviewFocus(immediate = false) {
  if (!camera || !controls) {
    return
  }

  const overviewState = getLineOverviewCameraState()

  isLineOverviewFocused = true
  isAlertChecklistOpen.value = false
  targetFocus = overviewState

  if (immediate) {
    camera.position.copy(overviewState.camera)
    controls.target.copy(overviewState.target)
    controls.update()
    targetFocus = null
  }
}

function focusLineOverview() {
  setLineOverviewFocus()
}

function showLineSceneLoading() {
  window.clearTimeout(lineSceneLoadingTimer)
  isLineSceneLoading.value = true
  lineSceneLoadingTimer = window.setTimeout(() => {
    isLineSceneLoading.value = false
  }, 680)
}

function selectEquipment(equipmentId, options = {}) {
  const equipment = equipmentById.value[equipmentId]

  if (!equipment) {
    return
  }

  currentSelectedEquipmentId.value = equipmentId
  selectedLineId.value = equipment.lineId
  updateSelectionVisuals()
  emit('select-equipment', equipmentId)
  isAlertChecklistOpen.value =
    options.focus !== false && ['warning', 'danger'].includes(equipment.status?.tone)

  if (options.focus !== false) {
    hasFocusedEquipmentByInteraction = true
    nextTick(() => setFocusForEquipment(equipment))
  }
}

function selectLine(lineId) {
  const line = props.lines.find((item) => item.id === lineId)
  const firstEquipment = line?.equipment[0]
  const isChangingLine = selectedLineId.value !== lineId

  if (isChangingLine) {
    showLineSceneLoading()
  }

  shouldFocusLineOverview = true
  selectedLineId.value = lineId
  isAlertChecklistOpen.value = false
  isLineSelectorOpen.value = false

  if (firstEquipment) {
    selectEquipment(firstEquipment.id, { focus: false })
    return
  }

  setLineOverviewFocus()
}

function toggleLineSelector() {
  isLineSelectorOpen.value = !isLineSelectorOpen.value
}

function syncLineWithEquipment(equipmentId) {
  const equipment = equipmentById.value[equipmentId]

  if (equipment) {
    selectedLineId.value = equipment.lineId
  }
}

function getPointerPosition(event) {
  const rect = renderer.domElement.getBoundingClientRect()

  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
  }
}

function handlePointerDown(event) {
  targetFocus = null
  pointerDownPosition = {
    x: event.clientX,
    y: event.clientY,
  }
}

function handleCameraInteractionStart() {
  targetFocus = null
}

function handlePointerUp(event) {
  if (!pointerDownPosition || !camera || !raycaster) {
    return
  }

  const moveDistance = Math.hypot(
    event.clientX - pointerDownPosition.x,
    event.clientY - pointerDownPosition.y,
  )
  pointerDownPosition = null

  if (moveDistance > 6) {
    return
  }

  const pointer = getPointerPosition(event)
  raycaster.setFromCamera(pointer, camera)

  const [hit] = raycaster.intersectObjects(selectableObjects, false)
  const equipmentId = hit?.object?.userData?.equipmentId

  if (equipmentId) {
    selectEquipment(equipmentId)
  }
}

function resizeScene() {
  if (!renderer || !camera || !viewportRef.value) {
    return
  }

  const { height, width } = viewportRef.value.getBoundingClientRect()
  const nextWidth = Math.max(width, 1)
  const nextHeight = Math.max(height, 1)

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(nextWidth, nextHeight, false)
  camera.aspect = nextWidth / nextHeight
  camera.updateProjectionMatrix()

  if (isLineOverviewFocused) {
    setLineOverviewFocus(true)
  }

  updateLabels()
}

function updateLabels() {
  if (!camera || !viewportRef.value) {
    const nextLabelItems = activeEquipmentList.value.map((equipment) => ({
      equipment,
      screenX: 0,
      screenY: 0,
      visible: false,
      zIndex: 5,
    }))
    labelItems.value = nextLabelItems
    return
  }

  const rect = viewportRef.value.getBoundingClientRect()
  const projectedPosition = new THREE.Vector3()

  const nextLabelItems = activeEquipmentList.value.map((equipment, index) => {
    const anchor = labelAnchors.get(equipment.id)
    const isSelected = equipment.id === currentSelectedEquipmentId.value
    const labelLift = index % 2 === 0 ? 0 : 28

    if (!anchor) {
      return {
        equipment,
        isSelected,
        screenX: 0,
        screenY: 0,
        visible: false,
        zIndex: 5,
      }
    }

    anchor.getWorldPosition(projectedPosition)
    projectedPosition.project(camera)

    return {
      equipment,
      isSelected,
      screenX: (projectedPosition.x * 0.5 + 0.5) * rect.width,
      screenY: (-projectedPosition.y * 0.5 + 0.5) * rect.height - labelLift,
      visible: projectedPosition.z > -1 && projectedPosition.z < 1,
      zIndex: isSelected ? 8 : 5 + activeEquipmentList.value.length - index,
    }
  })

  const nextSignature = nextLabelItems
    .map(
      (item) =>
        `${item.equipment.id}:${Math.round(item.screenX)}:${Math.round(item.screenY)}:${
          item.visible
        }:${item.isSelected}:${item.zIndex}`,
    )
    .join('|')

  if (nextSignature !== labelLayoutSignature) {
    labelLayoutSignature = nextSignature
    labelItems.value = nextLabelItems
  }
}

function animateScene() {
  animationFrame = window.requestAnimationFrame(animateScene)

  if (targetFocus) {
    camera.position.lerp(targetFocus.camera, 0.065)
    controls.target.lerp(targetFocus.target, 0.065)

    if (
      camera.position.distanceTo(targetFocus.camera) < 0.02 &&
      controls.target.distanceTo(targetFocus.target) < 0.02
    ) {
      targetFocus = null
    }
  }

  equipmentGroups.forEach((group) => {
    const targetScale = group.userData.targetScale ?? 1
    group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12)
  })

  controls.update()
  updateLabels()
  renderer.render(scene, camera)
}

function setupScene() {
  if (
    import.meta.env.MODE === 'test' ||
    !canvasRef.value ||
    !viewportRef.value ||
    typeof window.WebGLRenderingContext === 'undefined'
  ) {
    canRenderScene.value = false
    return
  }

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  raycaster = new THREE.Raycaster()

  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas: canvasRef.value,
      preserveDrawingBuffer: true,
    })
  } catch {
    canRenderScene.value = false
    return
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const palette = getScenePalette()
  const ambientLight = new THREE.HemisphereLight(palette.floor, palette.muted, 1.7)
  const keyLight = new THREE.DirectionalLight(palette.floor, 2.8)
  keyLight.castShadow = true
  keyLight.position.set(4, 8, 6)
  keyLight.shadow.mapSize.set(1024, 1024)

  const accentLight = new THREE.DirectionalLight(palette.accent, 0.8)
  accentLight.position.set(-5, 4, -4)

  scene.add(ambientLight, keyLight, accentLight)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = true
  controls.maxDistance = 24
  controls.maxPolarAngle = Math.PI * 0.78
  controls.minDistance = 1.25
  controls.minPolarAngle = Math.PI * 0.04
  controls.panSpeed = 0.72
  controls.rotateSpeed = 0.78
  controls.screenSpacePanning = true
  controls.zoomSpeed = 1.08
  controls.addEventListener('start', handleCameraInteractionStart)

  renderer.domElement.addEventListener('pointerdown', handlePointerDown)
  renderer.domElement.addEventListener('pointerup', handlePointerUp)

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resizeScene)
    resizeObserver.observe(viewportRef.value)
  }

  buildActiveLine()
  resizeScene()
  setLineOverviewFocus(true)
  hasCompletedInitialOverview = true
  animateScene()
}

function disposeScene() {
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame)
  }

  renderer?.domElement.removeEventListener('pointerdown', handlePointerDown)
  renderer?.domElement.removeEventListener('pointerup', handlePointerUp)
  controls?.removeEventListener('start', handleCameraInteractionStart)
  resizeObserver?.disconnect()
  window.clearTimeout(lineSceneLoadingTimer)
  controls?.dispose()
  clearGroup(equipmentGroup)
  clearGroup(floorGroup)
  renderer?.dispose()
}

watch(
  () => props.selectedEquipmentId,
  (equipmentId) => {
    if (!equipmentId) {
      return
    }

    currentSelectedEquipmentId.value = equipmentId
    syncLineWithEquipment(equipmentId)
    updateSelectionVisuals()
    if (!hasCompletedInitialOverview || shouldFocusLineOverview || !hasFocusedEquipmentByInteraction) {
      nextTick(() => setLineOverviewFocus())
      return
    }
    nextTick(() => setFocusForEquipment(equipmentById.value[equipmentId]))
  },
)

watch(
  () => selectedLine.value?.id,
  () => {
    buildActiveLine()
    updateSelectionVisuals()

    if (!activeEquipmentList.value.some((equipment) => equipment.id === currentSelectedEquipmentId.value)) {
      const firstEquipment = activeEquipmentList.value[0]

      if (firstEquipment) {
        currentSelectedEquipmentId.value = firstEquipment.id
      }
    }

    nextTick(() => {
      const selectedEquipment = equipmentById.value[currentSelectedEquipmentId.value]
      if (shouldFocusLineOverview) {
        shouldFocusLineOverview = false
        setLineOverviewFocus()
        return
      }

      if (selectedEquipment?.lineId === selectedLineId.value) {
        setFocusForEquipment(selectedEquipment)
        return
      }

      setLineOverviewFocus()
    })
  },
)

onMounted(() => {
  syncLineWithEquipment(currentSelectedEquipmentId.value)
  setupScene()
})

onBeforeUnmount(() => {
  disposeScene()
})
</script>

<template>
  <section ref="viewportRef" class="factory-viewport" aria-label="3D 공장 화면">
    <canvas ref="canvasRef" class="factory-viewport__canvas" data-test="factory-3d-canvas"></canvas>

    <div class="factory-viewport__left-controls">
      <ul
        class="factory-viewport__status-stack"
        :aria-label="`${selectedLine?.label ?? '라인'} 설비 상태 요약`"
      >
        <li
          v-for="item in activeStatusSummary"
          :key="item.id"
          class="factory-viewport__status-item"
          :class="`factory-viewport__status-item--${item.id}`"
        >
          <span class="factory-viewport__status-dot" aria-hidden="true"></span>
          <span>{{ item.label }}</span>
          <strong>{{ item.count }}</strong>
        </li>
      </ul>

      <div class="factory-viewport__camera-tools" aria-label="카메라 제어">
        <span>카메라 시점 선택</span>
        <button type="button" @click="focusLineOverview">라인 전체</button>
      </div>
    </div>

    <div class="factory-viewport__line-selector">
      <Transition name="factory-line-menu">
        <div
          v-if="isLineSelectorOpen"
          class="factory-viewport__line-menu"
          data-test="factory-line-menu"
        >
          <button
            v-for="line in lines"
            :key="line.id"
            type="button"
            class="factory-viewport__line-option"
            :class="{ 'factory-viewport__line-option--active': selectedLine?.id === line.id }"
            @click="selectLine(line.id)"
          >
            <strong>{{ line.label }}</strong>
            <span>{{ line.equipment.length }}대 설비</span>
          </button>
        </div>
      </Transition>

      <button
        type="button"
        class="factory-viewport__line-trigger"
        :aria-expanded="isLineSelectorOpen"
        data-test="factory-line-selector-toggle"
        @click="toggleLineSelector"
      >
        {{ selectedLineSummary }}
      </button>
    </div>

    <Transition name="factory-scene-loader">
      <DashboardContentLoader
        v-if="isLineSceneLoading"
        class="factory-viewport__scene-loader"
        compact
        data-test="factory-line-loader"
        label="라인 설비를 불러오는 중"
      />
    </Transition>

    <Transition name="factory-checklist-panel">
      <aside
        v-if="shouldShowAlertChecklist"
        class="factory-viewport__checklist"
        data-test="factory-alert-checklist"
        :class="`factory-viewport__checklist--${selectedEquipment.status.tone}`"
        :aria-label="`${selectedEquipment.name} 대응 체크리스트`"
      >
        <header class="factory-viewport__checklist-header">
          <div class="factory-viewport__checklist-meta">
            <span class="factory-viewport__checklist-status">{{ selectedEquipment.status.label }}</span>
            <span>대응 체크리스트</span>
          </div>
          <strong>{{ selectedEquipment.name }}</strong>
        </header>

        <ul class="factory-viewport__checklist-list">
          <li v-for="item in checklistItems" :key="item.id" class="factory-viewport__checklist-item">
            <span
              class="factory-viewport__checklist-dot"
              :class="{ 'factory-viewport__checklist-dot--checked': item.checked }"
              aria-hidden="true"
            ></span>
            <span>{{ item.label }}</span>
          </li>
        </ul>
      </aside>
    </Transition>

    <div class="factory-viewport__labels" aria-hidden="false">
      <button
        v-for="label in labelItems"
        :key="label.equipment.id"
        type="button"
        class="factory-viewport__label"
        :class="[
          `factory-viewport__label--${label.equipment.status.tone}`,
          { 'factory-viewport__label--active': label.isSelected },
        ]"
        :style="{
          opacity: label.visible ? 1 : 0,
          pointerEvents: label.visible ? 'auto' : 'none',
          transform: `translate3d(${label.screenX}px, ${label.screenY}px, 0) translate(-50%, -100%)`,
          zIndex: label.zIndex,
        }"
        :aria-pressed="label.isSelected"
        @click="selectEquipment(label.equipment.id)"
      >
        <span class="factory-viewport__label-dot"></span>
        <strong>{{ label.equipment.name }}</strong>
        <small>{{ label.equipment.status.label }}</small>
      </button>
    </div>

    <p v-if="!canRenderScene" class="factory-viewport__fallback">
      3D 렌더링을 사용할 수 없는 환경입니다.
    </p>
  </section>
</template>

<style scoped>
.factory-viewport {
  --factory-glass-bg-start: color-mix(in srgb, var(--agentory-color-bg-app), transparent 28%);
  --factory-glass-bg-end: color-mix(in srgb, var(--agentory-color-bg-app), transparent 58%);
  --factory-glass-shadow:
    var(--agentory-shadow-panel-soft),
    inset 0 1px 0 color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 6%);
  --factory-glass-filter: var(--agentory-blur-glass-intense);

  position: relative;
  container-type: inline-size;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 28%, var(--agentory-color-bg-glass-white), transparent 34%),
    var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel);
}

.factory-viewport__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
}

.factory-viewport__canvas:active {
  cursor: grabbing;
}

.factory-viewport__line-trigger:focus-visible,
.factory-viewport__line-option:focus-visible,
.factory-viewport__camera-tools button:focus-visible,
.factory-viewport__label:focus-visible {
  outline: 2px solid var(--agentory-color-border-primary);
  outline-offset: 2px;
}

.factory-viewport__left-controls {
  position: absolute;
  z-index: 4;
  bottom: var(--agentory-spacing-12);
  left: var(--agentory-spacing-12);
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: var(--agentory-spacing-8);
  pointer-events: none;
}

.factory-viewport__status-stack {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-4);
  min-width: 112px;
  padding: var(--agentory-spacing-8);
  margin: 0;
  list-style: none;
  background:
    linear-gradient(
      135deg,
      var(--factory-glass-bg-start),
      var(--factory-glass-bg-end)
    );
  border: 0;
  border-radius: var(--agentory-radius-12);
  box-shadow:
    var(--factory-glass-shadow);
  backdrop-filter: var(--factory-glass-filter);
  -webkit-backdrop-filter: var(--factory-glass-filter);
  pointer-events: auto;
}

.factory-viewport__status-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--agentory-spacing-6);
  min-height: 24px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-8);
  color: var(--agentory-color-text-primary);
  background: transparent;
  border-radius: 0;
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
  white-space: nowrap;
}

.factory-viewport__status-dot {
  width: 8px;
  height: 8px;
  background: var(--agentory-color-status-offline);
  border-radius: var(--agentory-radius-pill);
}

.factory-viewport__status-item--normal .factory-viewport__status-dot {
  background: var(--agentory-color-status-normal);
}

.factory-viewport__status-item--warning .factory-viewport__status-dot {
  background: var(--agentory-color-status-warning);
}

.factory-viewport__status-item--danger .factory-viewport__status-dot {
  background: var(--agentory-color-status-danger);
}

.factory-viewport__status-item strong {
  color: var(--agentory-color-bg-primary);
  font-weight: var(--agentory-font-weight-semi-bold);
}

.factory-viewport__status-item--normal strong {
  color: var(--agentory-color-status-normal-text);
}

.factory-viewport__status-item--warning strong {
  color: var(--agentory-color-status-warning);
}

.factory-viewport__status-item--danger strong {
  color: var(--agentory-color-status-danger);
}

.factory-viewport__status-item--offline strong {
  color: var(--agentory-color-status-offline);
}

.factory-viewport__camera-tools {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-6);
  padding: var(--agentory-spacing-4);
  background:
    linear-gradient(
      135deg,
      var(--factory-glass-bg-start),
      var(--factory-glass-bg-end)
    );
  border: 0;
  border-radius: var(--agentory-radius-pill);
  box-shadow: var(--factory-glass-shadow);
  cursor: default;
  backdrop-filter: var(--factory-glass-filter);
  -webkit-backdrop-filter: var(--factory-glass-filter);
  pointer-events: auto;
}

.factory-viewport__camera-tools span {
  padding-inline: var(--agentory-spacing-6);
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body-sm);
  white-space: nowrap;
}

.factory-viewport__camera-tools button {
  min-height: 26px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-10);
  color: var(--agentory-color-text-primary);
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-pill);
  font-family: var(--agentory-font-family-base);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body-sm);
  cursor: pointer;
}

.factory-viewport__line-selector {
  position: absolute;
  z-index: 6;
  right: var(--agentory-spacing-14);
  bottom: var(--agentory-spacing-12);
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: var(--agentory-spacing-8);
}

.factory-viewport__line-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  max-width: min(220px, 44cqw);
  padding: var(--agentory-spacing-6) var(--agentory-spacing-12);
  color: var(--agentory-color-text-primary);
  background:
    linear-gradient(
      135deg,
      var(--factory-glass-bg-start),
      var(--factory-glass-bg-end)
    );
  border: 0;
  border-radius: var(--agentory-radius-pill);
  box-shadow: var(--factory-glass-shadow);
  font-family: var(--agentory-font-family-base);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-body-sm);
  white-space: nowrap;
  backdrop-filter: var(--factory-glass-filter);
  -webkit-backdrop-filter: var(--factory-glass-filter);
  cursor: pointer;
}

.factory-viewport__line-menu {
  display: flex;
  width: min(220px, 52cqw);
  max-height: min(260px, 62cqh);
  padding: var(--agentory-spacing-6);
  flex-direction: column;
  gap: var(--agentory-spacing-5);
  overflow: auto;
  background:
    linear-gradient(
      135deg,
      var(--factory-glass-bg-start),
      var(--factory-glass-bg-end)
    );
  border: 0;
  border-radius: var(--agentory-radius-12);
  box-shadow: var(--factory-glass-shadow);
  backdrop-filter: var(--factory-glass-filter);
  -webkit-backdrop-filter: var(--factory-glass-filter);
  scrollbar-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 48%) transparent;
  scrollbar-width: thin;
}

.factory-viewport__line-menu::-webkit-scrollbar {
  width: 6px;
}

.factory-viewport__line-menu::-webkit-scrollbar-track {
  background: transparent;
}

.factory-viewport__line-menu::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 48%);
  border-radius: var(--agentory-radius-pill);
}

.factory-viewport__line-option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--agentory-spacing-8);
  min-height: 34px;
  padding: var(--agentory-spacing-6) var(--agentory-spacing-10);
  color: var(--agentory-color-text-primary);
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-8);
  font-family: var(--agentory-font-family-base);
  cursor: pointer;
}

.factory-viewport__line-option--active {
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary-glass);
}

.factory-viewport__line-option strong,
.factory-viewport__line-option span {
  min-width: 0;
  overflow: hidden;
  font-size: var(--agentory-font-size-body-sm);
  line-height: var(--agentory-line-height-body-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.factory-viewport__line-option span {
  color: inherit;
  opacity: 0.74;
}

.factory-line-menu-enter-active,
.factory-line-menu-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.factory-line-menu-enter-from,
.factory-line-menu-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.factory-checklist-panel-enter-active,
.factory-checklist-panel-leave-active {
  transition:
    opacity 180ms ease,
    transform 200ms ease;
}

.factory-checklist-panel-enter-from,
.factory-checklist-panel-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.factory-scene-loader-enter-active,
.factory-scene-loader-leave-active {
  transition:
    opacity 220ms var(--agentory-ease-soft),
    transform 420ms var(--agentory-ease-elastic);
}

.factory-scene-loader-enter-from,
.factory-scene-loader-leave-to {
  opacity: 0;
  transform: scale(0.982);
}

.factory-viewport__checklist {
  --factory-checklist-accent: var(--agentory-color-status-warning);

  position: absolute;
  z-index: 6;
  top: 52px;
  right: var(--agentory-spacing-16);
  display: flex;
  width: min(294px, 42cqw);
  max-height: min(236px, calc(100cqh - 76px));
  padding: var(--agentory-spacing-12);
  flex-direction: column;
  gap: var(--agentory-spacing-8);
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  background:
    linear-gradient(
      135deg,
      var(--factory-glass-bg-start),
      var(--factory-glass-bg-end)
    );
  border: 0;
  border-radius: var(--agentory-radius-12);
  box-shadow:
    var(--factory-glass-shadow);
  backdrop-filter: var(--factory-glass-filter);
  -webkit-backdrop-filter: var(--factory-glass-filter);
}

.factory-viewport__checklist--danger {
  --factory-checklist-accent: var(--agentory-color-status-danger);
}

.factory-viewport__checklist-header {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--agentory-spacing-5);
  padding-bottom: var(--agentory-spacing-6);
  border-bottom: 0;
}

.factory-viewport__checklist-meta {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-6);
  min-width: 0;
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
}

.factory-viewport__checklist-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 0 var(--agentory-spacing-8);
  color: var(--factory-checklist-accent);
  background: color-mix(in srgb, var(--factory-checklist-accent), transparent 88%);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-caption);
}

.factory-viewport__checklist--danger .factory-viewport__checklist-status {
  color: var(--agentory-color-status-danger-text);
}

.factory-viewport__checklist-header strong {
  min-width: 0;
  overflow: hidden;
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.factory-viewport__checklist-list {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: var(--agentory-spacing-5);
  overflow: auto;
  padding-right: var(--agentory-spacing-4);
  scrollbar-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 48%) transparent;
  scrollbar-width: thin;
}

.factory-viewport__checklist-list::-webkit-scrollbar {
  width: 6px;
}

.factory-viewport__checklist-list::-webkit-scrollbar-track {
  background: transparent;
}

.factory-viewport__checklist-list::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 48%);
  border-radius: var(--agentory-radius-pill);
}

.factory-viewport__checklist-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: var(--agentory-spacing-8);
  min-width: 0;
  padding: var(--agentory-spacing-4) 0;
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-8);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body);
}

.factory-viewport__checklist-dot {
  width: 12px;
  height: 12px;
  margin-top: 4px;
  border: 2px solid var(--factory-checklist-accent);
  border-radius: var(--agentory-radius-pill);
}

.factory-viewport__checklist-dot--checked {
  background: var(--factory-checklist-accent);
  box-shadow: inset 0 0 0 2px var(--agentory-color-bg-app);
}

.factory-viewport__labels {
  position: absolute;
  z-index: 5;
  inset: 0;
  pointer-events: none;
}

.factory-viewport__label {
  position: absolute;
  top: 0;
  left: 0;
  display: inline-grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--agentory-spacing-6);
  min-width: 132px;
  max-width: min(218px, 42cqw);
  min-height: 34px;
  padding: var(--agentory-spacing-6) var(--agentory-spacing-10);
  color: var(--agentory-color-text-primary);
  background:
    linear-gradient(
      135deg,
      var(--factory-glass-bg-start),
      var(--factory-glass-bg-end)
    );
  border: 0;
  border-radius: var(--agentory-radius-8);
  box-shadow: var(--factory-glass-shadow);
  font-family: var(--agentory-font-family-base);
  text-align: left;
  backdrop-filter: var(--factory-glass-filter);
  -webkit-backdrop-filter: var(--factory-glass-filter);
  cursor: pointer;
  transition:
    opacity 120ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
  will-change: transform;
}

.factory-viewport__label--active {
  box-shadow:
    var(--agentory-shadow-panel),
    inset 0 1px 0 color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 4%);
}

.factory-viewport__label-dot {
  width: 9px;
  height: 9px;
  background: var(--agentory-color-status-offline);
  border-radius: var(--agentory-radius-pill);
}

.factory-viewport__label--normal .factory-viewport__label-dot {
  background: var(--agentory-color-status-normal);
}

.factory-viewport__label--warning .factory-viewport__label-dot {
  background: var(--agentory-color-status-warning);
}

.factory-viewport__label--danger .factory-viewport__label-dot {
  background: var(--agentory-color-status-danger);
}

.factory-viewport__label strong {
  min-width: 0;
  overflow: hidden;
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-body-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.factory-viewport__label small {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
  line-height: 1.2;
  white-space: nowrap;
}

.factory-viewport__label--danger small {
  color: var(--agentory-color-status-danger-text);
}

.factory-viewport__label--warning small {
  color: var(--agentory-color-status-warning);
}

.factory-viewport__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--agentory-spacing-20);
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body);
  text-align: center;
}

@container (max-width: 520px) {
  .factory-viewport__checklist {
    top: 48px;
    right: var(--agentory-spacing-10);
    width: min(260px, 62cqw);
    max-height: min(212px, calc(100cqh - 70px));
    padding: var(--agentory-spacing-10);
  }

  .factory-viewport__label {
    min-width: 104px;
    max-width: 150px;
    min-height: 26px;
    padding: var(--agentory-spacing-4) var(--agentory-spacing-6);
  }

  .factory-viewport__label small {
    display: none;
  }
}
</style>
