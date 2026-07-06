import { expect, test } from '@playwright/test'

async function expectToggleOpacity(toggleButton, opacity) {
  await expect
    .poll(() => toggleButton.evaluate((element) => window.getComputedStyle(element).opacity))
    .toBe(opacity)
}

async function getRect(locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()

    return {
      bottom: rect.bottom,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      width: rect.width,
    }
  })
}

async function dragBy(page, locator, deltaX, deltaY) {
  const box = await locator.boundingBox()

  expect(box).not.toBeNull()

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 })
  await page.mouse.up()
}

async function expectSeparatedEventually(firstLocator, secondLocator, minimumGap = 14) {
  await expect
    .poll(async () => {
      const firstRect = await getRect(firstLocator)
      const secondRect = await getRect(secondLocator)

      return (
        firstRect.right + minimumGap <= secondRect.left ||
        secondRect.right + minimumGap <= firstRect.left ||
        firstRect.bottom + minimumGap <= secondRect.top ||
        secondRect.bottom + minimumGap <= firstRect.top
      )
    })
    .toBe(true)
}

test('renders dashboard and supports sidebar and layout editing interactions', async ({ page }) => {
  await page.goto('/dashboard')

  const sidebar = page.locator('[data-test="dashboard-sidebar"]')
  const content = page.locator('.dashboard-content')
  const toggleHotspot = page.locator('[data-test="sidebar-toggle-hotspot"]')
  const toggleButton = page.locator('.dashboard-sidebar__toggle')
  const chartTitle = page.locator('[data-test="metric-chart-title"]')

  await expect(page.locator('.dashboard-page')).toBeVisible()
  await expect(sidebar).toHaveAttribute('data-open', 'false')
  await expect(page.locator('[data-test="assistant-messages"] article')).toHaveCount(0)
  await expect(page.locator('[data-test="quick-commands"]')).toHaveCount(0)
  await expect(page.locator('[data-test="equipment-chart-panel"]')).toBeVisible()
  await expect(chartTitle).toBeVisible()
  await expect(page.locator('[data-test="metric-chart-x-label"]')).toHaveCount(5)
  await expect
    .poll(() =>
      page.locator('.detail-panel__info-grid').evaluate((element) => {
        const columns = window.getComputedStyle(element).gridTemplateColumns

        return columns.split(' ').filter(Boolean).length
      }),
    )
    .toBe(2)

  const initialChartTitle = await chartTitle.textContent()
  await page.locator('[data-test="metric-pressure"]').click()
  await expect.poll(() => chartTitle.textContent()).not.toBe(initialChartTitle)

  const pressureChartTitle = await chartTitle.textContent()
  await page.locator('[data-test="metric-rfPower"]').click()
  await expect.poll(() => chartTitle.textContent()).not.toBe(pressureChartTitle)

  const rfPowerChartTitle = await chartTitle.textContent()
  await page.locator('[data-test="metric-gasFlow"]').click()
  await expect.poll(() => chartTitle.textContent()).not.toBe(rfPowerChartTitle)

  await expectToggleOpacity(toggleButton, '0')

  const hotspotBox = await toggleHotspot.boundingBox()
  await page.mouse.move(hotspotBox.x + hotspotBox.width / 2, hotspotBox.y + 420)
  await expectToggleOpacity(toggleButton, '1')

  const toggleRect = await getRect(toggleButton)
  expect(Math.abs(toggleRect.top + toggleRect.height / 2 - (hotspotBox.y + 420))).toBeLessThan(16)
  await expect(toggleButton.locator('img')).toBeVisible()

  const collapsedLeft = await content.evaluate((element) => element.getBoundingClientRect().left)

  await toggleButton.click()
  await expect(sidebar).toHaveAttribute('data-open', 'true')

  await expect
    .poll(() => content.evaluate((element) => element.getBoundingClientRect().left))
    .toBeGreaterThan(collapsedLeft)

  await page.mouse.move(600, 400)
  await expectToggleOpacity(toggleButton, '0')

  await expect(page.locator('.dashboard-widget__resize--right')).toHaveCount(0)

  const factoryWidget = page.locator('[data-widget-id="factory"]')
  const detailWidget = page.locator('[data-widget-id="detail"]')
  const metricChartWidget = page.locator('[data-widget-id="metricChart"]')
  const checklistWidget = page.locator('[data-widget-id="checklist"]')
  const assistantWidget = page.locator('[data-widget-id="assistant"]')

  const factoryMenuButton = page.locator('[data-test="widget-menu-factory"]')
  const factoryResizeCorner = page.locator('[data-test="widget-resize-corner-factory"]')
  const detailMoveButton = page.locator('[data-test="widget-move-detail"]')
  const detailMenuButton = page.locator('[data-test="widget-menu-detail"]')
  const detailResizeLeft = page.locator('[data-test="widget-resize-left-detail"]')
  const detailResizeRight = page.locator('[data-test="widget-resize-right-detail"]')
  const detailResizeTop = page.locator('[data-test="widget-resize-top-detail"]')

  const defaultFactoryRect = await getRect(factoryWidget)
  const defaultDetailRect = await getRect(detailWidget)
  const defaultMetricChartRect = await getRect(metricChartWidget)
  const defaultChecklistRect = await getRect(checklistWidget)
  const defaultAssistantRect = await getRect(assistantWidget)

  expect(Math.abs(defaultAssistantRect.left - defaultFactoryRect.right - 15)).toBeLessThan(2)
  expect(Math.abs(defaultDetailRect.top - defaultFactoryRect.bottom - 15)).toBeLessThan(2)
  expect(Math.abs(defaultMetricChartRect.left - defaultDetailRect.right - 15)).toBeLessThan(2)
  expect(Math.abs(defaultChecklistRect.left - defaultMetricChartRect.right - 15)).toBeLessThan(2)

  await expect(detailMoveButton).toBeVisible()
  await expect(factoryResizeCorner).toHaveCount(0)

  await page.locator('[data-test="widget-menu-assistant"]').click()
  await page.locator('[data-test="widget-stash-assistant"]').click()
  await expect(assistantWidget).toHaveCount(0)

  await factoryMenuButton.click()
  await expect(page.locator('[data-test="widget-menu-list-factory"]')).toBeVisible()
  await page.locator('[data-test="widget-resize-mode-factory"]').click()
  await expect(factoryResizeCorner).toBeVisible()
  await expect(page.locator('[data-test="widget-resize-left-factory"]')).toBeVisible()
  await expect(page.locator('[data-test="widget-resize-top-factory"]')).toBeVisible()
  await expect(page.locator('[data-test="widget-save-factory"]')).toBeVisible()

  const factoryBefore = await getRect(factoryWidget)
  await dragBy(page, factoryResizeCorner, -320, 0)
  await page.locator('[data-test="widget-save-factory"]').click()

  const factoryAfterShrink = await getRect(factoryWidget)
  expect(factoryAfterShrink.width).toBeLessThan(factoryBefore.width - 24)

  const metricChartBeforePush = await getRect(metricChartWidget)
  const moveBox = await detailMoveButton.boundingBox()
  const moveStartX = moveBox.x + moveBox.width / 2
  const moveStartY = moveBox.y + moveBox.height / 2

  await page.mouse.move(moveStartX, moveStartY)
  await page.mouse.down()
  await page.mouse.move(moveStartX + 160, moveStartY, { steps: 8 })
  await expect(detailWidget).toHaveAttribute('data-drop-state', 'valid')
  await expect.poll(() => getRect(metricChartWidget).then((rect) => rect.left)).toBeLessThan(metricChartBeforePush.left - 40)
  await expectSeparatedEventually(detailWidget, metricChartWidget)
  await page.mouse.up()

  await expectSeparatedEventually(detailWidget, metricChartWidget)

  await page.locator('[data-test="widget-menu-checklist"]').click()
  await page.locator('[data-test="widget-stash-checklist"]').click()
  await expect(page.locator('[data-widget-id="checklist"]')).toHaveCount(0)

  await detailMenuButton.click()
  await page.locator('[data-test="widget-resize-mode-detail"]').click()
  await expect(detailResizeRight).toBeVisible()
  await expect(detailResizeLeft).toBeVisible()
  await expect(detailResizeTop).toBeVisible()
  await expect(page.locator('[data-test="widget-save-detail"]')).toBeVisible()

  const detailBeforeGrow = await getRect(detailWidget)
  await dragBy(page, detailResizeRight, 500, 0)

  const detailAfterGrow = await getRect(detailWidget)
  expect(detailAfterGrow.width).toBeGreaterThan(detailBeforeGrow.width + 24)
  await expectSeparatedEventually(detailWidget, metricChartWidget)

  await page.locator('[data-test="widget-save-detail"]').click()

  await detailMenuButton.click()
  await page.locator('[data-test="widget-resize-mode-detail"]').click()
  const detailBeforeNarrow = await getRect(detailWidget)
  await dragBy(page, detailResizeRight, -260, 0)

  const detailAfterNarrow = await getRect(detailWidget)
  expect(detailAfterNarrow.width).toBeLessThan(detailBeforeNarrow.width - 24)
  await expectSeparatedEventually(detailWidget, metricChartWidget)
  await page.locator('[data-test="widget-save-detail"]').click()

  await detailMenuButton.click()
  await expect(page.locator('[data-test="widget-menu-list-detail"]')).toBeVisible()
  await page.mouse.click(20, 20)
  await expect(page.locator('[data-test="widget-menu-list-detail"]')).toHaveCount(0)

  await detailMenuButton.click()
  await page.locator('[data-test="widget-resize-mode-detail"]').click()
  await dragBy(page, detailResizeRight, 500, 0)
  await page.locator('[data-test="widget-save-detail"]').click()
  await expectSeparatedEventually(detailWidget, metricChartWidget)

  const detailBeforeShrink = await getRect(detailWidget)
  await detailMenuButton.click()
  await page.locator('[data-test="widget-resize-mode-detail"]').click()
  await dragBy(page, page.locator('[data-test="widget-resize-bottom-detail"]'), 0, -88)
  await page.locator('[data-test="widget-save-detail"]').click()

  const detailAfterShrink = await getRect(detailWidget)
  expect(detailAfterShrink.height).toBeLessThanOrEqual(detailBeforeShrink.height)

  await expect
    .poll(() =>
      page.locator('.detail-panel__body').evaluate((element) => element.scrollHeight > element.clientHeight),
    )
    .toBe(true)

  await detailMenuButton.click()
  await page.locator('[data-test="widget-stash-detail"]').click()
  await page.locator('[data-test="widget-menu-metricChart"]').click()
  await page.locator('[data-test="widget-resize-mode-metricChart"]').click()
  await dragBy(page, page.locator('[data-test="widget-resize-right-metricChart"]'), 500, 0)
  await expect.poll(() => page.locator('[data-test="metric-chart-x-label"]').count()).toBeGreaterThan(5)
  await page.locator('[data-test="widget-save-metricChart"]').click()

  await page.locator('[data-test="dashboard-widget-dock-toggle"]').click()
  await expect(page.locator('[data-test="dashboard-widget-dock-panel"]')).toBeVisible()
  await expect(page.locator('[data-test="dock-restore-checklist"]')).toBeVisible()

  await page.locator('[data-test="dock-restore-checklist"]').click()
  await expect(page.locator('[data-widget-id="checklist"]')).toBeVisible()
})
