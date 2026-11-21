import { expect, test } from '@playwright/test'

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`
const user = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 't@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }

test('чернетку періоду можна видалити після підтвердження', async ({ page }) => {
  let periods = [{ id: 'p1', date_from: '2026-09-25', date_to: '2026-10-25', label: 'жовтень', report_year: 2026, report_month: 10, status: 'draft' }]
  const deleted: string[] = []
  await page.route('**/auth/v1/**', (r) =>
    r.fulfill({ json: r.request().url().includes('/token') ? { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user } : user }))
  for (const t of ['fuel_types', 'vehicles', 'vehicle_fuels']) await page.route(`**/rest/v1/${t}*`, (r) => r.fulfill({ json: [] }))
  await page.route('**/rest/v1/periods*', (r) => {
    if (r.request().method() === 'DELETE') { deleted.push(r.request().url()); periods = []; return r.fulfill({ json: [] }) }
    return r.fulfill({ json: periods })
  })

  await page.goto('/#/')
  await page.getByLabel('Пошта').fill('t@example.com')
  await page.getByLabel('Пароль').fill('x')
  await page.getByRole('button', { name: 'Увійти' }).click()
  await page.getByRole('button', { name: /Видалити звіт/ }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('Видалити звіт за жовтень 2026?')
  // Скасування нічого не видаляє
  await dialog.getByRole('button', { name: 'Скасувати' }).click()
  await expect(dialog).toBeHidden()
  expect(deleted).toHaveLength(0)
  await page.getByRole('button', { name: /Видалити звіт/ }).click()
  await dialog.getByRole('button', { name: 'Видалити' }).click()
  await expect(page.getByText('Звітів ще немає')).toBeVisible()
  expect(deleted).toHaveLength(1)
  expect(deleted[0]).toContain('id=eq.p1')
})
