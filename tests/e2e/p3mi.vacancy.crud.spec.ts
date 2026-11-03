import { test, expect } from '@playwright/test'
import { login } from './helpers'

const title = 'E2E Lowongan Uji'

test.describe('P3MI — CRUD lowongan', () => {
  test('form kosong ditolak, lowongan valid dibuat dan bertahan setelah reload', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/lowongan')

    await expect(page.locator('h1')).toHaveText('Daftar lowongan')

    // Negara & sektor sudah terisi dari job order pertama (tidak lagi kosong diam-diam)
    await page.getByTestId('vacancy-create').click()
    const dialog = page.getByTestId('vacancy-form-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('#vac-country')).not.toHaveValue('')
    await expect(dialog.locator('#vac-sector')).not.toHaveValue('')

    // Submit kosong harus ditolak dengan pesan validasi
    await dialog.getByTestId('vacancy-submit').click()
    await expect(dialog).toBeVisible()
    await expect(page.getByText('Validasi gagal')).toBeVisible()

    // Isi data valid
    await dialog.locator('#vac-title').fill(title)
    await dialog.locator('input[placeholder="Persyaratan 1"]').fill('Sehat jasmani dan rohani')
    await dialog.getByTestId('vacancy-submit').click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText('Lowongan dibuat')).toBeVisible()
    await expect(page.getByText(title, { exact: true })).toBeVisible()

    // Persistensi: data harus tetap ada setelah reload (localStorage)
    await page.reload()
    await expect(page.getByText(title, { exact: true })).toBeVisible()
  })

  test('lowongan dapat dihapus permanen', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/lowongan')

    await page.getByTestId('vacancy-create').click()
    const form = page.getByTestId('vacancy-form-dialog')
    await form.locator('#vac-title').fill(title)
    await form.locator('input[placeholder="Persyaratan 1"]').fill('Bersedia ditempatkan di luar negeri')
    await form.getByTestId('vacancy-submit').click()
    await expect(form).toBeHidden()

    const card = page
      .locator('div')
      .filter({ hasText: title })
      .filter({ has: page.locator('[data-testid^="vacancy-delete-"]') })
      .last()

    await card.locator('[data-testid^="vacancy-delete-"]').click()
    const confirm = page.getByTestId('vacancy-delete-dialog')
    await expect(confirm).toBeVisible()
    await expect(confirm).toContainText('Hapus lowongan')

    await confirm.getByTestId('vacancy-delete-confirm').click()
    await expect(confirm).toBeHidden()
    await expect(page.getByText('Lowongan dihapus')).toBeVisible()
    await expect(page.getByText(title, { exact: true })).toHaveCount(0)
  })

  test('dialog detail menampilkan persyaratan lowongan', async ({ page }) => {
    await login(page, 'p3mi_admin')
    await page.goto('/p3mi/lowongan')

    await page.locator('[data-testid^="vacancy-detail-"]').first().click()
    const dialog = page.getByTestId('vacancy-detail-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Persyaratan')
    await expect(dialog).toContainText('Negara tujuan')

    // Detail tidak mengarah ke rute 404
    await expect(page).toHaveURL(/\/p3mi\/lowongan/)
  })

  test('reviewer P3MI hanya dapat melihat lowongan', async ({ page }) => {
    await login(page, 'p3mi_reviewer')
    await page.goto('/p3mi/lowongan')

    await expect(page.locator('h1')).toHaveText('Daftar lowongan')
    await expect(page.getByTestId('vacancy-create')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Hapus' })).toHaveCount(0)
    await expect(page.locator('[data-testid^="vacancy-detail-"]').first()).toBeVisible()
  })

  test('agen tidak dapat membuka halaman manajemen lowongan', async ({ page }) => {    await login(page, 'agent')
    await page.goto('/p3mi/lowongan')

    await expect(page).not.toHaveURL(/\/p3mi\/lowongan/)
    await expect(page.getByTestId('vacancy-create')).toHaveCount(0)
  })
})
