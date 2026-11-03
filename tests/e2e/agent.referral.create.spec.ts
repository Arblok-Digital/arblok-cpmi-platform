import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Agen — buat referral', () => {
  test('wizard 3 langkah mengirim referral dan menampilkan kode', async ({ page }) => {
    await login(page, 'agent')
    await page.goto('/agen/referral/baru')

    // Step 1 — data kandidat
    await page.locator('#fullName').fill('E2E Kandidat Uji')
    await page.locator('#phone').fill('081200009999')
    await page.locator('#region').selectOption({ label: 'Tasikmalaya Kota' })
    await page.locator('#education').selectOption({ label: 'SMA/SMK' })
    await page.locator('#vacancyId').selectOption('vac-care-jp')
    await page.locator('#address').fill('Kec. Cihideung, Kota Tasikmalaya')
    await page.getByRole('button', { name: 'Lanjut' }).click()

    // Step 2 — consent terpisah
    await expect(page.getByText('Persetujuan CPMI').first()).toBeVisible()
    await page.locator('#agreeProcessing').check()
    await page.locator('#agreeSharing').check()
    await page.locator('#confirmTruth').check()
    await page.getByRole('button', { name: 'Lanjut' }).click()

    // Step 3 — review tidak boleh terlewati
    await expect(page.getByText('Tinjau sebelum mengirim')).toBeVisible()
    await expect(page.getByText('Referral terkirim')).toHaveCount(0)

    // Tunggu guard anti double-click (400ms) selesai sebelum submit
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Kirim referral' }).click()

    await expect(page.getByText('Referral terkirim').first()).toBeVisible()
    await expect(page.getByText(/RF-\d{4}-\d+/).first()).toBeVisible()
    await expect(page.getByText('Tidak ada peringatan duplikat')).toBeVisible()
  })

  test('consent belum lengkap memblokir langkah berikutnya', async ({ page }) => {
    await login(page, 'agent')
    await page.goto('/agen/referral/baru')

    await page.locator('#fullName').fill('E2E Consent Cek')
    await page.locator('#phone').fill('081200007777')
    await page.locator('#region').selectOption({ label: 'Ciamis' })
    await page.getByRole('button', { name: 'Lanjut' }).click()
    await expect(page.getByText('Persetujuan CPMI').first()).toBeVisible()

    await page.getByRole('button', { name: 'Lanjut' }).click()
    await expect(page.getByText('Persetujuan CPMI').first()).toBeVisible()
    await expect(page.getByText('Tinjau sebelum mengirim')).toHaveCount(0)
  })

  test('nomor telepon duplikat ditandai, bukan dihapus otomatis', async ({ page }) => {
    await login(page, 'agent')
    await page.goto('/agen/referral/baru')

    await page.locator('#fullName').fill('E2E Duplikat Siti')
    await page.locator('#phone').fill('081234567801')
    await page.locator('#region').selectOption({ label: 'Tasikmalaya Kota' })
    await page.getByRole('button', { name: 'Lanjut' }).click()

    await page.locator('#agreeProcessing').check()
    await page.locator('#agreeSharing').check()
    await page.locator('#confirmTruth').check()
    await page.getByRole('button', { name: 'Lanjut' }).click()
    await expect(page.getByText('Tinjau sebelum mengirim')).toBeVisible()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Kirim referral' }).click()

    await expect(page.getByText('Referral terkirim').first()).toBeVisible()
    await expect(page.getByText(/peringatan duplikat/i).first()).toBeVisible()
  })
})
