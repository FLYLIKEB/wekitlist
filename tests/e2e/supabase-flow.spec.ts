import { test, expect } from '@playwright/test';

test('user can create a Supabase-backed list and reload it by URL', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('우리 리스트 이름').fill('주말 버킷리스트');
  await page.getByPlaceholder('내 이름').fill('재원');
  await page.getByRole('button', { name: '공유 리스트 만들기' }).click();

  await expect(page).toHaveURL(/\/list\/.+/);
  await expect(page.getByRole('heading', { name: '주말 버킷리스트' })).toBeVisible();

  await page.getByPlaceholder('하고 싶은 일을 적어보세요').fill('한강 산책');
  await page.getByRole('button', { name: '항목 추가' }).click();
  await expect(page.getByText('한강 산책')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: '주말 버킷리스트' })).toBeVisible();
  await expect(page.getByText('한강 산책')).toBeVisible();
});
