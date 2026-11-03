import { test, expect } from '@playwright/test'
import { login } from './helpers'

const outstanding = /Rp\s*3\.750\.000/
const afterPayment = /Rp\s*2\.500\.000/

test.describe('Fee & komisi', () => {
  test('P3MI mencatat pembayaran dengan alokasi FIFO dan outstanding turun', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/fee')

    await expect(page.locator('h1')).toHaveText(/Perjanjian fee/i)
    await expect(page.getByText(outstanding).first()).toBeVisible()

    await page.getByRole('button', { name: 'Bayar', exact: true }).first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Catat pembayaran agen')

    await dialog.locator('#pay-agent').selectOption('ag-neng')
    await dialog.locator('#pay-amount').fill('1250000')
    await dialog.locator('#pay-ref').fill('E2E-PAY-001')
    await dialog.getByRole('button', { name: 'Catat pembayaran' }).click()

    await expect(page.getByText('Pembayaran dicatat')).toBeVisible()
    await expect(page.getByText(afterPayment).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Pembayaran\s*4$/ })).toBeVisible()
  })

  test('nominal melebihi outstanding ditolak', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/fee')

    await page.getByRole('button', { name: 'Bayar', exact: true }).first().click()
    const dialog = page.getByRole('dialog')

    await dialog.locator('#pay-agent').selectOption('ag-neng')
    await dialog.locator('#pay-amount').fill('9999999')
    await dialog.getByRole('button', { name: 'Catat pembayaran' }).click()

    // Dialog tetap terbuka, tidak ada pembayaran tercatat
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/melebihi outstanding/i)
    await expect(page.getByText(outstanding).first()).toBeVisible()
  })

  test('reviewer P3MI tidak dapat menyetujui atau mencatat pembayaran', async ({ page }) => {
    await login(page, 'p3mi_reviewer')
    await page.goto('/p3mi/fee')

    await expect(page.getByText(/empat mata/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Catat pembayaran' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Bayar', exact: true })).toHaveCount(0)
  })

  test('agen hanya melihat komisi, tanpa aksi persetujuan', async ({ page }) => {
    await login(page, 'agent')
    await page.goto('/agen/komisi')

    await expect(page.locator('h1')).toHaveText(/Komisi saya/i)
    await expect(page.getByText('HAK KOMISI')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Setujui|Bayar|Catat pembayaran/ }),
    ).toHaveCount(0)
  })
})
