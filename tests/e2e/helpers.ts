import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'demo1234'

export const ACCOUNTS = {
  arblok_admin: 'admin@arblok.id',
  p3mi_admin: 'hendra@mitrabhayangkara.co.id',
  p3mi_reviewer: 'nadia@mitrabhayangkara.co.id',
  agent_coordinator: 'dedi@mitrabhayangkara.co.id',
  agent: 'asep@mitraagen.id',
  agent_neng: 'neng@mitraagen.id',
  cpmi: 'siti.cpmi@example.test',
} as const

export const ROLE_HOME: Record<keyof typeof ACCOUNTS, string> = {
  arblok_admin: '/platform',
  p3mi_admin: '/p3mi',
  p3mi_reviewer: '/p3mi',
  agent_coordinator: '/agen',
  agent: '/agen',
  agent_neng: '/agen',
  cpmi: '/cpmi',
}

/** Logs in through the real form and waits for the app shell. */
export async function login(page: Page, role: keyof typeof ACCOUNTS) {
  await page.goto('/login')
  await expect(page.getByTestId('login-email')).toBeVisible()
  await page.getByTestId('login-email').fill(ACCOUNTS[role])
  await page.getByTestId('login-password').fill(PASSWORD)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('topbar-user-btn')).toBeVisible()
  await expect(page).toHaveURL(new RegExp(ROLE_HOME[role]))
}

/** Clicks a button inside the currently open dialog. */
export async function dialogButton(page: Page, name: string | RegExp) {
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name }).click()
}
