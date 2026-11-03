import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('P3MI — terima referral', () => {
  test('menerima referral mengunci sumber dan memperbarui antrean', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/referral')

    const waitingBefore = await page
      .getByRole('button', { name: /^Menunggu\s*\d+$/ })
      .innerText()
    const before = Number(waitingBefore.match(/\d+/)?.[0] ?? '0')
    expect(before).toBeGreaterThan(0)

    await page.getByRole('link', { name: 'Tinjau' }).first().click()
    await expect(page).toHaveURL(/\/p3mi\/referral\//)

    // Consent pemrosesan dan pembagian data tercatat terpisah
    await expect(page.getByText('Persetujuan CPMI')).toBeVisible()
    await expect(page.getByText('Pembagian data kepada P3MI')).toBeVisible()

    await page.getByRole('button', { name: 'Terima referral' }).click()
    const dialog = page.getByTestId('referral-decision-dialog')
    await expect(dialog).toContainText('Sumber referral akan dikunci')

    // Sebagian referral seed membawa peringatan duplikat; konfirmasi dulu.
    const ack = dialog.locator('#ack-duplicate')
    if (await ack.count()) await ack.check()

    await dialog.getByRole('button', { name: 'Ya, terima referral' }).click()

    await expect(page.getByText('Sumber terkunci')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Kelola kandidat' })).toBeVisible()

    await page.goto('/p3mi/referral')
    const waitingAfter = await page
      .getByRole('button', { name: /^Menunggu\s*\d+$/ })
      .innerText()
    const after = Number(waitingAfter.match(/\d+/)?.[0] ?? '0')
    expect(after).toBe(before - 1)
  })

  test('menolak referral mewajibkan alasan', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/referral')
    await page.getByRole('link', { name: 'Tinjau' }).first().click()

    await page.getByRole('button', { name: 'Tolak dengan alasan' }).click()
    const dialog = page.getByTestId('referral-decision-dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: 'Tolak referral' }).click()
    await expect(dialog).toContainText('Alasan minimal 5 karakter')

    await dialog
      .locator('#decision-reason')
      .fill('E2E: data tidak lengkap dan tidak dapat diverifikasi.')
    await dialog.getByRole('button', { name: 'Tolak referral' }).click()
    await expect(page.getByText('Referral ditolak').first()).toBeVisible()
  })
})
