import { test, expect } from '@playwright/test';
import {
  createNotebook,
  addMemo,
  goBackToNotebookList,
  deleteMemo,
  selectAndDeleteNotebook,
  navigateViaMenu,
  clearStorage
} from './test-utils';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
});

test.describe('Local Soft Delete - Notebooks', () => {
  test('can soft delete a notebook', async ({ page }) => {

    await createNotebook(page, 'Notebook to Delete');

    await selectAndDeleteNotebook(page, 'Notebook to Delete');

    await page.waitForSelector('ion-item:has-text("Notebook to Delete")', { state: 'hidden' });

    const notebooks = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      return stored ? JSON.parse(stored) : [];
    });

    const deletedNotebook = notebooks.find((n: any) => n.name === 'Notebook to Delete');
    expect(deletedNotebook).toBeDefined();
    expect(deletedNotebook.isDeleted).toBe(true);
    expect(deletedNotebook.deletedAt).toBeDefined();
    expect(deletedNotebook.deletedBy).toBeDefined();
  });

  test('soft deleted notebook is hidden from notebook list', async ({ page }) => {

    await createNotebook(page, 'Hidden Notebook');

    await selectAndDeleteNotebook(page, 'Hidden Notebook');

    await page.waitForSelector('ion-item:has-text("Hidden Notebook")', { state: 'hidden' });

    const visibleNotebooks = await page.locator('ion-item').all();
    for (const notebook of visibleNotebooks) {
      await expect(notebook).not.toHaveText('Hidden Notebook');
    }
  });

  test('soft deleted notebook appears in trash bin', async ({ page }) => {
    await createNotebook(page, 'Trashed Notebook');

    await selectAndDeleteNotebook(page, 'Trashed Notebook');
    await page.waitForSelector('ion-item:has-text("Trashed Notebook")', { state: 'hidden' });

    await navigateViaMenu(page, 'Trash Bin');

    await expect(page.locator('ion-item:has-text("Trashed Notebook")')).toBeVisible();
  });

  test('deleting notebook cascades deletion to all its memos', async ({ page }) => {
    await createNotebook(page, 'Notebook with Memos');

    await page.locator('ion-item:has-text("Notebook with Memos")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });
    await addMemo(page, 'Word 1', 'Meaning 1');
    await addMemo(page, 'Word 2', 'Meaning 2');

    await goBackToNotebookList(page);

    await selectAndDeleteNotebook(page, 'Notebook with Memos');
    await page.waitForSelector('ion-item:has-text("Notebook with Memos")', { state: 'hidden' });

    const memos = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:memos');
      return stored ? JSON.parse(stored) : [];
    });

    const notebookMemos = memos.filter((m: any) => m.originalText === 'Word 1' || m.originalText === 'Word 2');
    expect(notebookMemos.length).toBe(2);
    for (const memo of notebookMemos) {
      expect(memo.isDeleted).toBe(true);
      expect(memo.deletedAt).toBeDefined();
    }
  });

  test('deleting notebook increments version', async ({ page }) => {
    await createNotebook(page, 'Version Test Notebook');

    const beforeDelete = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      const notebooks = stored ? JSON.parse(stored) : [];
      return notebooks.find((n: any) => n.name === 'Version Test Notebook');
    });

    await selectAndDeleteNotebook(page, 'Version Test Notebook');
    await page.waitForSelector('ion-item:has-text("Version Test Notebook")', { state: 'hidden' });

    const afterDelete = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      const notebooks = stored ? JSON.parse(stored) : [];
      return notebooks.find((n: any) => n.name === 'Version Test Notebook');
    });

    expect(afterDelete.version).toBe((beforeDelete.version || 1) + 1);
  });


  test('can edit a notebook name', async ({ page }) => {
    await createNotebook(page, 'Original Name');
    await goBackToNotebookList(page);

    await page.locator(`ion-item:has-text("Original Name")`).locator('ion-button').evaluate((el: any) => el.click());
    
    // Playwright struggles with ion-action-sheet, click Edit via evaluate
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const actionSheets = Array.from(document.querySelectorAll('ion-action-sheet'));
      const activeSheet = actionSheets.find(sheet => !sheet.classList.contains('overlay-hidden'));
      if (activeSheet) {
        const buttons = Array.from(activeSheet.querySelectorAll('button.action-sheet-button'));
        const editBtn = buttons.find(b => b.textContent?.includes('Edit')) as HTMLButtonElement;
        if (editBtn) editBtn.click();
      }
    });

    await page.waitForSelector('ion-modal:has-text("Edit Notebook")', { state: 'visible' });
    await page.fill('input[placeholder="Enter notebook name..."]', 'Updated Name');
    await page.locator('ion-button:has-text("Save Changes")').evaluate((el: any) => el.click());
    // wait for modal to disappear
    await page.waitForSelector('ion-modal:has-text("Edit Notebook")', { state: 'hidden' });

    await page.waitForSelector('ion-item:has-text("Updated Name")', { state: 'visible' });
    await expect(page.locator('ion-item:has-text("Original Name")')).not.toBeVisible();

    const notebooks = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      return stored ? JSON.parse(stored) : [];
    });

    const editedNotebook = notebooks.find((n: any) => n.name === 'Updated Name');
    expect(editedNotebook).toBeDefined();
    expect(editedNotebook.version).toBe(2);
  });
});

test.describe('Local Soft Delete - Memos', () => {
  test('can soft delete a memo', async ({ page }) => {
    await createNotebook(page, 'Memo Delete Test');

    await page.locator('ion-item:has-text("Memo Delete Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });
    await addMemo(page, 'Delete Me', 'Delete this memo');

    await deleteMemo(page, 'Delete Me');

    await page.waitForSelector('.swiper-slide:has-text("Delete Me")', { state: 'hidden' });

    const memos = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:memos');
      return stored ? JSON.parse(stored) : [];
    });

    const deletedMemo = memos.find((m: any) => m.originalText === 'Delete Me');
    expect(deletedMemo).toBeDefined();
    expect(deletedMemo.isDeleted).toBe(true);
    expect(deletedMemo.deletedAt).toBeDefined();
  });

  test('soft deleted memo is hidden from memo list', async ({ page }) => {
    await createNotebook(page, 'Memo Visibility Test');

    await page.locator('ion-item:has-text("Memo Visibility Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });
    await addMemo(page, 'Visible Memo', 'This stays');
    await addMemo(page, 'Hidden Memo', 'This goes');

    // Swipe to next memo
    const memoCard = page.locator('.swiper-slide-active');
    const cardBox = await memoCard.boundingBox();
    if (cardBox) {
      const startX = cardBox.x + cardBox.width / 2;
      const startY = cardBox.y + cardBox.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 200, startY, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(300);
    }

    await expect(page.locator('.swiper-slide-active')).toContainText('Hidden Memo');

    await deleteMemo(page, 'Hidden Memo');

    await page.waitForTimeout(500);

    const memos = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:memos');
      return stored ? JSON.parse(stored) : [];
    });

    const deletedMemo = memos.find((m: any) => m.originalText === 'Hidden Memo');
    expect(deletedMemo).toBeDefined();
    expect(deletedMemo.isDeleted).toBe(true);

    const visibleMemos = memos.filter((m: any) => m.notebookId === deletedMemo.notebookId && !m.isDeleted);
    expect(visibleMemos.length).toBe(1);
    expect(visibleMemos[0].originalText).toBe('Visible Memo');
  });

  test('soft deleted memo appears in trash bin', async ({ page }) => {
    await createNotebook(page, 'Memo Trash Test');

    await page.locator('ion-item:has-text("Memo Trash Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });
    await addMemo(page, 'Trashed Memo', 'This is trashed');

    await deleteMemo(page, 'Trashed Memo');

    await goBackToNotebookList(page);
    await navigateViaMenu(page, 'Trash Bin');

    await page.locator('ion-segment-button:has-text("Memos")').evaluate((el: any) => el.click());
    await expect(page.locator('ion-item:has-text("Trashed Memo")')).toBeVisible();
  });

  test('deleting memo increments version', async ({ page }) => {
    await createNotebook(page, 'Memo Version Test');

    await page.locator('ion-item:has-text("Memo Version Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });
    await addMemo(page, 'Version Memo', 'Test version');

    const beforeDelete = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:memos');
      const memos = stored ? JSON.parse(stored) : [];
      return memos.find((m: any) => m.originalText === 'Version Memo');
    });

    await deleteMemo(page, 'Version Memo');

    const afterDelete = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:memos');
      const memos = stored ? JSON.parse(stored) : [];
      return memos.find((m: any) => m.originalText === 'Version Memo');
    });

    expect(afterDelete.version).toBe((beforeDelete.version || 1) + 1);
  });
});

test.describe('Restore from Trash', () => {
  test('can restore a deleted notebook', async ({ page }) => {
    await createNotebook(page, 'Notebook to Restore');

    await selectAndDeleteNotebook(page, 'Notebook to Restore');
    await page.waitForSelector('ion-item:has-text("Notebook to Restore")', { state: 'hidden' });

    await navigateViaMenu(page, 'Trash Bin');

    // Swipe to reveal restore button
    await page.locator('ion-item:has-text("Notebook to Restore")').evaluate((el: any) => {
      const itemSliding = el.closest('ion-item-sliding');
      if (itemSliding) itemSliding.open('end');
    });

    await page.locator('ion-item-sliding:has(ion-item:has-text("Notebook to Restore")) ion-item-option[color="success"]').evaluate((el: any) => el.click());

    await goBackToNotebookList(page);

    await expect(page.locator('ion-item:has-text("Notebook to Restore")')).toBeVisible();

    const notebooks = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      return stored ? JSON.parse(stored) : [];
    });

    const restoredNotebook = notebooks.find((n: any) => n.name === 'Notebook to Restore');
    expect(restoredNotebook.isDeleted).toBe(false);
    expect(restoredNotebook.deletedAt).toBeUndefined();
    expect(restoredNotebook.deletedBy).toBeUndefined();
  });

  test('can restore a deleted memo', async ({ page }) => {
    await createNotebook(page, 'Memo Restore Test');

    await page.locator('ion-item:has-text("Memo Restore Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });
    await addMemo(page, 'Memo to Restore', 'Restore this');

    await deleteMemo(page, 'Memo to Restore');

    await goBackToNotebookList(page);
    await navigateViaMenu(page, 'Trash Bin');

    await page.locator('ion-segment-button:has-text("Memos")').evaluate((el: any) => el.click());
    // Swipe to reveal restore button
    await page.locator('ion-item:has-text("Memo to Restore")').evaluate((el: any) => {
      const itemSliding = el.closest('ion-item-sliding');
      if (itemSliding) itemSliding.open('end');
    });

    await page.locator('ion-item-sliding:has(ion-item:has-text("Memo to Restore")) ion-item-option[color="success"]').evaluate((el: any) => el.click());

    await goBackToNotebookList(page);

    await page.locator('ion-item:has-text("Memo Restore Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });

    await expect(page.locator('.swiper-slide').first()).toContainText('Memo to Restore');

    const memos = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:memos');
      return stored ? JSON.parse(stored) : [];
    });

    const restoredMemo = memos.find((m: any) => m.originalText === 'Memo to Restore');
    expect(restoredMemo.isDeleted).toBe(false);
    expect(restoredMemo.deletedAt).toBeUndefined();
  });

  test('restoring notebook restores all its memos', async ({ page }) => {
    await createNotebook(page, 'Restore Cascade Test');

    await page.locator('ion-item:has-text("Restore Cascade Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });
    await addMemo(page, 'Cascade Memo 1', 'Meaning 1');
    await addMemo(page, 'Cascade Memo 2', 'Meaning 2');

    await goBackToNotebookList(page);

    await selectAndDeleteNotebook(page, 'Restore Cascade Test');
    await page.waitForSelector('ion-item:has-text("Restore Cascade Test")', { state: 'hidden' });

    await navigateViaMenu(page, 'Trash Bin');

    // Swipe to reveal restore button
    await page.locator('ion-item:has-text("Restore Cascade Test")').evaluate((el: any) => {
      const itemSliding = el.closest('ion-item-sliding');
      if (itemSliding) itemSliding.open('end');
    });

    await page.locator('ion-item-sliding:has(ion-item:has-text("Restore Cascade Test")) ion-item-option[color="success"]').evaluate((el: any) => el.click());

    await goBackToNotebookList(page);

    await page.locator('ion-item:has-text("Restore Cascade Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });

    await expect(page.locator('.swiper-slide').first()).toContainText('Cascade Memo 1');
  });

  test('restore increments version', async ({ page }) => {
    await createNotebook(page, 'Restore Version Test');

    await selectAndDeleteNotebook(page, 'Restore Version Test');
    await page.waitForSelector('ion-item:has-text("Restore Version Test")', { state: 'hidden' });

    const beforeRestore = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      const notebooks = stored ? JSON.parse(stored) : [];
      return notebooks.find((n: any) => n.name === 'Restore Version Test');
    });

    await navigateViaMenu(page, 'Trash Bin');

    // Swipe to reveal restore button
    await page.locator('ion-item:has-text("Restore Version Test")').evaluate((el: any) => {
      const itemSliding = el.closest('ion-item-sliding');
      if (itemSliding) itemSliding.open('end');
    });

    await page.locator('ion-item-sliding:has(ion-item:has-text("Restore Version Test")) ion-item-option[color="success"]').evaluate((el: any) => el.click());

    const afterRestore = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      const notebooks = stored ? JSON.parse(stored) : [];
      return notebooks.find((n: any) => n.name === 'Restore Version Test');
    });

    expect(afterRestore.version).toBe((beforeRestore.version || 1) + 1);
  });
});

test.describe('Permanent Delete', () => {
  test('can permanently delete a notebook', async ({ page }) => {
    await createNotebook(page, 'Permanent Delete Notebook');

    await selectAndDeleteNotebook(page, 'Permanent Delete Notebook');
    await page.waitForSelector('ion-item:has-text("Permanent Delete Notebook")', { state: 'hidden' });

    await navigateViaMenu(page, 'Trash Bin');

    // Swipe to reveal delete button
    await page.locator('ion-item:has-text("Permanent Delete Notebook")').evaluate((el: any) => {
      const itemSliding = el.closest('ion-item-sliding');
      if (itemSliding) itemSliding.open('end');
    });

    await page.locator('ion-item-sliding:has(ion-item:has-text("Permanent Delete Notebook")) ion-item-option[color="danger"]').evaluate((el: any) => el.click());

    // Accept the ion-alert
    await page.waitForSelector('ion-alert', { state: 'visible' });
    await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('ion-alert'));
      const activeAlert = alerts.find(alert => !alert.classList.contains('overlay-hidden'));
      if (activeAlert) {
        const buttons = Array.from(activeAlert.querySelectorAll('button.alert-button'));
        const deleteBtn = buttons.find(b => b.textContent?.includes('Delete') || b.classList.contains('alert-button-role-destructive')) as HTMLButtonElement;
        if (deleteBtn) deleteBtn.click();
      }
    });

    await page.waitForSelector('ion-item:has-text("Permanent Delete Notebook")', { state: 'hidden' });

    const notebooks = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      return stored ? JSON.parse(stored) : [];
    });

    const deletedNotebook = notebooks.find((n: any) => n.name === 'Permanent Delete Notebook');
    expect(deletedNotebook).toBeUndefined();
  });

  test('can permanently delete a memo', async ({ page }) => {
    await createNotebook(page, 'Permanent Delete Memo Test');

    await page.locator('ion-item:has-text("Permanent Delete Memo Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });
    await addMemo(page, 'Permanent Delete Memo', 'Delete forever');

    await deleteMemo(page, 'Permanent Delete Memo');

    await goBackToNotebookList(page);
    await navigateViaMenu(page, 'Trash Bin');

    await page.locator('ion-segment-button:has-text("Memos")').evaluate((el: any) => el.click());

    // Swipe to reveal delete button
    await page.locator('ion-item:has-text("Permanent Delete Memo")').evaluate((el: any) => {
      const itemSliding = el.closest('ion-item-sliding');
      if (itemSliding) itemSliding.open('end');
    });

    await page.locator('ion-item-sliding:has(ion-item:has-text("Permanent Delete Memo")) ion-item-option[color="danger"]').evaluate((el: any) => el.click());

    // Accept the ion-alert
    await page.waitForSelector('ion-alert', { state: 'visible' });
    await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('ion-alert'));
      const activeAlert = alerts.find(alert => !alert.classList.contains('overlay-hidden'));
      if (activeAlert) {
        const buttons = Array.from(activeAlert.querySelectorAll('button.alert-button'));
        const deleteBtn = buttons.find(b => b.textContent?.includes('Delete') || b.classList.contains('alert-button-role-destructive')) as HTMLButtonElement;
        if (deleteBtn) deleteBtn.click();
      }
    });

    await page.waitForSelector('ion-item:has-text("Permanent Delete Memo")', { state: 'hidden' });

    const memos = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:memos');
      return stored ? JSON.parse(stored) : [];
    });

    const deletedMemo = memos.find((m: any) => m.originalText === 'Permanent Delete Memo');
    expect(deletedMemo).toBeUndefined();
  });

  test('permanent delete notebook removes all its memos', async ({ page }) => {
    await createNotebook(page, 'Permanent Cascade Test');

    await page.locator('ion-item:has-text("Permanent Cascade Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });
    await addMemo(page, 'Cascade Permanent 1', 'Meaning 1');
    await addMemo(page, 'Cascade Permanent 2', 'Meaning 2');

    await goBackToNotebookList(page);

    await selectAndDeleteNotebook(page, 'Permanent Cascade Test');
    await page.waitForSelector('ion-item:has-text("Permanent Cascade Test")', { state: 'hidden' });

    await navigateViaMenu(page, 'Trash Bin');

    // Swipe to reveal delete button
    await page.locator('ion-item:has-text("Permanent Cascade Test")').evaluate((el: any) => {
      const itemSliding = el.closest('ion-item-sliding');
      if (itemSliding) itemSliding.open('end');
    });

    await page.locator('ion-item-sliding:has(ion-item:has-text("Permanent Cascade Test")) ion-item-option[color="danger"]').evaluate((el: any) => el.click());

    // Accept the ion-alert
    await page.waitForSelector('ion-alert', { state: 'visible' });
    await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('ion-alert'));
      const activeAlert = alerts.find(alert => !alert.classList.contains('overlay-hidden'));
      if (activeAlert) {
        const buttons = Array.from(activeAlert.querySelectorAll('button.alert-button'));
        const deleteBtn = buttons.find(b => b.textContent?.includes('Delete') || b.classList.contains('alert-button-role-destructive')) as HTMLButtonElement;
        if (deleteBtn) deleteBtn.click();
      }
    });

    const notebooks = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      return stored ? JSON.parse(stored) : [];
    });
    const memos = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:memos');
      return stored ? JSON.parse(stored) : [];
    });

    expect(notebooks.find((n: any) => n.name === 'Permanent Cascade Test')).toBeUndefined();
    expect(memos.filter((m: any) => m.originalText === 'Cascade Permanent 1' || m.originalText === 'Cascade Permanent 2').length).toBe(0);
  });

  test('permanent delete requires confirmation', async ({ page }) => {
    await createNotebook(page, 'Confirm Delete Test');

    await selectAndDeleteNotebook(page, 'Confirm Delete Test');
    await page.waitForSelector('ion-item:has-text("Confirm Delete Test")', { state: 'hidden' });

    await navigateViaMenu(page, 'Trash Bin');

    // Swipe to reveal delete button
    await page.locator('ion-item:has-text("Confirm Delete Test")').evaluate((el: any) => {
      const itemSliding = el.closest('ion-item-sliding');
      if (itemSliding) itemSliding.open('end');
    });

    await page.locator('ion-item-sliding:has(ion-item:has-text("Confirm Delete Test")) ion-item-option[color="danger"]').evaluate((el: any) => el.click());

    // Instead of window.confirm, Ionic uses ion-alert
    await page.waitForSelector('ion-alert', { state: 'visible' });
    
    // Click Cancel
    await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('ion-alert'));
      const activeAlert = alerts.find(alert => !alert.classList.contains('overlay-hidden'));
      if (activeAlert) {
        const buttons = Array.from(activeAlert.querySelectorAll('button.alert-button'));
        const cancelBtn = buttons.find(b => b.textContent?.includes('Cancel') || b.classList.contains('alert-button-role-cancel')) as HTMLButtonElement;
        if (cancelBtn) cancelBtn.click();
      }
    });

    await page.waitForTimeout(500);

    const notebooks = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      return stored ? JSON.parse(stored) : [];
    });

    expect(notebooks.find((n: any) => n.name === 'Confirm Delete Test')).toBeDefined();
  });
});

test.describe('Trash Bin UI', () => {
  test('trash bin shows empty message when no deleted items', async ({ page }) => {

    await navigateViaMenu(page, 'Trash Bin');

    await expect(page.locator('text="No deleted notebooks"')).toBeVisible();
  });

  test('trash bin tabs switch between notebooks and memos', async ({ page }) => {
    await createNotebook(page, 'Tab Test Notebook');

    await page.locator('ion-item:has-text("Tab Test Notebook")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });
    await addMemo(page, 'Tab Test Memo', 'Meaning');

    await deleteMemo(page, 'Tab Test Memo');

    await goBackToNotebookList(page);

    await selectAndDeleteNotebook(page, 'Tab Test Notebook');
    await page.waitForSelector('ion-item:has-text("Tab Test Notebook")', { state: 'hidden' });

    await navigateViaMenu(page, 'Trash Bin');

    await expect(page.locator('ion-segment-button:has-text("Notebooks")')).toHaveClass(/segment-button-checked/);
    await expect(page.locator('ion-item:has-text("Tab Test Notebook")')).toBeVisible();

    await page.locator('ion-segment-button:has-text("Memos")').evaluate((el: any) => el.click());

    await expect(page.locator('ion-segment-button:has-text("Memos")')).toHaveClass(/segment-button-checked/);
    await expect(page.locator('ion-item:has-text("Tab Test Memo")')).toBeVisible();
  });

  test('trash bin shows correct counts in tabs', async ({ page }) => {
    await createNotebook(page, 'Count Test 1');
    await goBackToNotebookList(page);
    await createNotebook(page, 'Count Test 2');
    await goBackToNotebookList(page);

    await selectAndDeleteNotebook(page, 'Count Test 1');
    await page.waitForSelector('ion-item:has-text("Count Test 1")', { state: 'hidden' });

    await selectAndDeleteNotebook(page, 'Count Test 2');
    await page.waitForSelector('ion-item:has-text("Count Test 2")', { state: 'hidden' });

    await navigateViaMenu(page, 'Trash Bin');

    await expect(page.locator('ion-segment-button:has-text("Notebooks")')).toContainText('2');
  });

  test('trash bin shows deletion date', async ({ page }) => {
    await createNotebook(page, 'Date Test Notebook');

    await selectAndDeleteNotebook(page, 'Date Test Notebook');
    await page.waitForSelector('ion-item:has-text("Date Test Notebook")', { state: 'hidden' });

    await navigateViaMenu(page, 'Trash Bin');

    await expect(page.locator('ion-item:has-text("Date Test Notebook")')).toContainText('Deleted');
  });

  test('trash bin can be closed', async ({ page }) => {
    await navigateViaMenu(page, 'Trash Bin');
    await expect(page.locator('ion-title:has-text("Trash Bin")')).toBeVisible();

    await goBackToNotebookList(page);

    await page.waitForSelector('ion-title:has-text("Trash Bin")', { state: 'hidden' });
    await expect(page.locator('ion-title:has-text("Memo Pads")').first()).toBeVisible();
  });

});

test.describe('Deletion Edge Cases', () => {
  test('deleting last memo in notebook shows empty state', async ({ page }) => {
    await createNotebook(page, 'Last Memo Test');

    await page.locator('ion-item:has-text("Last Memo Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });
    await addMemo(page, 'Only Memo', 'The only one');

    await deleteMemo(page, 'Only Memo');

    await page.waitForSelector('.swiper-slide:has-text("Only Memo")', { state: 'hidden' });

    await expect(page.locator('ion-button:has-text("Add Your First Memo"), button.fab--primary')).toBeVisible();
  });

  test('deleting notebook clears view progress', async ({ page }) => {
    await createNotebook(page, 'Progress Clear Test');

    await page.locator('ion-item:has-text("Progress Clear Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });
    await addMemo(page, 'Progress Memo', 'Test');

    await goBackToNotebookList(page);

    const beforeDelete = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:progress');
      return stored ? JSON.parse(stored) : {};
    });

    await selectAndDeleteNotebook(page, 'Progress Clear Test');
    await page.waitForSelector('ion-item:has-text("Progress Clear Test")', { state: 'hidden' });

    const afterDelete = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:progress');
      return stored ? JSON.parse(stored) : {};
    });

    const notebookId = Object.keys(beforeDelete)[0];
    expect(afterDelete[notebookId]).toBeUndefined();
  });

  test('restoring memo to deleted notebook shows in trash', async ({ page }) => {
    await createNotebook(page, 'Restore Parent Test');

    await page.locator('ion-item:has-text("Restore Parent Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });
    await addMemo(page, 'Orphan Memo', 'Parent deleted');

    await goBackToNotebookList(page);

    await selectAndDeleteNotebook(page, 'Restore Parent Test');
    await page.waitForSelector('ion-item:has-text("Restore Parent Test")', { state: 'hidden' });

    await navigateViaMenu(page, 'Trash Bin');

    await page.locator('ion-segment-button:has-text("Memos")').evaluate((el: any) => el.click());
    // Swipe to reveal restore button
    await page.locator('ion-item:has-text("Orphan Memo")').evaluate((el: any) => {
      const itemSliding = el.closest('ion-item-sliding');
      if (itemSliding) itemSliding.open('end');
    });

    await page.locator('ion-item-sliding:has(ion-item:has-text("Orphan Memo")) ion-item-option[color="success"]').evaluate((el: any) => el.click());

    const memos = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:memos');
      return stored ? JSON.parse(stored) : [];
    });

    const restoredMemo = memos.find((m: any) => m.originalText === 'Orphan Memo');
    expect(restoredMemo.isDeleted).toBe(false);
  });

  test('deleted items persist across page reload', async ({ page }) => {
    await createNotebook(page, 'Persist Delete Test');

    await selectAndDeleteNotebook(page, 'Persist Delete Test');
    await page.waitForSelector('ion-item:has-text("Persist Delete Test")', { state: 'hidden' });

    await page.reload();

    await expect(page.locator('ion-item:has-text("Persist Delete Test")')).not.toBeVisible();

    await navigateViaMenu(page, 'Trash Bin');

    await expect(page.locator('ion-item:has-text("Persist Delete Test")')).toBeVisible();
  });
});
