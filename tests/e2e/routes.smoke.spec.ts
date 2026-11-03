import { test, expect } from '@playwright/test'
import { ACCOUNTS, login } from './helpers'

type Role = keyof typeof ACCOUNTS

/**
 * Smoke test seluruh rute yang bisa dicapai per peran:
 * setiap tautan internal di shell (sidebar + konten) harus merender halaman,
 * bukan 404, dan tidak menghasilkan error console.
 */
const roles: { role: Role; start: string }[] = [
  { role: 'p3mi_admin', start: '/p3mi' },
  { role: 'p3mi_reviewer', start: '/p3mi' },
  { role: 'agent', start: '/agen' },
  { role: 'agent_coordinator', start: '/agen' },
  { role: 'cpmi', start: '/cpmi' },
  { role: 'arblok_admin', start: '/platform' },
]

const extraRoutes: Record<Role, string[]> = {
  p3mi_admin: [
    '/p3mi/referral',
    '/p3mi/kandidat',
    '/p3mi/pipeline',
    '/p3mi/dokumen',
    '/p3mi/kunjungan',
    '/p3mi/fee',
    '/p3mi/pengaduan',
    '/p3mi/agen',
    '/p3mi/laporan',
    '/p3mi/pengaturan',
    '/p3mi/lowongan',
    '/p3mi/perjanjian-agen',
    '/notifikasi',
  ],
  p3mi_reviewer: [
    '/p3mi/referral',
    '/p3mi/kandidat',
    '/p3mi/pipeline',
    '/p3mi/dokumen',
    '/p3mi/kunjungan',
    '/p3mi/fee',
    '/p3mi/pengaduan',
    '/p3mi/agen',
    '/p3mi/laporan',
    '/p3mi/lowongan',
    '/p3mi/perjanjian-agen',
    '/notifikasi',
  ],
  agent: [
    '/agen/referral/baru',
    '/agen/kandidat',
    '/agen/komisi',
    '/agen/bantuan',
    '/agen/akun',
    '/notifikasi',
  ],
  agent_coordinator: [
    '/agen/referral/baru',
    '/agen/jaringan',
    '/agen/kandidat',
    '/agen/komisi',
    '/agen/bantuan',
    '/agen/akun',
    '/notifikasi',
  ],
  cpmi: ['/cpmi/data', '/cpmi/dokumen', '/cpmi/perkembangan', '/cpmi/bantuan', '/notifikasi'],
  arblok_admin: [
    '/platform/organisasi',
    '/platform/jaringan',
    '/platform/audit',
    '/platform/konfigurasi',
    '/notifikasi',
  ],
}

for (const { role, start } of roles) {
  test(`rute ${role} tidak ada yang 404 atau error console`, async ({ page }) => {
    test.setTimeout(240_000)
    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))

    await login(page, role)
    await page.goto(start)

    const linked = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href^="/"]'))
        .map((a) => a.getAttribute('href') ?? '')
        .filter((href) => href && !href.startsWith('//')),
    )
    const routes = [...new Set([start, ...extraRoutes[role], ...linked])]
    expect(routes.length).toBeGreaterThan(3)

    const failures: string[] = []
    for (const route of routes) {
      errors.length = 0
      await page.goto(route)
      await page.waitForTimeout(350)
      const body = await page.locator('body').innerText()
      if (body.includes('Halaman tidak ditemukan')) failures.push(`${route} → 404`)
      const h1 = await page.locator('h1').count()
      if (h1 === 0) failures.push(`${route} → tanpa h1`)
      if (errors.length) failures.push(`${route} → console: ${errors[0].slice(0, 120)}`)
    }

    expect(failures, `Rute bermasalah:\n${failures.join('\n')}`).toEqual([])
  })
}
