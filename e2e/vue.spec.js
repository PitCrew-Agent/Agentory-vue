import { test, expect } from '@playwright/test'

async function expectAuthScreenWithoutScroll(page) {
  const metrics = await page.evaluate(() => ({
    noScroll:
      document.documentElement.scrollWidth <= window.innerWidth &&
      document.documentElement.scrollHeight <= window.innerHeight,
    hasInput: Boolean(document.querySelector('input')),
  }))

  expect(metrics.noScroll).toBe(true)
  expect(metrics.hasInput).toBe(false)
}

test('visits the Microsoft SSO login screen by default', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('h1')).toHaveText('로그인')
  await expect(page.getByRole('heading', { name: '조직 계정으로 접속' })).toBeVisible()
  await expect(page.getByText('Microsoft Azure SSO')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Microsoft로 계속' })).toBeVisible()
  await expect(page.getByRole('button', { name: '비밀번호 찾기' })).toBeVisible()
  await expectAuthScreenWithoutScroll(page)
})

test('redirects removed auth routes to login', async ({ page }) => {
  for (const path of ['/password/find', '/password/reset', '/signup']) {
    await page.goto(path)

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: '조직 계정으로 접속' })).toBeVisible()
    await expectAuthScreenWithoutScroll(page)
  }
})
