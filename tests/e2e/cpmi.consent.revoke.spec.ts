import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('CPMI — persetujuan data', () => {
  test('alasan penarikan minimal 10 karakter', async ({ page }) => {
    await login(page, 'cpmi')
    await page.goto('/cpmi/data')

    await expect(page.getByText('Persetujuan aktif').first()).toBeVisible()
    await page.getByRole('button', { name: 'Tarik persetujuan' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.locator('#revoke-reason').fill('pendek')
    await dialog.getByRole('button', { name: 'Tarik persetujuan' }).click()
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/minimal 10 karakter/i)
  })

  test('penarikan menjeda proses dan mengunci unggahan', async ({ page }) => {
    await login(page, 'cpmi')
    await page.goto('/cpmi/data')

    await page.getByRole('button', { name: 'Tarik persetujuan' }).click()
    const dialog = page.getByRole('dialog')
    await dialog
      .locator('#revoke-reason')
      .fill('E2E: saya menghentikan pemrosesan data untuk sementara.')
    await dialog.getByRole('button', { name: 'Tarik persetujuan' }).click()

    await expect(page.getByText('Persetujuan pemrosesan data tidak aktif')).toBeVisible()
    await expect(page.getByText('Persetujuan ditarik').first()).toBeVisible()

    await page.goto('/cpmi/dokumen')
    await expect(page.getByText('Anda tidak dapat mengunggah dokumen baru')).toBeVisible()
    await expect(page.locator('input[type="file"]').first()).toBeDisabled()
  })
})
