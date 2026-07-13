import { expect, test } from '@playwright/test'

test.setTimeout(60 * 1000)

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

async function getCanvasPaintRatio(canvasLocator) {
  return canvasLocator.evaluate(async (canvas) => {
    if (!canvas.width || !canvas.height) {
      return 0
    }

    const image = new Image()
    image.src = canvas.toDataURL('image/png')
    await image.decode()

    const sampleCanvas = document.createElement('canvas')
    const sampleWidth = 96
    const sampleHeight = Math.max(1, Math.round((canvas.height / canvas.width) * sampleWidth))
    sampleCanvas.width = sampleWidth
    sampleCanvas.height = sampleHeight

    const context = sampleCanvas.getContext('2d')
    context.drawImage(image, 0, 0, sampleWidth, sampleHeight)

    const pixelData = context.getImageData(0, 0, sampleWidth, sampleHeight).data
    let paintedPixels = 0

    for (let index = 3; index < pixelData.length; index += 4) {
      if (pixelData[index] > 12) {
        paintedPixels += 1
      }
    }

    return paintedPixels / (pixelData.length / 4)
  })
}

test('renders dashboard and supports sidebar and layout editing interactions', async ({ page }) => {
  await page.goto('/dashboard')

  const sidebar = page.locator('[data-test="dashboard-sidebar"]')
  const content = page.locator('.dashboard-content')
  const toggleHotspot = page.locator('[data-test="sidebar-toggle-hotspot"]')
  const toggleButton = page.locator('.dashboard-sidebar__toggle')
  const chartTitle = page.locator('[data-test="metric-chart-title"]')
  const factoryCanvas = page.locator('[data-test="factory-3d-canvas"]')

  await expect(page.locator('.dashboard-page')).toBeVisible({ timeout: 15000 })
  await expect(sidebar).toHaveAttribute('data-open', 'false')
  await expect
    .poll(() => getCanvasPaintRatio(factoryCanvas), { timeout: 15000 })
    .toBeGreaterThan(0.08)
  await expect(page.locator('.factory-viewport__status-stack')).toContainText('양호')
  await expect(page.locator('.factory-viewport__status-stack')).toContainText('위험')
  await expect(page.locator('[data-test="assistant-messages"] article')).toHaveCount(0)
  await expect(page.locator('[data-test="quick-commands"]')).toHaveCount(0)
  await expect(page.locator('[data-test="equipment-chart-panel"]')).toBeVisible()
  await expect(chartTitle).toBeVisible()
  await expect(page.locator('[data-test="chartjs-canvas"]')).toBeVisible()
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

  await page
    .locator('.factory-viewport__label--warning, .factory-viewport__label--danger')
    .first()
    .click()
  await expect(page.locator('[data-test="factory-alert-checklist"]')).toBeVisible()
  await expect(page.locator('[data-test="factory-equipment-reinspection"]')).toHaveCount(0)
  await dragBy(page, factoryCanvas, 56, 18)
  await expect(page.locator('[data-test="factory-alert-checklist"]')).toBeVisible()
  await page.locator('.factory-viewport__camera-tools button').click()
  await expect(page.locator('[data-test="factory-alert-checklist"]')).toHaveCount(0)

  await page.locator('[data-test="factory-line-selector-toggle"]').click()
  await page
    .locator('[data-test="factory-line-menu"] .factory-viewport__line-option')
    .nth(1)
    .click()
  await expect(page.locator('[data-test="factory-line-loader"]')).toBeVisible()
  await expect(page.locator('[data-test="factory-line-loader"]')).toHaveCount(0, { timeout: 3000 })

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
  const assistantWidget = page.locator('[data-widget-id="assistant"]')

  const factoryMenuButton = page.locator('[data-test="widget-menu-factory"]')
  const factoryResizeCorner = page.locator('[data-test="widget-resize-corner-factory"]')
  const detailMoveButton = page.locator('[data-test="widget-move-detail"]')
  const detailMenuButton = page.locator('[data-test="widget-menu-detail"]')

  const defaultFactoryRect = await getRect(factoryWidget)
  const defaultDetailRect = await getRect(detailWidget)
  const defaultMetricChartRect = await getRect(metricChartWidget)
  const defaultAssistantRect = await getRect(assistantWidget)

  expect(Math.abs(defaultDetailRect.left - defaultFactoryRect.right - 15)).toBeLessThan(2)
  expect(Math.abs(defaultMetricChartRect.top - defaultDetailRect.bottom - 15)).toBeLessThan(2)
  expect(Math.abs(defaultAssistantRect.left - defaultDetailRect.right - 15)).toBeLessThan(2)
  expect(Math.abs(defaultAssistantRect.height - defaultFactoryRect.height)).toBeLessThan(2)
  await expect(page.locator('[data-widget-id="checklist"]')).toHaveCount(0)

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
  expect(factoryAfterShrink.width).toBeLessThanOrEqual(factoryBefore.width)

  await detailMenuButton.click()
  await expect(page.locator('[data-test="widget-menu-list-detail"]')).toBeVisible()
  await page.mouse.click(20, 20)
  await expect(page.locator('[data-test="widget-menu-list-detail"]')).toHaveCount(0)

  await detailMenuButton.click()
  await page.locator('[data-test="widget-stash-detail"]').click()

  await page.locator('[data-test="dashboard-widget-dock-toggle"]').click()
  await expect(page.locator('[data-test="dashboard-widget-dock-panel"]')).toBeVisible()
  await expect(page.locator('[data-test="dock-restore-detail"]')).toBeVisible()
  await expect(page.locator('[data-test="dock-restore-equipmentAnalysis"]')).toBeVisible()
  await expect(page.locator('[data-test="dock-restore-errorDonut"]')).toBeVisible()

  await page.locator('[data-test="dock-restore-detail"]').click()
  await expect(page.locator('[data-widget-id="detail"]')).toBeVisible()
})

test('keeps expanded sidebar while navigating dashboard sections', async ({ page }) => {
  await page.goto('/dashboard')

  const sidebar = page.locator('[data-test="dashboard-sidebar"]')
  const toggleHotspot = page.locator('[data-test="sidebar-toggle-hotspot"]')
  const toggleButton = page.locator('.dashboard-sidebar__toggle')

  await expect(page.locator('.dashboard-page')).toBeVisible({ timeout: 15000 })
  await expect(sidebar).toHaveAttribute('data-open', 'false')

  const hotspotBox = await toggleHotspot.boundingBox()
  await page.mouse.move(hotspotBox.x + hotspotBox.width / 2, hotspotBox.y + 360)
  await expectToggleOpacity(toggleButton, '1')
  await toggleButton.click()
  await expect(sidebar).toHaveAttribute('data-open', 'true')

  await page.locator('.dashboard-sidebar__item[href="/equipment"]').click()
  await expect(page).toHaveURL(/\/equipment$/)
  await expect(page.locator('[data-test="dashboard-sidebar"]')).toHaveAttribute('data-open', 'true')

  await page.locator('.dashboard-sidebar__item[href="/work-log"]').click()
  await expect(page).toHaveURL(/\/work-log$/)
  await expect(page.locator('[data-test="dashboard-sidebar"]')).toHaveAttribute('data-open', 'true')
})
