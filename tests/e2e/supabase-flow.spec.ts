import { test, expect } from '@playwright/test';

test('user can create a Supabase-backed list and reload it by URL', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('우리 리스트 이름').fill('주말 버킷리스트');
  await page.getByPlaceholder('내 이름').fill('재원');
  await page.getByRole('button', { name: '공유 리스트 만들기' }).click();

  await expect(page).toHaveURL(/\/list\/.+/);
  await expect(page.getByRole('heading', { name: '주말 버킷리스트' })).toBeVisible();

  const input = page.getByPlaceholder('새 항목');
  await expect(input).toBeFocused();
  await input.fill('한강 산책');
  await page.getByRole('button', { name: '상세설정' }).click();
  await page.getByPlaceholder('링크 주소 (https://...)').fill('https://map.kakao.com/example');
  await page.getByPlaceholder('태그를 쉼표로 나눠 적어보세요').fill('데이트, 산책');
  await input.press('Enter');

  const firstItem = page.locator('article').filter({ hasText: '한강 산책' }).first();
  await expect(firstItem).toBeVisible();

  await expect(firstItem.getByRole('link', { name: '링크 열기' })).toBeVisible();
  await expect(firstItem.getByText('데이트', { exact: true })).toBeVisible();
  await expect(firstItem.getByText('산책', { exact: true })).toBeVisible();
  await expect(firstItem.getByText(/방금 전|분 전|시간 전|일 전/)).toBeVisible();

  const addButton = page.getByRole('button', { name: '항목 추가' });

  await expect(input).toBeFocused();
  await input.fill('서울숲 피크닉');
  await expect(addButton).toBeEnabled();
  await input.press('Enter');
  await expect(page.getByText('서울숲 피크닉')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: '주말 버킷리스트' })).toBeVisible();
  await expect(page.getByText('한강 산책')).toBeVisible();
});
