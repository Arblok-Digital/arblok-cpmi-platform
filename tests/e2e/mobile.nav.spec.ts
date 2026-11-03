import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Navigasi mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('bottom nav tampil dan sidebar desktop tersembunyi', async ({ page }) => {
    await login(page, 'agent')
    await page.goto('/agen')

    await expect(page.getByTestId('mobile-bottom-nav')).toBeVisible()
    await expect(page.getByTestId('mobile-nav--agen/kandidat')).toBeVisible()
    await expect(page.getByTestId('mobile-nav--agen/komisi')).toBeVisible()
    await expect(page.getByTestId('sidebar')).toBeHidden()
  })

  test('navigasi antar tab mobile berfungsi', async ({ page }) => {
    await login(page, 'agent')
    await page.goto('/agen')

    await page.getByTestId('mobile-nav--agen/kandidat').click()
    await expect(page).toHaveURL(/\/agen\/kandidat/)

    await page.getByTestId('mobile-nav--agen/komisi').click()
    await expect(page).toHaveURL(/\/agen\/komisi/)
  })

  test('sheet "Lainnya" membuka aksi akun', async ({ page }) => {
    await login(page, 'agent')
    await page.goto('/agen')

    await page.getByTestId('mobile-nav-more-btn').click()
    await expect(page.getByRole('button', { name: 'Keluar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reset demo' })).toBeVisible()
  })
})

test.describe('Desktop lebar', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('sidebar tampil dan bottom nav tersembunyi pada layar lebar', async ({ page }) => {
    await login(page, 'agent')
    await page.goto('/agen')

    await expect(page.getByTestId('sidebar')).toBeVisible()
    await expect(page.getByTestId('mobile-bottom-nav')).toBeHidden()
  })
})
