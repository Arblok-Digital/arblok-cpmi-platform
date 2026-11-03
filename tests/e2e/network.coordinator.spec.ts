import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Koordinator agen — jaringan', () => {
  test('melihat ringkasan jaringan dan agen di bawahnya', async ({ page }) => {
    await login(page, 'agent_coordinator')
    await page.goto('/agen/jaringan')

    await expect(page.locator('h1')).toHaveText('Jaringan saya')
    await expect(page.getByText('Agen dalam jaringan')).toBeVisible()
    await expect(page.getByText('Agen jaringan', { exact: true })).toBeVisible()
    await expect(page.getByText('AGT-014')).toBeVisible()
  })

  test('agen biasa tidak memiliki menu jaringan', async ({ page }) => {
    await login(page, 'agent')
    await page.goto('/agen')

    await expect(page.locator('a[href="/agen/jaringan"]')).toHaveCount(0)

    // rute jaringan dijaga: agen biasa dialihkan ke beranda peran
    await page.goto('/agen/jaringan')
    await expect(page).toHaveURL(/\/agen$/)
    await expect(page.locator('h1')).not.toHaveText('Jaringan saya')
  })
})
