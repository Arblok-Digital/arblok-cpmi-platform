import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Admin platform — audit & tenant', () => {
  test('audit menampilkan event lintas tenant dan log akses dokumen', async ({ page }) => {
    await login(page, 'arblok_admin')
    await page.goto('/platform/audit')

    await expect(page.locator('h1')).toHaveText('Audit & keamanan')
    await expect(page.getByText('Event audit', { exact: true })).toBeVisible()
    await expect(page.getByText('Aksi sensitif', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /^Akses dokumen\s*\d+$/ }).click()
    await expect(
      page.getByText('Log akses tidak dapat diedit dari UI demo.'),
    ).toBeVisible()
    await expect(page.getByText('Alasan: Pemeriksaan keaslian ijazah')).toBeVisible()
  })

  test('ekspor audit menghasilkan CSV', async ({ page }) => {
    await login(page, 'arblok_admin')
    await page.goto('/platform/audit')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Ekspor CSV' }).click(),
    ])

    expect(download.suggestedFilename()).toBe('arblok-audit.csv')
    await expect(page.getByText(/Audit diekspor/)).toBeVisible()
  })

  test('admin dapat mengubah status organisasi', async ({ page }) => {
    await login(page, 'arblok_admin')
    await page.goto('/platform/organisasi')

    await expect(page.locator('h1')).toHaveText('Organisasi P3MI')
    await expect(page.locator('main').getByText('Mitra Bhayangkara').first()).toBeVisible()

    await page.getByRole('button', { name: 'Ubah status' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Ubah status')

    await dialog.locator('#org-status').selectOption('active')
    await dialog.getByRole('button', { name: 'Simpan status' }).click()

    await expect(page.getByText('Status organisasi diperbarui')).toBeVisible()
  })
})
