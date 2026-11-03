import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Pengaduan — CPMI ke P3MI', () => {
  test('CPMI membuat pengaduan baru', async ({ page }) => {
    await login(page, 'cpmi')
    await page.goto('/cpmi/bantuan')

    await expect(page.locator('h1')).toHaveText('Bantuan & pengaduan')
    await page.getByRole('button', { name: 'Buat pengaduan' }).click()

    const dialog = page.getByRole('dialog')
    // submit kosong harus ditolak
    await dialog.getByRole('button', { name: 'Kirim pengaduan' }).click()
    await expect(dialog).toBeVisible()

    await dialog.locator('#complaint-candidate').selectOption('cand-siti')
    await dialog.locator('#complaint-category').selectOption({ label: 'Komunikasi' })
    await dialog.locator('#complaint-urgency').selectOption({ index: 2 })
    await dialog
      .locator('#complaint-description')
      .fill(
        'E2E: belum menerima balasan jadwal wawancara selama tiga hari. Mohon dibantu konfirmasi.',
      )
    await dialog.getByRole('button', { name: 'Kirim pengaduan' }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText('ADU-2026-000003').first()).toBeVisible()
  })

  test('P3MI menindaklanjuti sampai selesai', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/pengaduan')

    await expect(page.getByText('LAYANAN & KEPATUHAN')).toBeVisible()
    await page.getByRole('button', { name: 'Tindak lanjuti' }).first().click()

    const dialog = page.getByRole('dialog')
    const title = await dialog.getByRole('heading').first().innerText()
    const code = title.match(/ADU-\d{4}-\d+/)?.[0] ?? ''

    await dialog.locator('#complaint-status').selectOption('resolved')
    await dialog.getByRole('button', { name: 'Simpan tindak lanjut' }).click()
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/minimal|wajib/i)

    await dialog
      .locator('#complaint-resolution')
      .fill('E2E: pelapor dihubungi dan jadwal dikonfirmasi ulang pada 3 Nov 2026.')
    await dialog.getByRole('button', { name: 'Simpan tindak lanjut' }).click()

    await expect(dialog).toBeHidden()
    await page.getByRole('button', { name: /^Selesai\s*\d+$/ }).click()
    await expect(page.getByText(code).first()).toBeVisible()
  })
})
