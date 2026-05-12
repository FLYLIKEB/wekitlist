import { expect, test } from '@playwright/test';

test('share popover shows copy buttons and current link copy shows toast', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('우리 리스트 이름').fill('주말 버킷리스트');
  await page.getByPlaceholder('내 이름').fill('재원');
  await page.getByRole('button', { name: '공유 리스트 만들기' }).click();

  await expect(page).toHaveURL(/\/list\/.+/);

  await page.getByRole('button', { name: '공유' }).click();
  await expect(page.getByRole('button', { name: '현재 링크 복사' })).toBeVisible();
  await expect(page.getByRole('button', { name: '초대 링크 복사' })).toBeVisible();

  await page.getByRole('button', { name: '현재 링크 복사' }).click();
  await expect(page.getByText('링크를 복사했어요')).toBeVisible();
});

test('user can enter a list through invite link', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('우리 리스트 이름').fill('주말 버킷리스트');
  await page.getByPlaceholder('내 이름').fill('재원');
  await page.getByRole('button', { name: '공유 리스트 만들기' }).click();

  await expect(page).toHaveURL(/\/list\/.+/);

  const inviteButton = page.getByRole('button', { name: '공유' });
  await inviteButton.click();
  await page.getByRole('button', { name: '초대 링크 복사' }).click();

  const invitePath = await page.evaluate(() => window.localStorage.getItem('lastCopiedInvitePath'));
  expect(invitePath).toBeTruthy();

  await page.goto(invitePath!);
  await expect(page.getByRole('heading', { name: '주말 버킷리스트' })).toBeVisible();
});
