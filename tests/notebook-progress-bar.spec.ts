import { test, expect } from '@playwright/test';
import {
  waitForIonicPage,
  clearStorage,
  createNotebook,
  addMemo,
} from './test-utils';

test.describe('Notebook Progress Bar and Slider', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await page.reload();
    await waitForIonicPage(page);
  });

  test('Single memo edge case - slider handle is hidden and max is 0', async ({ page }) => {
    const notebookName = 'Single Memo Notebook';
    await createNotebook(page, notebookName);
    
    // Add one memo
    await addMemo(page, 'Memo 1', 'Explanation 1');
    
    // Verify memo card shows index
    await expect(page.locator('.swiper-slide-active:has-text("1. Memo 1")')).toBeVisible();

    // Verify slider attributes
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute('max', '0');

    // Reset button should not be visible
    const resetButton = page.getByTestId('reset-progress-button');
    await expect(resetButton).toHaveCSS('visibility', 'hidden');
  });

  test('Multiple memos - initial state, dragging, and resetting', async ({ page }) => {
    const notebookName = 'Multi Memo Notebook';
    await createNotebook(page, notebookName);
    
    // Add three memos
    await addMemo(page, 'Memo 1', 'Explanation 1');
    await addMemo(page, 'Memo 2', 'Explanation 2');
    await addMemo(page, 'Memo 3', 'Explanation 3');
    
    // Check initial state (should be on Memo 1, index 0)
    await expect(page.locator('.swiper-slide-active:has-text("1. Memo 1")')).toBeVisible();
    
    const slider = page.locator('input[type="range"]');
    await expect(slider).toHaveValue('0');
    await expect(slider).toHaveAttribute('max', '2');
    
    const resetButton = page.getByTestId('reset-progress-button');
    await expect(resetButton).toHaveCSS('visibility', 'hidden');

    // Simulate dragging slider to index 2 (Memo 3)
    await slider.fill('2');
    await slider.dispatchEvent('change'); // trigger the onChange event

    // Check state after drag
    await expect(page.locator('.swiper-slide-active:has-text("3. Memo 3")')).toBeVisible();
    await expect(resetButton).toHaveCSS('visibility', 'visible');
    
    // Verify Swiper navigated to Memo 3
    await expect(page.locator('.swiper-slide-active:has-text("Memo 3")')).toBeVisible();

    // Verify original index marker is visible (at left 0%)
    const marker = page.getByTestId('original-index-marker');
    await expect(marker).toBeVisible();

    // Reset back to original
    await resetButton.click();

    // Check state after reset
    await expect(page.locator('.swiper-slide-active:has-text("1. Memo 1")')).toBeVisible();
    await expect(slider).toHaveValue('0');
    await expect(resetButton).toHaveCSS('visibility', 'hidden');
    await expect(page.locator('.swiper-slide-active:has-text("Memo 1")')).toBeVisible();
    
    // Marker should disappear
    await expect(marker).toBeHidden();
  });
});
