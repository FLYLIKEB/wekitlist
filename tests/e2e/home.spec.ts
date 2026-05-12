import { test, expect } from '@playwright/test';

test('landing page shows create list CTA', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '같이 쓰는 버킷리스트' })).toBeVisible();
  await expect(page.getByRole('button', { name: '공유 리스트 만들기' })).toBeVisible();
});
