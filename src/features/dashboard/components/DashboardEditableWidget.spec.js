import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import DashboardEditableWidget from '@/features/dashboard/components/DashboardEditableWidget.vue'
import { i18n } from '@/features/i18n'

function createPointerEvent(type, { clientX, clientY, pointerId = 1, pointerType = 'mouse' }) {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
    clientX,
    clientY,
  })

  Object.defineProperties(event, {
    isPrimary: { value: true },
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
  })

  return event
}

function mountWidget({ touchCapable = false } = {}) {
  Object.defineProperty(navigator, 'maxTouchPoints', {
    configurable: true,
    value: touchCapable ? 1 : 0,
  })
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: touchCapable })),
  )

  const board = document.createElement('div')
  const wrapper = mount(DashboardEditableWidget, {
    attachTo: board,
    global: { plugins: [i18n] },
    props: {
      id: 'detail',
      layout: { h: 50, w: 25, x: 50, y: 0 },
      resolveLayout: (id, layout) => ({
        layout,
        layouts: { [id]: layout },
        state: 'valid',
      }),
    },
    slots: { default: '<div>상세 정보</div>' },
  })

  Object.defineProperty(wrapper.element, 'offsetParent', {
    configurable: true,
    value: board,
  })
  vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({
    bottom: 800,
    height: 800,
    left: 0,
    right: 1000,
    top: 0,
    width: 1000,
    x: 0,
    y: 0,
  })

  return wrapper
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('DashboardEditableWidget', () => {
  it('reserves header space only while edit actions are visible', async () => {
    const wrapper = mountWidget()

    await wrapper.get('[data-test="widget-menu-detail"]').trigger('click')
    await wrapper.get('[data-test="widget-resize-mode-detail"]').trigger('click')

    expect(wrapper.classes()).toContain('dashboard-widget--actions-visible')
    expect(wrapper.find('[data-test="widget-save-detail"]').exists()).toBe(true)

    await wrapper.get('[data-test="widget-save-detail"]').trigger('click')

    expect(wrapper.classes()).not.toContain('dashboard-widget--actions-visible')
    expect(wrapper.find('[data-test="widget-save-detail"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('마우스 이동은 기존처럼 포인터를 놓는 즉시 반영한다', async () => {
    const wrapper = mountWidget()
    const moveButton = wrapper.get('[data-test="widget-move-detail"]')

    moveButton.element.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 500, clientY: 100 }),
    )
    window.dispatchEvent(createPointerEvent('pointermove', { clientX: 600, clientY: 100 }))
    window.dispatchEvent(createPointerEvent('pointerup', { clientX: 600, clientY: 100 }))

    expect(wrapper.emitted('update:layout')).toHaveLength(1)
    expect(wrapper.emitted('update:layout')[0][0].detail.x).toBe(60)
    expect(wrapper.classes()).not.toContain('dashboard-widget--touch-editing')

    wrapper.unmount()
  })

  it('터치 이동은 같은 포인터의 한 번의 드래그로 반영하고 편집 핸들을 유지한다', async () => {
    const wrapper = mountWidget({ touchCapable: true })
    const moveButton = wrapper.get('[data-test="widget-move-detail"]')

    moveButton.element.dispatchEvent(
      createPointerEvent('pointerdown', {
        clientX: 500,
        clientY: 100,
        pointerId: 7,
        pointerType: 'touch',
      }),
    )
    window.dispatchEvent(
      createPointerEvent('pointermove', {
        clientX: 600,
        clientY: 100,
        pointerId: 7,
        pointerType: 'touch',
      }),
    )
    window.dispatchEvent(
      createPointerEvent('pointerup', {
        clientX: 600,
        clientY: 100,
        pointerId: 7,
        pointerType: 'touch',
      }),
    )
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:layout')).toHaveLength(1)
    expect(wrapper.classes()).toContain('dashboard-widget--touch-editing')
    expect(wrapper.find('[data-test="widget-touch-drag-detail"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="widget-resize-corner-detail"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('취소된 터치 제스처는 레이아웃을 저장하지 않는다', () => {
    const wrapper = mountWidget({ touchCapable: true })
    const moveButton = wrapper.get('[data-test="widget-move-detail"]')

    moveButton.element.dispatchEvent(
      createPointerEvent('pointerdown', {
        clientX: 500,
        clientY: 100,
        pointerId: 9,
        pointerType: 'touch',
      }),
    )
    window.dispatchEvent(
      createPointerEvent('pointermove', {
        clientX: 600,
        clientY: 100,
        pointerId: 9,
        pointerType: 'touch',
      }),
    )
    window.dispatchEvent(
      createPointerEvent('pointercancel', {
        clientX: 600,
        clientY: 100,
        pointerId: 9,
        pointerType: 'touch',
      }),
    )

    expect(wrapper.emitted('update:layout')).toBeUndefined()
    expect(wrapper.attributes('data-drop-state')).toBeUndefined()

    wrapper.unmount()
  })
})
