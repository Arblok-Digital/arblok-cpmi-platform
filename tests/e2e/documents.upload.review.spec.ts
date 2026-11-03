import { test, expect } from '@playwright/test'
import { login } from './helpers'

const pdf = {
  name: 'kk-siti.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n% Synthetic E2E document\n%%EOF\n'),
}

test.describe('Dokumen — unggah CPMI & verifikasi P3MI', () => {
  test('CPMI mengunggah versi baru dokumen', async ({ page }) => {
    await login(page, 'cpmi')
    await page.goto('/cpmi/dokumen')

    await expect(page.locator('h1')).toHaveText('Dokumen saya')
    await expect(page.getByText('Demo: berkas tidak disimpan')).toBeVisible()

    const input = page.locator('input[type="file"][aria-label^="Pilih file"]').first()
    await input.setInputFiles(pdf)
    await page.getByRole('button', { name: 'Unggah Dokumen' }).click()

    await expect(page.getByText('Dokumen dikirim')).toBeVisible()
  })

  test('tipe dan ukuran file ditolak dengan pesan yang terlihat', async ({ page }) => {
    await login(page, 'cpmi')
    await page.goto('/cpmi/dokumen')

    const input = page.locator('input[type="file"][aria-label^="Pilih file"]').first()

    await input.setInputFiles({
      name: 'malware.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('MZ'),
    })
    await expect(page.getByRole('alert')).toContainText('Tipe file tidak didukung')
    await expect(page.getByRole('button', { name: 'Unggah Dokumen' })).toHaveCount(0)

    await input.setInputFiles({
      name: 'besar.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(4 * 1024 * 1024),
    })
    await expect(page.getByRole('alert')).toContainText('Ukuran file maksimal 3.0 MB')

    await input.setInputFiles(pdf)
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Unggah Dokumen' })).toBeVisible()
  })

  test('P3MI menyetujui dokumen setelah membuka keputusan pemeriksaan', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/dokumen')

    await expect(page.locator('h1')).toHaveText('Verifikasi dokumen')
    await page.locator('[data-testid^="doc-decide-"]').first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Keputusan pemeriksaan dokumen')
    await dialog.getByRole('button', { name: 'Setujui' }).click()
    await dialog.getByRole('button', { name: 'Simpan keputusan' }).click()

    await expect(page.getByText('Dokumen disetujui')).toBeVisible()
  })

  test('permintaan revisi mewajibkan catatan pemeriksa', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/dokumen')

    await page.locator('[data-testid^="doc-decide-"]').first().click()
    const dialog = page.getByRole('dialog')

    await dialog.getByRole('button', { name: 'Minta revisi' }).click()
    await dialog.getByRole('button', { name: 'Simpan keputusan' }).click()
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Alasan minimal 5 karakter')

    await dialog
      .locator('#review-reason')
      .fill('Foto buram, mohon unggah ulang dengan pencahayaan cukup.')
    await dialog.getByRole('button', { name: 'Simpan keputusan' }).click()
    await expect(page.getByText('Permintaan revisi dikirim')).toBeVisible()
  })

  test('pratinjau dokumen mewajibkan alasan akses dan tercatat', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/dokumen')

    await page.getByRole('button', { name: 'Lihat', exact: true }).first().click()
    const dialog = page.getByTestId('doc-access-dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByTestId('doc-access-confirm').click()
    await expect(dialog).toBeVisible()

    await dialog
      .locator('#access-reason')
      .fill('E2E: memeriksa keaslian dokumen untuk verifikasi awal.')
    await dialog.getByTestId('doc-access-confirm').click()

    await expect(page.getByText('Akses dokumen tercatat')).toBeVisible()
  })
})
