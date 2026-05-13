import { test, expect } from '@playwright/test';

test('user can create and use a local shared list', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('우리 리스트 이름').fill('주말 버킷리스트');
  await page.getByPlaceholder('내 이름').fill('재원');
  await page.getByRole('button', { name: '새 리스트 만들기' }).click();

  await expect(page.getByRole('heading', { name: '주말 버킷리스트' })).toBeVisible();

  await page.getByPlaceholder('새 항목').fill('한강 산책');
  await page.getByRole('button', { name: '항목 추가' }).click();

  await expect(page.getByText('한강 산책')).toBeVisible();

  await page.getByRole('button', { name: '완료' }).click();
  await expect(page.getByText('완료됨')).toBeVisible();
  await expect(page.getByText('한강 산책')).toBeVisible();
});
