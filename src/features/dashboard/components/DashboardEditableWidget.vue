<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import widgetMenuIcon from '@/assets/icons/dashboard/widget-menu.svg'
import widgetMoveIcon from '@/assets/icons/dashboard/widget-move.svg'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  layout: {
    type: Object,
    required: true,
  },
  minHeight: {
    type: Number,
    default: 160,
  },
  minWidth: {
    type: Number,
    default: 220,
  },
  resolveLayout: {
    type: Function,
    default: (id, layout) => ({
      layout,
      layouts: { [id]: layout },
      state: 'valid',
    }),
  },
})

const emit = defineEmits(['preview:layout', 'stash', 'update:layout'])

const widgetRef = ref(null)
const activeMode = ref('')
const draftLayout = ref(null)
const dropState = ref('')
const pendingLayouts = ref(null)
const isMenuOpen = ref(false)
const isResizeEditing = ref(false)

const renderedLayout = computed(() => draftLayout.value ?? props.layout)
const widgetStyle = computed(() => ({
  height: `${renderedLayout.value.h}%`,
  left: `${renderedLayout.value.x}%`,
  top: `${renderedLayout.value.y}%`,
  width: `${renderedLayout.value.w}%`,
}))

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function applyResolvedDraft(mode, layout) {
  const resolved = props.resolveLayout(props.id, layout, mode)
  draftLayout.value = resolved.layout
  pendingLayouts.value = resolved.layouts ?? { [props.id]: resolved.layout }
  dropState.value = resolved.state ?? 'valid'

  if (mode === 'move') {
    emit('preview:layout', pendingLayouts.value)
  }
}

function clearDraft() {
  activeMode.value = ''
  draftLayout.value = null
  dropState.value = ''
  pendingLayouts.value = null
  emit('preview:layout', null)
}

function commitPendingLayout() {
  if (!pendingLayouts.value || dropState.value !== 'valid') {
    return false
  }

  emit('update:layout', pendingLayouts.value)

  return true
}

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

function closeMenuOnOutsidePointerDown(event) {
  if (!isMenuOpen.value || widgetRef.value?.contains(event.target)) {
    return
  }

  isMenuOpen.value = false
}

function stashWidget() {
  isMenuOpen.value = false
  isResizeEditing.value = false
  clearDraft()
  emit('stash')
}

function startResizeEditing() {
  isMenuOpen.value = false
  isResizeEditing.value = true
  applyResolvedDraft('resize', { ...props.layout })
}

function saveResize() {
  commitPendingLayout()
  isResizeEditing.value = false
  clearDraft()
}

function startInteraction(mode, event) {
  if (event.button !== 0 || !widgetRef.value) {
    return
  }

  const board = widgetRef.value.offsetParent
  const boardRect = board.getBoundingClientRect()
  const startLayout = { ...(draftLayout.value ?? props.layout) }
  const startX = event.clientX
  const startY = event.clientY
  const minWidthPct = (props.minWidth / boardRect.width) * 100
  const minHeightPct = (props.minHeight / boardRect.height) * 100

  activeMode.value = mode
  isMenuOpen.value = false
  applyResolvedDraft(mode, startLayout)
  event.preventDefault()
  event.stopPropagation()
  event.currentTarget.setPointerCapture?.(event.pointerId)

  function handlePointerMove(moveEvent) {
    const deltaX = ((moveEvent.clientX - startX) / boardRect.width) * 100
    const deltaY = ((moveEvent.clientY - startY) / boardRect.height) * 100
    const nextLayout = { ...startLayout }

    if (mode === 'move') {
      nextLayout.x = clamp(startLayout.x + deltaX, 0, 100 - startLayout.w)
      nextLayout.y = clamp(startLayout.y + deltaY, 0, 100 - startLayout.h)
    }

    if (mode.includes('left')) {
      const nextX = clamp(startLayout.x + deltaX, 0, startLayout.x + startLayout.w - minWidthPct)

      nextLayout.x = nextX
      nextLayout.w = startLayout.x + startLayout.w - nextX
    }

    if (mode.includes('right')) {
      nextLayout.w = clamp(startLayout.w + deltaX, minWidthPct, 100 - startLayout.x)
    }

    if (mode.includes('top')) {
      const nextY = clamp(startLayout.y + deltaY, 0, startLayout.y + startLayout.h - minHeightPct)

      nextLayout.y = nextY
      nextLayout.h = startLayout.y + startLayout.h - nextY
    }

    if (mode.includes('bottom')) {
      nextLayout.h = clamp(startLayout.h + deltaY, minHeightPct, 100 - startLayout.y)
    }

    applyResolvedDraft(mode, nextLayout)
  }

  function handlePointerUp() {
    if (mode === 'move') {
      commitPendingLayout()
      isResizeEditing.value = false
      clearDraft()
    } else {
      commitPendingLayout()
      clearDraft()
      activeMode.value = ''
    }

    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp, { once: true })
}

onMounted(() => {
  window.addEventListener('pointerdown', closeMenuOnOutsidePointerDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', closeMenuOnOutsidePointerDown)
})
</script>

<template>
  <section
    ref="widgetRef"
    class="dashboard-widget"
    :class="{
      'dashboard-widget--active': activeMode,
      'dashboard-widget--resize-editing': isResizeEditing,
      'dashboard-widget--drop-valid': dropState === 'valid',
      'dashboard-widget--drop-invalid': dropState === 'invalid',
    }"
    :style="widgetStyle"
    :data-drop-state="dropState || undefined"
    :data-widget-id="id"
  >
    <div class="dashboard-widget__header-tools">
      <button
        class="dashboard-widget__move"
        type="button"
        :data-test="`widget-move-${id}`"
        aria-label="Move widget"
        @pointerdown="startInteraction('move', $event)"
      >
        <img :src="widgetMoveIcon" alt="" width="14" height="14" />
      </button>

      <div class="dashboard-widget__actions">
        <button
          v-if="isResizeEditing"
          class="dashboard-widget__save"
          type="button"
          :data-test="`widget-save-${id}`"
          @click="saveResize"
        >
          저장
        </button>

        <button
          class="dashboard-widget__menu-button"
          type="button"
          :aria-expanded="isMenuOpen"
          :data-test="`widget-menu-${id}`"
          aria-label="Widget menu"
          @click="toggleMenu"
        >
          <img :src="widgetMenuIcon" alt="" width="16" height="16" />
        </button>

        <div v-if="isMenuOpen" class="dashboard-widget__menu" :data-test="`widget-menu-list-${id}`">
          <button type="button" :data-test="`widget-stash-${id}`" @click="stashWidget">넣어두기</button>
          <button type="button" :data-test="`widget-resize-mode-${id}`" @click="startResizeEditing">
            리사이징
          </button>
        </div>
      </div>
    </div>

    <div class="dashboard-widget__content">
      <slot></slot>
    </div>

    <template v-if="isResizeEditing">
      <button
        class="dashboard-widget__resize dashboard-widget__resize--left"
        type="button"
        :data-test="`widget-resize-left-${id}`"
        aria-label="Resize widget from left"
        @pointerdown="startInteraction('left', $event)"
      ></button>
      <button
        class="dashboard-widget__resize dashboard-widget__resize--top"
        type="button"
        :data-test="`widget-resize-top-${id}`"
        aria-label="Resize widget from top"
        @pointerdown="startInteraction('top', $event)"
      ></button>
      <button
        class="dashboard-widget__resize dashboard-widget__resize--right"
        type="button"
        :data-test="`widget-resize-right-${id}`"
        aria-label="Resize widget width"
        @pointerdown="startInteraction('right', $event)"
      ></button>
      <button
        class="dashboard-widget__resize dashboard-widget__resize--bottom"
        type="button"
        :data-test="`widget-resize-bottom-${id}`"
        aria-label="Resize widget height"
        @pointerdown="startInteraction('bottom', $event)"
      ></button>
      <button
        class="dashboard-widget__resize dashboard-widget__resize--left-top"
        type="button"
        :data-test="`widget-resize-left-top-${id}`"
        aria-label="Resize widget from top left"
        @pointerdown="startInteraction('left-top', $event)"
      ></button>
      <button
        class="dashboard-widget__resize dashboard-widget__resize--right-top"
        type="button"
        :data-test="`widget-resize-right-top-${id}`"
        aria-label="Resize widget from top right"
        @pointerdown="startInteraction('right-top', $event)"
      ></button>
      <button
        class="dashboard-widget__resize dashboard-widget__resize--left-bottom"
        type="button"
        :data-test="`widget-resize-left-bottom-${id}`"
        aria-label="Resize widget from bottom left"
        @pointerdown="startInteraction('left-bottom', $event)"
      ></button>
      <button
        class="dashboard-widget__resize dashboard-widget__resize--corner"
        type="button"
        :data-test="`widget-resize-corner-${id}`"
        aria-label="Resize widget"
        @pointerdown="startInteraction('right-bottom', $event)"
      ></button>
    </template>
  </section>
</template>

<style scoped>
.dashboard-widget {
  --dashboard-widget-motion-duration: 690ms;

  position: absolute;
  min-width: 0;
  min-height: 0;
  border-radius: var(--agentory-radius-16);
  outline: none;
  transition:
    height var(--dashboard-widget-motion-duration) cubic-bezier(0.16, 1, 0.3, 1),
    left var(--dashboard-widget-motion-duration) cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 160ms ease,
    top var(--dashboard-widget-motion-duration) cubic-bezier(0.16, 1, 0.3, 1),
    width var(--dashboard-widget-motion-duration) cubic-bezier(0.16, 1, 0.3, 1);
  will-change: left, top, width, height;
}

.dashboard-widget::after {
  position: absolute;
  z-index: 9;
  inset: 0;
  border: 2px solid transparent;
  border-radius: inherit;
  opacity: 0;
  pointer-events: none;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    opacity 180ms ease;
  content: '';
}

.dashboard-widget--active,
.dashboard-widget--resize-editing {
  z-index: 20;
}

.dashboard-widget--active {
  pointer-events: none;
  transition:
    height var(--dashboard-widget-motion-duration) cubic-bezier(0.16, 1, 0.3, 1),
    left var(--dashboard-widget-motion-duration) cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 160ms ease,
    top var(--dashboard-widget-motion-duration) cubic-bezier(0.16, 1, 0.3, 1),
    width var(--dashboard-widget-motion-duration) cubic-bezier(0.16, 1, 0.3, 1);
}

.dashboard-widget--drop-valid {
  box-shadow:
    0 0 0 7px rgba(58, 219, 118, 0.14),
    var(--agentory-shadow-panel);
}

.dashboard-widget--drop-invalid {
  box-shadow:
    0 0 0 7px rgba(229, 64, 64, 0.15),
    var(--agentory-shadow-panel);
}

.dashboard-widget--drop-valid::after {
  border-color: rgba(58, 219, 118, 0.9);
  opacity: 1;
}

.dashboard-widget--drop-invalid::after {
  border-color: rgba(229, 64, 64, 0.92);
  opacity: 1;
}

.dashboard-widget__content {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.dashboard-widget__content :deep(> *) {
  width: 100%;
  height: 100%;
}

.dashboard-widget__content :deep(.assistant-panel__header),
.dashboard-widget__content :deep(.chart-panel__section-header),
.dashboard-widget__content :deep(.detail-panel__section-header),
.dashboard-widget__content :deep(.checklist-panel__header),
.dashboard-widget__content :deep(.dashboard-data-panel__header) {
  padding-left: 29px;
  box-sizing: border-box;
}

.dashboard-widget__header-tools {
  position: absolute;
  z-index: 8;
  top: 16px;
  right: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 24px;
  pointer-events: none;
}

.dashboard-widget__move,
.dashboard-widget__menu-button,
.dashboard-widget__save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0;
  color: var(--agentory-color-bg-primary);
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-4);
  pointer-events: auto;
}

.dashboard-widget__move,
.dashboard-widget__menu-button {
  width: 20px;
}

.dashboard-widget__move {
  cursor: grab;
}

.dashboard-widget__move:active {
  cursor: grabbing;
}

.dashboard-widget__menu-button {
  cursor: pointer;
}

.dashboard-widget__save {
  padding-inline: 5px;
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-black);
  line-height: var(--agentory-line-height-body-sm);
}

.dashboard-widget__move:hover,
.dashboard-widget__move:focus-visible,
.dashboard-widget__menu-button:hover,
.dashboard-widget__menu-button:focus-visible,
.dashboard-widget__save:hover,
.dashboard-widget__save:focus-visible {
  outline: none;
  opacity: 0.72;
}

.dashboard-widget__move img,
.dashboard-widget__menu-button img {
  display: block;
  width: 20px;
  height: 20px;
  object-fit: contain;
  pointer-events: none;
}

.dashboard-widget__actions {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
}

.dashboard-widget__menu {
  position: absolute;
  top: 34px;
  right: 0;
  display: flex;
  min-width: 104px;
  padding: 6px;
  flex-direction: column;
  gap: 4px;
  background: var(--agentory-color-bg-app);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 68%);
  border-radius: var(--agentory-radius-8);
  box-shadow: var(--agentory-shadow-panel);
}

.dashboard-widget__menu button {
  padding: 8px 10px;
  color: var(--agentory-color-text-primary);
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-4);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body-sm);
  text-align: left;
  white-space: nowrap;
}

.dashboard-widget__menu button:hover,
.dashboard-widget__menu button:focus-visible {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 88%);
  outline: none;
}

.dashboard-widget__resize {
  position: absolute;
  z-index: 7;
  padding: 0;
  background: transparent;
  border: 0;
}

.dashboard-widget__resize--right {
  top: 34px;
  right: -6px;
  bottom: 18px;
  width: 12px;
  cursor: ew-resize;
}

.dashboard-widget__resize--right::after {
  position: absolute;
  top: 50%;
  right: 3px;
  width: 3px;
  height: 42px;
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  transform: translateY(-50%);
  content: '';
}

.dashboard-widget__resize--left {
  top: 34px;
  bottom: 18px;
  left: -6px;
  width: 12px;
  cursor: ew-resize;
}

.dashboard-widget__resize--left::after {
  position: absolute;
  top: 50%;
  left: 3px;
  width: 3px;
  height: 42px;
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  transform: translateY(-50%);
  content: '';
}

.dashboard-widget__resize--bottom {
  right: 18px;
  bottom: -6px;
  left: 18px;
  height: 12px;
  cursor: ns-resize;
}

.dashboard-widget__resize--bottom::after {
  position: absolute;
  bottom: 3px;
  left: 50%;
  width: 42px;
  height: 3px;
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  transform: translateX(-50%);
  content: '';
}

.dashboard-widget__resize--top {
  top: -6px;
  right: 18px;
  left: 18px;
  height: 12px;
  cursor: ns-resize;
}

.dashboard-widget__resize--top::after {
  position: absolute;
  top: 3px;
  left: 50%;
  width: 42px;
  height: 3px;
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  transform: translateX(-50%);
  content: '';
}

.dashboard-widget__resize--corner {
  right: -7px;
  bottom: -7px;
  width: 22px;
  height: 22px;
  cursor: nwse-resize;
}

.dashboard-widget__resize--corner::after {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 10px;
  height: 10px;
  background: var(--agentory-color-bg-primary);
  border-radius: 50%;
  content: '';
}

.dashboard-widget__resize--left-top,
.dashboard-widget__resize--right-top,
.dashboard-widget__resize--left-bottom {
  width: 22px;
  height: 22px;
}

.dashboard-widget__resize--left-top {
  top: -7px;
  left: -7px;
  cursor: nwse-resize;
}

.dashboard-widget__resize--right-top {
  top: -7px;
  right: -7px;
  cursor: nesw-resize;
}

.dashboard-widget__resize--left-bottom {
  bottom: -7px;
  left: -7px;
  cursor: nesw-resize;
}

.dashboard-widget__resize--left-top::after,
.dashboard-widget__resize--right-top::after,
.dashboard-widget__resize--left-bottom::after {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--agentory-color-bg-primary);
  border-radius: 50%;
  content: '';
}

.dashboard-widget__resize--left-top::after {
  top: 4px;
  left: 4px;
}

.dashboard-widget__resize--right-top::after {
  top: 4px;
  right: 4px;
}

.dashboard-widget__resize--left-bottom::after {
  bottom: 4px;
  left: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-widget,
  .dashboard-widget__move,
  .dashboard-widget__menu-button,
  .dashboard-widget__save {
    transition: none;
  }
}
</style>
