import { test, expect } from '@playwright/test'

async function expectTopOffsetWithoutScroll(page) {
  const metrics = await page.locator('.auth-card').evaluate((card) => {
    const rect = card.getBoundingClientRect()
    const probe = document.createElement('div')
    probe.style.position = 'absolute'
    probe.style.top = 'var(--auth-card-top)'
    document.querySelector('.auth-page').appendChild(probe)
    const expectedTop = Number.parseFloat(window.getComputedStyle(probe).top)
    probe.remove()

    return {
      topDelta: Math.abs(rect.top - expectedTop),
      noScroll:
        document.documentElement.scrollHeight <= window.innerHeight &&
        document.body.scrollHeight <= window.innerHeight,
    }
  })

  expect(metrics.topDelta).toBeLessThanOrEqual(1)
  expect(metrics.noScroll).toBe(true)
}

test('visits the login screen by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('로그인')
  await expect(page.locator('input#userId')).toHaveValue('employee1')
  await expect(page.getByLabel('이전 화면으로 이동')).toHaveCount(0)
  await expect(page.getByRole('link', { name: '비밀번호를 잊으셨나요?' })).toBeVisible()
  await expect(page.getByRole('link', { name: '회원가입' })).toBeVisible()
  await expectTopOffsetWithoutScroll(page)

  await page.getByRole('link', { name: '회원가입' }).click()
  await expect(page).toHaveURL(/\/signup$/)
})

test('renders password recovery flow screens', async ({ page }) => {
  await page.goto('/password/find')
  await expect(page.locator('h1')).toHaveText('비밀번호 찾기')
  await expect(page.locator('input#email')).toHaveValue('admin@metanet.co.kr')
  await expect(page.getByRole('button', { name: '인증번호 전송' })).toBeVisible()
  await expect(page.getByLabel('이전 화면으로 이동')).toBeVisible()
  await expectTopOffsetWithoutScroll(page)

  await page.goto('/password/reset')
  await expect(page.locator('h1')).toHaveText('비밀번호 찾기')
  await expect(page.locator('input#newPassword')).toBeVisible()
  await expect(page.getByRole('button', { name: '완료' })).toBeVisible()
  await expect(page.getByLabel('이전 화면으로 이동')).toBeVisible()
  await expectTopOffsetWithoutScroll(page)

  await page.getByLabel('이전 화면으로 이동').click()
  await expect(page).toHaveURL(/\/password\/find$/)
})

test('renders signup screen', async ({ page }) => {
  await page.goto('/signup')
  await expect(page.locator('h1')).toHaveText('회원가입')
  await expect(page.locator('input#userId')).toHaveValue('employee1')
  await expect(page.locator('input#email')).toHaveValue('admin@metanet.co.kr')
  await expect(page.getByLabel('이전 화면으로 이동')).toBeVisible()
  await expectTopOffsetWithoutScroll(page)

  await page.getByLabel('이전 화면으로 이동').click()
  await expect(page).toHaveURL(/\/login$/)
})
