import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('clicking memo card menu does not toggle explanation visibility', async ({ page }) => {
  await page.click('.add-notebook-btn');
  await page.fill('input#notebookName', 'Test Notebook');
  await page.click('button:has-text("Create")');

  await page.waitForSelector('.notebook-item', { state: 'visible' });
  await page.click('.notebook-item');

  await page.waitForSelector('.empty-message', { state: 'visible' });
  await page.click('.btn-primary:has-text("Add Your First Memo")');

  await page.waitForSelector('.overlay-panel', { state: 'visible' });
  await page.fill('textarea#originalText', 'Test Word');
  await page.fill('textarea#explanation', 'Test Explanation');
  await page.click('button:has-text("Add Memo")');

  await page.waitForSelector('.memo-card__menu-btn', { state: 'visible' });

  // Enable "Always show explanation" via header menu
  await page.click('.header-menu-btn');
  await page.waitForTimeout(200);
  await page.click('.header-menu-dropdown button:has-text("Always show explanation")');
  await page.waitForTimeout(300);

  const explanation = page.locator('.memo-card__explanation');
  await expect(explanation).toBeVisible();

  await page.click('.memo-card__menu-btn');

  await expect(explanation).toBeVisible();
});

test('explanation remains hidden after clicking menu when explanation was hidden', async ({ page }) => {
  await page.click('.add-notebook-btn');
  await page.fill('input#notebookName', 'Test Notebook 2');
  await page.click('button:has-text("Create")');

  await page.waitForSelector('.notebook-item', { state: 'visible' });
  await page.click('.notebook-item');

  await page.waitForSelector('.empty-message', { state: 'visible' });
  await page.click('.btn-primary:has-text("Add Your First Memo")');

  await page.waitForSelector('.overlay-panel', { state: 'visible' });
  await page.fill('textarea#originalText', 'Test Word');
  await page.fill('textarea#explanation', 'Test Explanation');
  await page.click('button:has-text("Add Memo")');

  await page.waitForSelector('.memo-card__menu-btn', { state: 'visible' });

  const explanation = page.locator('.memo-card__explanation');
  await expect(explanation).not.toBeVisible();

  await page.click('.memo-card__menu-btn');

  await expect(explanation).not.toBeVisible();
});
