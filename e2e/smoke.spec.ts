import { expect, test } from '@playwright/test'

test('без входу показується форма логіну', async ({ page }) => {
  await page.goto('/#/')
  await expect(page.getByRole('heading', { name: 'Вхід' })).toBeVisible()
  await expect(page.getByLabel('Пошта')).toBeVisible()
})

test('невірний пароль показує помилку', async ({ page }) => {
  await page.goto('/#/')
  await page.getByLabel('Пошта').fill('nobody@example.com')
  await page.getByLabel('Пароль').fill('wrong-password')
  await page.getByRole('button', { name: 'Увійти' }).click()
  await expect(page.getByText('Невірна пошта або пароль')).toBeVisible()
})
