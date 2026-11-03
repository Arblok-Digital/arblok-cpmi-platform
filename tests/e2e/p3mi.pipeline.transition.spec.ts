import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('P3MI — pipeline 19 status', () => {
  test('pindah status maju tanpa alasan dan tercatat di timeline', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/pipeline')

    await expect(page.locator('h1')).toHaveText('Pipeline penempatan')
    await page.getByTestId('pipeline-candidate-cand-siti').click()

    await expect(page).toHaveURL(/\/p3mi\/kandidat\/cand-siti/)
    await expect(page.getByText('Initial Verification').first()).toBeVisible()

    await page.getByRole('button', { name: 'Perbarui status' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Perbarui status pipeline')

    await dialog.locator('#to-status').selectOption('candidate_screening')
    await dialog.getByRole('button', { name: 'Simpan status' }).click()
    await expect(dialog).toBeHidden()

    await expect(page.getByText('Candidate Screening').first()).toBeVisible()
    await expect(page.getByText(/5 \/ 19/)).toBeVisible()
  })

  test('mundur status tanpa alasan ditolak, dengan alasan diterima', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/kandidat/cand-siti')

    await page.getByRole('button', { name: 'Perbarui status' }).first().click()
    const dialog = page.getByRole('dialog')

    await dialog.locator('#to-status').selectOption('lead_registered')
    await dialog.getByRole('button', { name: 'Simpan status' }).click()
    await expect(dialog).toBeVisible()

    await dialog
      .locator('#status-reason')
      .fill('E2E: koreksi data karena dokumen perlu diverifikasi ulang.')
    await dialog.getByRole('button', { name: 'Simpan status' }).click()
    await expect(dialog).toBeHidden()

    await expect(page.getByText('Lead Registered').first()).toBeVisible()
  })

  test('board memisahkan status cabang dari pipeline aktif', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/pipeline')

    await expect(page.getByText('Status cabang').first()).toBeVisible()
    await expect(page.getByText('Rika Amelia')).toBeVisible()
    await expect(page.getByText('Ditolak').first()).toBeVisible()
  })
})
