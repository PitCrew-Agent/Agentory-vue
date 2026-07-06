import { expect, test } from '@playwright/test'

test('renders work log screen and supports sidebar navigation', async ({ page }) => {
  await page.goto('/work-log')

  await expect(page.locator('.dashboard-frame-page')).toBeVisible()
  await expect(page.locator('[data-test="dashboard-header-user-button"]')).toHaveText('이준호')
  await page.locator('[data-test="dashboard-header-user-button"]').click()
  await expect(page.locator('[data-test="dashboard-header-profile-card"]')).toBeVisible()
  await expect(page.locator('[data-test="dashboard-header-profile-user-id"]')).toHaveText('employee1')
  await expect(page.locator('[data-test="dashboard-header-profile-department"]')).toHaveText('생산기술팀')
  await page.locator('[data-test="dashboard-header-user-button"]').click()

  await expect(page.locator('[data-test="work-log-panel"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: '작업 로그' })).toBeVisible()
  await expect(page.getByRole('button', { name: '작업 로그 작성' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '2026-07-03' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '2026-07-02' })).toBeVisible()
  await expect(page.locator('[data-test^="work-log-row-"]')).toHaveCount(48)
  await expect(page.getByText('컨베이어 02 진동 센서 점검').first()).toBeVisible()
  await expect(page.locator('.work-log-panel__status--waiting').first()).toHaveText('대기')
  await expect(page.locator('.work-log-panel__status--complete').first()).toHaveText('완료')
  await expect(page.locator('.work-log-panel__status--progress').first()).toHaveText('진행중')

  await expect
    .poll(() =>
      page
        .locator('[data-test="work-log-panel-action"] img')
        .evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth > 0),
    )
    .toBe(true)

  await page.locator('[data-test="work-log-calendar-toggle"]').click()
  await expect(page.locator('[data-test="work-log-calendar-modal"]')).toBeVisible()
  await expect
    .poll(() =>
      page.locator('[data-test="work-log-calendar-toggle"] img').evaluate((image) => {
        const rect = image.getBoundingClientRect()

        return image instanceof HTMLImageElement && image.naturalWidth > 0 && rect.width >= 28
      }),
    )
    .toBe(true)
  await page.locator('[data-test="work-log-calendar-date-2026-07-01"]').click()
  await expect(page.getByRole('heading', { name: '2026-07-01' })).toBeVisible()

  await page.locator('[data-test="work-log-panel-action"]').click()
  await expect(page.locator('[data-test="work-log-create-modal"]')).toBeVisible()
  await expect(page.locator('[data-test="work-log-form-operator"]')).toHaveValue('이준호')
  await expect(page.locator('[data-test="work-log-form-time"]')).not.toHaveValue('')
  await page.locator('[data-test="work-log-form-task"]').fill('신규 작업 로그 점검')
  await page.locator('[data-test="work-log-form-status-progress"]').click()
  await page.locator('[data-test="work-log-form-submit"]').click()
  await expect(page.locator('[data-test="work-log-create-modal"]')).toHaveCount(0)
  await expect(page.locator('[data-test^="work-log-row-"]')).toHaveCount(49)
  await expect(page.locator('[data-test^="work-log-row-"]').filter({ hasText: '신규 작업 로그 점검' })).toHaveCount(1)

  await expect(page.locator('[data-test="dashboard-widget-dock-toggle"]')).toHaveCount(0)

  const viewportHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  const clientHeight = await page.evaluate(() => document.documentElement.clientHeight)
  expect(viewportHeight).toBe(clientHeight)

  await page.getByRole('link', { name: /대시 보드 홈/ }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.locator('.dashboard-page')).toBeVisible()
})

test('renders equipment and notification log screens from sidebar navigation', async ({ page }) => {
  await page.goto('/work-log')

  await page.locator('a[href="/equipment"]').click()
  await expect(page).toHaveURL(/\/equipment$/)
  await expect(page.locator('[data-test="equipment-list-panel"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: '설비 목록' })).toBeVisible()
  await expect(page.getByRole('button', { name: '3D 구조 확인' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'A 라인' })).toBeVisible()
  await expect(page.locator('[data-test^="equipment-list-row-"]')).toHaveCount(36)
  await expect(page.getByText('EQP-002')).toBeVisible()
  await expect(page.getByText('ERR-402').first()).toBeVisible()
  await expect
    .poll(() =>
      page
        .locator('[data-test="equipment-list-panel-action"] img')
        .evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth > 0),
    )
    .toBe(true)

  await page.locator('[data-test="equipment-line-toggle"]').click()
  await expect(page.locator('[data-test="equipment-line-menu"]')).toBeVisible()
  await page.locator('[data-test="equipment-line-f-line"]').click()
  await expect(page.getByRole('heading', { name: 'F 라인' })).toBeVisible()

  await page.locator('[data-test="equipment-list-panel-action"]').click()
  await expect(page.locator('[data-test="equipment-structure-modal"]')).toBeVisible()
  await expect(page.getByText('three.js 기반 3D 화면 공간')).toBeVisible()
  await page.locator('[data-test="equipment-structure-close"]').click()
  await expect(page.locator('[data-test="equipment-structure-modal"]')).toHaveCount(0)

  await page.locator('a[href="/notifications"]').click()
  await expect(page).toHaveURL(/\/notifications$/)
  await expect(page.locator('[data-test="notification-log-panel"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: '알림 이력' })).toBeVisible()
  await expect(page.locator('[data-test^="notification-log-row-"]')).toHaveCount(48)
  await expect(page.getByText('ERR-501').first()).toBeVisible()
  await expect(page.locator('[data-test="dashboard-header-user-button"]')).toHaveText('이준호')
  await expect
    .poll(() =>
      page
        .locator('[data-test="dashboard-header-notification-icon"]')
        .evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth > 0),
    )
    .toBe(true)
  await expect(page.locator('[data-test="dashboard-header-notification-dot"]')).toBeVisible()

  await page.locator('[data-test="notification-calendar-toggle"]').click()
  await expect(page.locator('[data-test="notification-calendar-modal"]')).toBeVisible()
  await page.locator('[data-test="notification-calendar-date-2026-07-01"]').click()
  await expect(page.getByRole('heading', { name: '2026-07-01' })).toBeVisible()

  await page.locator('[data-test="dashboard-header-notification-toggle"]').click()
  await expect(page.locator('[data-test="dashboard-header-notification-dropdown"]')).toBeVisible()
  await page.locator('[data-test="dashboard-header-notification-read-notification-20260703-err501"]').click()
  await expect(page.locator('[data-test="notification-read-status-notification-20260703-err501"]')).toHaveText(
    '읽음',
  )

  await page.locator('[data-test="notification-read-status-notification-20260703-err501"]').click()
  await expect(page.locator('[data-test="notification-read-menu-notification-20260703-err501"]')).toBeVisible()
  await page.locator('[data-test="notification-read-option-notification-20260703-err501-unread"]').click()
  await expect(page.locator('[data-test="notification-read-status-notification-20260703-err501"]')).toHaveText(
    '읽지 않음',
  )

  await page.locator('[data-test="notification-log-panel-action"]').click()
  await expect(page.locator('[data-test="notification-bulk-confirm"]')).toBeVisible()
  await page.locator('[data-test="notification-bulk-confirm-submit"]').click()
  await expect(page.locator('[data-test="notification-bulk-confirm"]')).toHaveCount(0)
  await expect(page.locator('[data-read-status="unread"]')).toHaveCount(0)
  await expect(page.locator('[data-test="dashboard-header-notification-dot"]')).toHaveCount(0)
})
