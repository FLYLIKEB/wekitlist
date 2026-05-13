import { test, expect } from '@playwright/test';

test('landing page shows redesigned create list hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Wekitlist').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '함께 쓰는 리스트, 더 간결하게' })).toBeVisible();
  await expect(page.getByRole('button', { name: '새 리스트 만들기' })).toBeVisible();
});
