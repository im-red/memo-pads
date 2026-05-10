import { test, expect } from '@playwright/test';
import {
  waitForIonicPage,
  clearStorage,
  openSideMenu,
  closeSideMenu,
  navigateViaMenu,
  createNotebook,
  selectAndDeleteNotebook,
  addMemo,
  deleteMemo,
  goBackToNotebookList
} from './test-utils';

test.describe('test-utils.ts functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await page.reload();
    await waitForIonicPage(page);
  });

  test('goBackToNotebookList: from Notebook page', async ({ page }) => {
    const notebookName = 'Back Test Notebook';
    await createNotebook(page, notebookName);
    await expect(page.locator(`ion-title:has-text("${notebookName}")`).first()).toBeVisible();
    
    await goBackToNotebookList(page);
    await expect(page.locator('ion-title:has-text("Memo Pads")').first()).toBeVisible();
  });

  test('goBackToNotebookList: from Trash Bin page', async ({ page }) => {
    await navigateViaMenu(page, 'Trash Bin');
    await expect(page.locator('ion-title:has-text("Trash Bin")').first()).toBeVisible();
    
    await goBackToNotebookList(page);
    await expect(page.locator('ion-title:has-text("Memo Pads")').first()).toBeVisible();
  });

  test('goBackToNotebookList: from Settings page', async ({ page }) => {
    await navigateViaMenu(page, 'Settings');
    await expect(page.locator('ion-title:has-text("Settings")').first()).toBeVisible();
    
    await goBackToNotebookList(page);
    await expect(page.locator('ion-title:has-text("Memo Pads")').first()).toBeVisible();
  });

  test('menu operations: open, close, navigate', async ({ page }) => {
    // Open
    await openSideMenu(page);
    await expect(page.locator('ion-menu')).toBeVisible();

    // Close
    await closeSideMenu(page);
    await expect(page.locator('ion-menu')).not.toBeVisible();

    // Navigate
    await navigateViaMenu(page, 'Trash Bin');
    await expect(page.locator('ion-title:has-text("Trash Bin")').first()).toBeVisible();
  });

  test('notebook operations: create, goBack, delete', async ({ page }) => {
    const notebookName = 'Utils Notebook';
    
    // Create
    await createNotebook(page, notebookName);
    
    // Navigation (go back to list)
    await goBackToNotebookList(page);
    await expect(page.locator('ion-title:has-text("Memo Pads")').first()).toBeVisible();
    await expect(page.locator(`ion-item:has-text("${notebookName}")`)).toBeVisible();

    // Delete
    await selectAndDeleteNotebook(page, notebookName);
    await expect(page.locator(`ion-item:has-text("${notebookName}")`)).toBeHidden();
  });

  test('memo operations: add, delete', async ({ page }) => {
    const notebookName = 'Memo Utils Notebook';
    await createNotebook(page, notebookName);
    
    // createNotebook might already navigate to the notebook page.
    const isNotebookPage = await page.locator(`ion-title:has-text("${notebookName}")`).isVisible();
    if (!isNotebookPage) {
      await page.locator(`ion-item:has-text("${notebookName}")`).evaluate((el: any) => el.click());
      await page.waitForTimeout(500);
    }
    
    // Add
    await addMemo(page, 'Utils Memo', 'Utils Explanation');
    await expect(page.locator('.swiper-slide:has-text("Utils Memo")').first()).toBeVisible();

    // Delete
    await deleteMemo(page, 'Utils Memo');
    await expect(page.locator('.swiper-slide:has-text("Utils Memo")').first()).toBeHidden();
  });
});
