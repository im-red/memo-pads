import { test, expect } from '@playwright/test';
import { waitForIonicPage, clearStorage, createNotebook, addMemo } from './test-utils';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  await waitForIonicPage(page);
});

test('clicking memo card menu does not toggle explanation visibility', async ({ page }) => {
  await createNotebook(page, 'Test Notebook');

  const addFirstBtn = page.locator('ion-button:has-text("Add Your First Memo")');
  await addFirstBtn.click();
  await page.waitForTimeout(500);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
  await expect(modal).toBeVisible();

  const originalInput = modal.locator('ion-textarea[placeholder="Enter the word or phrase..."] textarea');
  await originalInput.fill('Test Word');

  const explanationInput = modal.locator('ion-textarea[placeholder="Enter the meaning or translation..."] textarea');
  await explanationInput.fill('Test Explanation');

  const addButton = modal.locator('ion-button:has-text("Add Memo")');
  await addButton.click();
  await page.waitForTimeout(1000);

  const headerMenuBtn = page.locator('ion-toolbar ion-button:has(ion-icon)').first();
  await headerMenuBtn.click();
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const actionSheets = Array.from(document.querySelectorAll('ion-action-sheet'));
    const activeSheet = actionSheets.find(sheet => !sheet.classList.contains('overlay-hidden'));
    if (activeSheet) {
      const buttons = Array.from(activeSheet.querySelectorAll('button.action-sheet-button'));
      const alwaysShowBtn = buttons.find(b => b.textContent?.includes('Always show explanation')) as HTMLButtonElement;
      if (alwaysShowBtn) alwaysShowBtn.click();
    }
  });
  await page.waitForTimeout(500);

  const explanation = page.locator('.swiper-slide-active div').filter({ hasText: /^Test Explanation$/ });
  await expect(explanation).toBeVisible();

  const memoMenuBtn = page.locator('.swiper-slide-active ion-button:has(ion-icon)').first();
  await memoMenuBtn.click();
  await page.waitForTimeout(300);

  await expect(explanation).toBeVisible();
});

test('explanation remains hidden after clicking menu when explanation was hidden', async ({ page }) => {
  await createNotebook(page, 'Test Notebook 2');

  const addFirstBtn = page.locator('ion-button:has-text("Add Your First Memo")');
  await addFirstBtn.click();
  await page.waitForTimeout(500);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
  await expect(modal).toBeVisible();

  const originalInput = modal.locator('ion-textarea[placeholder="Enter the word or phrase..."] textarea');
  await originalInput.fill('Test Word');

  const explanationInput = modal.locator('ion-textarea[placeholder="Enter the meaning or translation..."] textarea');
  await explanationInput.fill('Test Explanation');

  const addButton = modal.locator('ion-button:has-text("Add Memo")');
  await addButton.click();
  await page.waitForTimeout(1000);

  const explanation = page.locator('.swiper-slide-active div').filter({ hasText: /^Test Explanation$/ });
  await expect(explanation).not.toBeVisible();

  const memoMenuBtn = page.locator('.swiper-slide-active ion-button:has(ion-icon)').first();
  await memoMenuBtn.click();
  await page.waitForTimeout(300);

  await expect(explanation).not.toBeVisible();
});
