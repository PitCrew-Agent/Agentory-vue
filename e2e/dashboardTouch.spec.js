import { expect, test } from '@playwright/test'

test.use({
  hasTouch: true,
  viewport: { height: 820, width: 1180 },
})

async function getRect(locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()

    return {
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    }
  })
}

async function getPseudoSize(locator, pseudoElement) {
  return locator.evaluate((element, pseudo) => {
    const style = window.getComputedStyle(element, pseudo)

    return {
      height: Number.parseFloat(style.height),
      width: Number.parseFloat(style.width),
    }
  }, pseudoElement)
}

async function dragWithTouch(page, locator, deltaX, deltaY, pointerId = 11) {
  const box = await locator.boundingBox()

  expect(box).not.toBeNull()

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2

  await locator.dispatchEvent('pointerdown', {
    bubbles: true,
    button: 0,
    buttons: 1,
    clientX: startX,
    clientY: startY,
    isPrimary: true,
    pointerId,
    pointerType: 'touch',
  })

  for (let step = 1; step <= 6; step += 1) {
    await page.evaluate(
      ({ clientX, clientY, id }) => {
        window.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            buttons: 1,
            clientX,
            clientY,
            isPrimary: true,
            pointerId: id,
            pointerType: 'touch',
          }),
        )
      },
      {
        clientX: startX + (deltaX * step) / 6,
        clientY: startY + (deltaY * step) / 6,
        id: pointerId,
      },
    )
  }

  await page.evaluate(
    ({ clientX, clientY, id }) => {
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          button: 0,
          buttons: 0,
          clientX,
          clientY,
          isPrimary: true,
          pointerId: id,
          pointerType: 'touch',
        }),
      )
    },
    { clientX: startX + deltaX, clientY: startY + deltaY, id: pointerId },
  )
}

test('터치 한 번의 드래그로 위젯을 이동하고 크기를 조절한다', async ({ page }) => {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      contentType: 'application/json',
      json: {
        email: 'tablet@example.com',
        id: 95,
        lines: [{ code: 'A', id: 1, name: 'A-Line' }],
        name: '태블릿 사용자',
        role: 'field_engineer',
        status: 'active',
      },
      status: 200,
    }),
  )
  await page.goto('/dashboard')

  const detailWidget = page.locator('[data-widget-id="detail"]')
  const detailMoveButton = page.locator('[data-test="widget-move-detail"]')

  await expect(detailWidget).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.dashboard-content-loader')).toHaveCount(0, { timeout: 15000 })

  await page.locator('[data-test="widget-menu-assistant"]').click()
  await page.locator('[data-test="widget-stash-assistant"]').click()

  const moveTargetRect = await getRect(detailMoveButton)
  const moveTouchTargetSize = await getPseudoSize(detailMoveButton, '::before')

  expect(moveTargetRect.width).toBeGreaterThanOrEqual(19.5)
  expect(moveTargetRect.width).toBeLessThanOrEqual(20.5)
  expect(moveTargetRect.height).toBeGreaterThanOrEqual(19.5)
  expect(moveTargetRect.height).toBeLessThanOrEqual(20.5)
  expect(moveTouchTargetSize.width).toBe(44)
  expect(moveTouchTargetSize.height).toBe(44)

  const beforeMove = await getRect(detailWidget)

  await dragWithTouch(page, detailMoveButton, 260, 0)

  await expect(detailWidget).toHaveClass(/dashboard-widget--touch-editing/)
  await expect(page.locator('[data-test="widget-touch-drag-detail"]')).toBeVisible()
  await expect
    .poll(async () => (await getRect(detailWidget)).left)
    .toBeGreaterThan(beforeMove.left + 100)

  const bottomResizeHandle = page.locator('[data-test="widget-resize-bottom-detail"]')
  const resizeTargetRect = await getRect(bottomResizeHandle)

  expect(resizeTargetRect.height).toBeGreaterThanOrEqual(43.5)

  const beforeResize = await getRect(detailWidget)

  await dragWithTouch(page, bottomResizeHandle, 0, 300, 12)

  await expect
    .poll(async () => (await getRect(detailWidget)).height)
    .toBeGreaterThan(beforeResize.height + 100)

  await page.locator('[data-test="widget-save-detail"]').click()
  await expect(detailWidget).not.toHaveClass(/dashboard-widget--touch-editing/)
  await expect(bottomResizeHandle).toHaveCount(0)

  const storedLayout = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('agentory-dashboard-layout')),
  )

  expect(storedLayout.layouts.detail.col).toBe(3)
  expect(storedLayout.layouts.detail.rows).toBe(2)
})
