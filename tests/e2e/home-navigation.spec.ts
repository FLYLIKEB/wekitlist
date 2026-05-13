import { expect, test } from '@playwright/test';

test('home button opens the home screen with a back button instead of staying on the list', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('우리 리스트 이름').fill('주말 버킷리스트');
  await page.getByPlaceholder('내 이름').fill('재원');
  await page.getByRole('button', { name: '새 리스트 만들기' }).click();

  await expect(page).toHaveURL(/\/list\/.+/);
  await expect(page.getByRole('heading', { name: '주말 버킷리스트' })).toBeVisible();

  await page.getByRole('link', { name: '홈으로', exact: true }).click();

  await expect(page).toHaveURL(/\/\?fresh=1&from=list/);
  await expect(page.getByRole('heading', { name: '함께 쓰는 리스트, 더 간결하게' })).toBeVisible();
  await expect(page.getByRole('button', { name: '리스트로 돌아가기' })).toBeVisible();
});

test('global home link also opens the home screen with a back button from a list', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('우리 리스트 이름').fill('주말 버킷리스트');
  await page.getByPlaceholder('내 이름').fill('재원');
  await page.getByRole('button', { name: '새 리스트 만들기' }).click();

  await expect(page).toHaveURL(/\/list\/.+/);

  await page.getByRole('link', { name: '홈으로', exact: true }).click();

  await expect(page).toHaveURL(/\/\?fresh=1&from=list/);
  await expect(page.getByRole('heading', { name: '함께 쓰는 리스트, 더 간결하게' })).toBeVisible();
  await expect(page.getByRole('button', { name: '리스트로 돌아가기' })).toBeVisible();
});
