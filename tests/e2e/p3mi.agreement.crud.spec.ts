import { test, expect } from '@playwright/test'
import { login } from './helpers'

const number = 'E2E-AG-2026-999'

test.describe('P3MI — perjanjian agen', () => {
  test('validasi wajib isi lalu perjanjian dibuat dan bertahan setelah reload', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/perjanjian-agen')

    await expect(page.locator('h1')).toHaveText('Perjanjian kemitraan')

    await page.getByTestId('agreement-create').click()
    const dialog = page.getByTestId('agreement-form-dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByTestId('agreement-submit').click()
    await expect(dialog).toBeVisible()
    await expect(page.getByText('Validasi gagal')).toBeVisible()

    await dialog.locator('#agr-number').fill(number)
    await dialog.getByTestId('agreement-submit').click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText('Perjanjian dibuat')).toBeVisible()
    await expect(page.getByText(number, { exact: true })).toBeVisible()

    await page.reload()
    await expect(page.getByText(number, { exact: true })).toBeVisible()
  })

  test('perjanjian dapat dihapus permanen', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/perjanjian-agen')

    await page.getByTestId('agreement-create').click()
    const form = page.getByTestId('agreement-form-dialog')
    await form.locator('#agr-number').fill(number)
    await form.getByTestId('agreement-submit').click()
    await expect(form).toBeHidden()

    const card = page
      .locator('div')
      .filter({ hasText: number })
      .filter({ has: page.locator('[data-testid^="agreement-delete-"]') })
      .last()

    await card.locator('[data-testid^="agreement-delete-"]').click()
    const confirm = page.getByTestId('agreement-delete-dialog')
    await expect(confirm).toBeVisible()

    await confirm.getByTestId('agreement-delete-confirm').click()
    await expect(confirm).toBeHidden()
    await expect(page.getByText('Perjanjian dihapus')).toBeVisible()
    await expect(page.getByText(number, { exact: true })).toHaveCount(0)
  })

  test('dialog detail perjanjian tampil tanpa rute 404', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/perjanjian-agen')

    await page.locator('[data-testid^="agreement-detail-"]').first().click()
    const dialog = page.getByTestId('agreement-detail-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Mulai berlaku')
    await expect(page).toHaveURL(/\/p3mi\/perjanjian-agen/)
  })
})
