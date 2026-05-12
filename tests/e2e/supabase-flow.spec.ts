import { test, expect } from '@playwright/test';

test('user can create a Supabase-backed list and reload it by URL', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('우리 리스트 이름').fill('주말 버킷리스트');
  await page.getByPlaceholder('내 이름').fill('재원');
  await page.getByRole('button', { name: '공유 리스트 만들기' }).click();

  await expect(page).toHaveURL(/\/list\/.+/);
  await expect(page.getByRole('heading', { name: '주말 버킷리스트' })).toBeVisible();

  await page.getByPlaceholder('하고 싶은 일을 적어보세요').fill('한강 산책');
  await page.getByRole('button', { name: '상세설정' }).click();
  await page.getByPlaceholder('주소를 붙여넣어도 돼요').fill('https://map.kakao.com/example');
  await page.getByPlaceholder('태그를 쉼표로 나눠 적어보세요').fill('데이트, 산책');
  await page.getByRole('button', { name: '항목 추가' }).click();

  await expect(page.getByRole('link', { name: 'https://map.kakao.com/example' })).toBeVisible();
  await expect(page.getByText('데이트', { exact: true })).toBeVisible();
  await expect(page.getByText('산책', { exact: true })).toBeVisible();
  await expect(page.getByText(/생성/)).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: '주말 버킷리스트' })).toBeVisible();
  await expect(page.getByText('한강 산책')).toBeVisible();
});
