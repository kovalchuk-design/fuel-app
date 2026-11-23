import { expect, test } from '@playwright/test'

// Мережа до Supabase у тестах підміняється: тест не залежить від зовнішнього сервісу.
test('без входу показується форма логіну', async ({ page }) => {
  await page.goto('/#/')
  await expect(page.getByRole('heading', { name: 'Облік ПММ' })).toBeVisible()
  await expect(page.getByLabel('Пошта')).toBeVisible()
})

test('невірний пароль показує помилку (відповідь 400 від Auth)', async ({ page }) => {
  await page.route('**/auth/v1/token*', (r) =>
    r.fulfill({ status: 400, json: { error: 'invalid_grant', error_description: 'Invalid login credentials' } }))
  await page.goto('/#/')
  await page.getByLabel('Пошта').fill('nobody@example.com')
  await page.getByLabel('Пароль').fill('wrong-password')
  await page.getByRole('button', { name: 'Увійти' }).click()
  await expect(page.getByRole('alert')).toHaveText('Невірна пошта або пароль')
})

test('назва вкладки та значки (SVG, PNG, ICO, apple-touch) задані', async ({ page }) => {
  await page.goto('/#/')
  await expect(page).toHaveTitle('Облік ПММ')
  const hrefs = await page.locator('head link[rel~="icon"], head link[rel="apple-touch-icon"]').evaluateAll((els) => els.map((e) => (e as HTMLLinkElement).getAttribute('href')))
  expect(hrefs.sort()).toEqual(['/apple-touch-icon.png', '/favicon-32.png', '/favicon.ico', '/favicon.svg'])
  // файли значків справді віддаються
  for (const h of hrefs) expect((await page.request.get(h!)).ok(), h!).toBe(true)
})
