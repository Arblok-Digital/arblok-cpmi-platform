import { test, expect } from '@playwright/test'
import { ACCOUNTS, ROLE_HOME, login } from './helpers'

test.describe('Authentication — 6 roles', () => {
  for (const [role, email] of Object.entries(ACCOUNTS)) {
    test(`login sebagai ${role} (${email})`, async ({ page }) => {
      await page.goto('/login')
      await expect(page.getByTestId('login-email')).toBeVisible()
      await expect(page.getByTestId('login-form-title')).toContainText('Selamat datang')

      await login(page, role as keyof typeof ACCOUNTS)

      await expect(page).toHaveURL(new RegExp(ROLE_HOME[role as keyof typeof ACCOUNTS]))
      await expect(page.getByTestId('sidebar')).toBeVisible()
    })
  }

  test('password salah menampilkan pesan galat', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-email').fill(ACCOUNTS.p3mi_admin)
    await page.getByTestId('login-password').fill('salah-sekali')
    await page.getByTestId('login-submit').click()

    await expect(page.getByRole('alert')).toContainText('Kata sandi demo tidak sesuai')
    await expect(page).toHaveURL(/\/login/)
  })

  test('logout mengembalikan ke halaman masuk', async ({ page }) => {
    await login(page, 'arblok_admin')
    await page.getByTestId('sidebar-logout-btn').click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('akses lintas peran dialihkan ke beranda peran', async ({ page }) => {
    await login(page, 'agent')

    await page.goto('/platform/audit')
    await expect(page).toHaveURL(/\/agen$/)

    await page.goto('/p3mi/referral')
    await expect(page).toHaveURL(/\/agen$/)

    await page.goto('/cpmi/data')
    await expect(page).toHaveURL(/\/agen$/)
  })

  test('halaman tidak dikenal menampilkan 404', async ({ page }) => {
    await login(page, 'cpmi')
    await page.goto('/halaman-tidak-ada')
    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByText('Halaman tidak ditemukan')).toBeVisible()
  })
})
