import { expect, test } from '@playwright/test';

test('debug home navigation after clicking list home button', async ({ page }) => {
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (error) => {
    pageErrors.push(String(error));
  });

  await page.goto('/');
  await page.getByPlaceholder('우리 리스트 이름').fill('주말 버킷리스트');
  await page.getByPlaceholder('내 이름').fill('재원');
  await page.getByRole('button', { name: '공유 리스트 만들기' }).click();
  await expect(page).toHaveURL(/\/list\/.+/);

  await page.getByRole('link', { name: '홈으로', exact: true }).click();

  await expect(page).toHaveURL(/\/\?fresh=1&from=list/);
  await expect(page.getByRole('heading', { name: '같이 쓰는 버킷리스트' })).toBeVisible();
  await expect(page.getByRole('button', { name: '리스트로 돌아가기' })).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(consoleMessages.filter((message) => /\[error\]/i.test(message))).toEqual([]);
});
