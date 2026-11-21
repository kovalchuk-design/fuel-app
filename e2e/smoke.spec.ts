import { expect, test } from '@playwright/test'

test('головна сторінка відкривається', async ({ page }) => {
  await page.goto('/#/')
  await expect(page.getByRole('heading', { name: /Облік пального/ })).toBeVisible()
})
