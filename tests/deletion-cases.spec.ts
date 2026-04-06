import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function createNotebook(page: any, name: string) {
  await page.click('button.add-notebook-btn');
  await page.waitForSelector('.overlay:has-text("New Notebook")', { state: 'visible' });
  await page.fill('input[placeholder="Enter notebook name..."]', name);
  await page.click('button:has-text("Create Notebook")');
  await page.waitForSelector(`.notebook-item:has-text("${name}")`, { state: 'visible' });
}

async function addMemo(page: any, originalText: string, explanation: string) {
  await page.waitForSelector('.memo-view', { state: 'visible' });
  await page.click('button:has-text("Add Your First Memo"), button.add-memo-btn');
  await page.waitForSelector('.overlay:has-text("Add New Memo")', { state: 'visible' });
  await page.fill('textarea[placeholder="Enter the word or phrase..."]', originalText);
  await page.fill('textarea[placeholder="Enter the meaning or translation..."]', explanation);
  await page.click('.overlay .form-actions button:has-text("Add Memo")');
  await page.waitForSelector('.memo-card', { state: 'visible' });
}

async function goBackToNotebookList(page: any) {
  await page.click('button:has-text("← Back")');
  await page.waitForSelector('h1:has-text("Memo Pads")', { state: 'visible' });
}

async function openTrashBin(page: any) {
  await page.click('.menu-trigger-btn');
  await page.waitForSelector('.side-menu--open', { state: 'visible' });
  await page.waitForTimeout(400); // Wait for animation

  // Ensure the Trash Bin menu item is visible before clicking
  const trashBinItem = page.locator('.side-menu-item:has-text("🗑️ Trash Bin")');
  await trashBinItem.scrollIntoViewIfNeeded();
  await trashBinItem.click();
  await page.waitForSelector('.trash-page-content', { state: 'visible' });
}

async function closeTrashBin(page: any) {
  await page.click('button:has-text("← Back")');
  await page.waitForSelector('.trash-page-content', { state: 'hidden' });
}

async function deleteMemo(page: any, memoText: string) {
  await page.waitForSelector('.memo-card', { state: 'visible' });
  await page.click('.memo-card__menu-btn');
  await page.waitForSelector('.memo-card__menu-dropdown', { state: 'visible' });
  page.once('dialog', dialog => dialog.accept());
  await page.click('.memo-card__menu-dropdown button.danger:has-text("Delete")');
}

async function selectAndDeleteNotebook(page: any, name: string) {
  await page.click(`.notebook-item:has-text("${name}") .notebook-item__menu-btn`);
  await page.waitForSelector(`.notebook-item:has-text("${name}") .notebook-item__menu-dropdown`, { state: 'visible' });
  page.once('dialog', dialog => dialog.accept());
  await page.click(`.notebook-item:has-text("${name}") .notebook-item__menu-dropdown button.danger:has-text("Delete")`);
}

test.describe('Local Soft Delete - Notebooks', () => {
  test('can soft delete a notebook', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Notebook to Delete');

    await selectAndDeleteNotebook(page, 'Notebook to Delete');

    await page.waitForSelector('.notebook-item:has-text("Notebook to Delete")', { state: 'hidden' });

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
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Hidden Notebook');

    await selectAndDeleteNotebook(page, 'Hidden Notebook');

    await page.waitForSelector('.notebook-item:has-text("Hidden Notebook")', { state: 'hidden' });

    const visibleNotebooks = await page.locator('.notebook-item').all();
    for (const notebook of visibleNotebooks) {
      await expect(notebook).not.toHaveText('Hidden Notebook');
    }
  });

  test('soft deleted notebook appears in trash bin', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Trashed Notebook');

    await selectAndDeleteNotebook(page, 'Trashed Notebook');
    await page.waitForSelector('.notebook-item:has-text("Trashed Notebook")', { state: 'hidden' });

    await openTrashBin(page);

    await expect(page.locator('.trash-item:has-text("Trashed Notebook")')).toBeVisible();
  });

  test('deleting notebook cascades deletion to all its memos', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Notebook with Memos');

    await page.click('button:has-text("Notebook with Memos")');
    await page.waitForSelector('.memo-view', { state: 'visible' });
    await addMemo(page, 'Word 1', 'Meaning 1');
    await addMemo(page, 'Word 2', 'Meaning 2');

    await goBackToNotebookList(page);

    await selectAndDeleteNotebook(page, 'Notebook with Memos');
    await page.waitForSelector('.notebook-item:has-text("Notebook with Memos")', { state: 'hidden' });

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
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Version Test Notebook');

    const beforeDelete = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      const notebooks = stored ? JSON.parse(stored) : [];
      return notebooks.find((n: any) => n.name === 'Version Test Notebook');
    });

    await selectAndDeleteNotebook(page, 'Version Test Notebook');
    await page.waitForSelector('.notebook-item:has-text("Version Test Notebook")', { state: 'hidden' });

    const afterDelete = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      const notebooks = stored ? JSON.parse(stored) : [];
      return notebooks.find((n: any) => n.name === 'Version Test Notebook');
    });

    expect(afterDelete.version).toBe((beforeDelete.version || 1) + 1);
  });

  test('notebook menu dropdown is fully visible and not cropped', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Menu Visibility Test');

    await page.click(`.notebook-item:has-text("Menu Visibility Test") .notebook-item__menu-btn`);
    await page.waitForSelector(`.notebook-item:has-text("Menu Visibility Test") .notebook-item__menu-dropdown`, { state: 'visible' });

    const dropdown = page.locator(`.notebook-item:has-text("Menu Visibility Test") .notebook-item__menu-dropdown`);
    const notebookItem = page.locator(`.notebook-item:has-text("Menu Visibility Test")`);

    const dropdownBox = await dropdown.boundingBox();
    const notebookItemBox = await notebookItem.boundingBox();

    expect(dropdownBox).not.toBeNull();
    expect(notebookItemBox).not.toBeNull();

    expect(dropdownBox!.y).toBeGreaterThanOrEqual(0);
    expect(dropdownBox!.y + dropdownBox!.height).toBeLessThanOrEqual(
      (await page.viewportSize())!.height
    );

    const editButton = dropdown.locator('button:has-text("Edit")');
    const deleteButton = dropdown.locator('button.danger:has-text("Delete")');

    await expect(editButton).toBeVisible();
    await expect(deleteButton).toBeVisible();

    const editBox = await editButton.boundingBox();
    const deleteBox = await deleteButton.boundingBox();

    expect(editBox).not.toBeNull();
    expect(deleteBox).not.toBeNull();
    expect(editBox!.height).toBeGreaterThan(0);
    expect(deleteBox!.height).toBeGreaterThan(0);
  });

  test('can edit a notebook name', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Original Name');

    await page.click(`.notebook-item:has-text("Original Name") .notebook-item__menu-btn`);
    await page.waitForSelector(`.notebook-item:has-text("Original Name") .notebook-item__menu-dropdown`, { state: 'visible' });
    await page.click(`.notebook-item:has-text("Original Name") .notebook-item__menu-dropdown button:has-text("Edit")`);

    await page.waitForSelector('.overlay:has-text("Edit Notebook")', { state: 'visible' });
    await page.fill('input[placeholder="Enter notebook name..."]', 'Updated Name');
    await page.click('button:has-text("Save Changes")');

    await page.waitForSelector('.notebook-item:has-text("Updated Name")', { state: 'visible' });
    await expect(page.locator('.notebook-item:has-text("Original Name")')).not.toBeVisible();

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
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Memo Delete Test');

    await page.click('button:has-text("Memo Delete Test")');
    await page.waitForSelector('.memo-view', { state: 'visible' });
    await addMemo(page, 'Delete Me', 'Delete this memo');

    await deleteMemo(page, 'Delete Me');

    await page.waitForSelector('.memo-card', { state: 'hidden' });

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
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Memo Visibility Test');

    await page.click('button:has-text("Memo Visibility Test")');
    await page.waitForSelector('.memo-view', { state: 'visible' });
    await addMemo(page, 'Visible Memo', 'This stays');
    await addMemo(page, 'Hidden Memo', 'This goes');

    await page.click('button:has-text("Next")');

    await expect(page.locator('.memo-card__original')).toHaveText('Hidden Memo');

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
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Memo Trash Test');

    await page.click('button:has-text("Memo Trash Test")');
    await page.waitForSelector('.memo-view', { state: 'visible' });
    await addMemo(page, 'Trashed Memo', 'This is trashed');

    await deleteMemo(page, 'Trashed Memo');

    await goBackToNotebookList(page);
    await openTrashBin(page);

    await page.click('.trash-tab:has-text("Memos")');
    await expect(page.locator('.trash-item:has-text("Trashed Memo")')).toBeVisible();
  });

  test('deleting memo increments version', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Memo Version Test');

    await page.click('button:has-text("Memo Version Test")');
    await page.waitForSelector('.memo-view', { state: 'visible' });
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
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Notebook to Restore');

    await selectAndDeleteNotebook(page, 'Notebook to Restore');
    await page.waitForSelector('.notebook-item:has-text("Notebook to Restore")', { state: 'hidden' });

    await openTrashBin(page);

    await page.click('.trash-item:has-text("Notebook to Restore") button:has-text("Restore")');

    await closeTrashBin(page);

    await expect(page.locator('.notebook-item:has-text("Notebook to Restore")')).toBeVisible();

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
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Memo Restore Test');

    await page.click('button:has-text("Memo Restore Test")');
    await page.waitForSelector('.memo-view', { state: 'visible' });
    await addMemo(page, 'Memo to Restore', 'Restore this');

    await deleteMemo(page, 'Memo to Restore');

    await goBackToNotebookList(page);
    await openTrashBin(page);

    await page.click('.trash-tab:has-text("Memos")');
    await page.click('.trash-item:has-text("Memo to Restore") button:has-text("Restore")');

    await closeTrashBin(page);

    await page.click('button:has-text("Memo Restore Test")');
    await page.waitForSelector('.memo-view', { state: 'visible' });

    await expect(page.locator('.memo-card__original')).toContainText('Memo to Restore');

    const memos = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:memos');
      return stored ? JSON.parse(stored) : [];
    });

    const restoredMemo = memos.find((m: any) => m.originalText === 'Memo to Restore');
    expect(restoredMemo.isDeleted).toBe(false);
    expect(restoredMemo.deletedAt).toBeUndefined();
  });

  test('restoring notebook restores all its memos', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Restore Cascade Test');

    await page.click('button:has-text("Restore Cascade Test")');
    await page.waitForSelector('.memo-view', { state: 'visible' });
    await addMemo(page, 'Cascade Memo 1', 'Meaning 1');
    await addMemo(page, 'Cascade Memo 2', 'Meaning 2');

    await goBackToNotebookList(page);

    await selectAndDeleteNotebook(page, 'Restore Cascade Test');
    await page.waitForSelector('.notebook-item:has-text("Restore Cascade Test")', { state: 'hidden' });

    await openTrashBin(page);

    await page.click('.trash-item:has-text("Restore Cascade Test") button:has-text("Restore")');

    await closeTrashBin(page);

    await page.click('button:has-text("Restore Cascade Test")');
    await page.waitForSelector('.memo-view', { state: 'visible' });

    await expect(page.locator('.memo-card__original')).toContainText('Cascade Memo 1');
  });

  test('restore increments version', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Restore Version Test');

    await selectAndDeleteNotebook(page, 'Restore Version Test');
    await page.waitForSelector('.notebook-item:has-text("Restore Version Test")', { state: 'hidden' });

    const beforeRestore = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      const notebooks = stored ? JSON.parse(stored) : [];
      return notebooks.find((n: any) => n.name === 'Restore Version Test');
    });

    await openTrashBin(page);

    await page.click('.trash-item:has-text("Restore Version Test") button:has-text("Restore")');

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
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Permanent Delete Notebook');

    await selectAndDeleteNotebook(page, 'Permanent Delete Notebook');
    await page.waitForSelector('.notebook-item:has-text("Permanent Delete Notebook")', { state: 'hidden' });

    await openTrashBin(page);

    page.once('dialog', dialog => dialog.accept());

    await page.click('.trash-item:has-text("Permanent Delete Notebook") button:has-text("Delete Forever")');

    await page.waitForSelector('.trash-item:has-text("Permanent Delete Notebook")', { state: 'hidden' });

    const notebooks = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      return stored ? JSON.parse(stored) : [];
    });

    const deletedNotebook = notebooks.find((n: any) => n.name === 'Permanent Delete Notebook');
    expect(deletedNotebook).toBeUndefined();
  });

  test('can permanently delete a memo', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Permanent Delete Memo Test');

    await page.click('button:has-text("Permanent Delete Memo Test")');
    await page.waitForSelector('.memo-view', { state: 'visible' });
    await addMemo(page, 'Permanent Delete Memo', 'Delete forever');

    await deleteMemo(page, 'Permanent Delete Memo');

    await goBackToNotebookList(page);
    await openTrashBin(page);

    await page.click('.trash-tab:has-text("Memos")');

    page.once('dialog', dialog => dialog.accept());

    await page.click('.trash-item:has-text("Permanent Delete Memo") button:has-text("Delete Forever")');

    await page.waitForSelector('.trash-item:has-text("Permanent Delete Memo")', { state: 'hidden' });

    const memos = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:memos');
      return stored ? JSON.parse(stored) : [];
    });

    const deletedMemo = memos.find((m: any) => m.originalText === 'Permanent Delete Memo');
    expect(deletedMemo).toBeUndefined();
  });

  test('permanent delete notebook removes all its memos', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Permanent Cascade Test');

    await page.click('button:has-text("Permanent Cascade Test")');
    await page.waitForSelector('.memo-view', { state: 'visible' });
    await addMemo(page, 'Cascade Permanent 1', 'Meaning 1');
    await addMemo(page, 'Cascade Permanent 2', 'Meaning 2');

    await goBackToNotebookList(page);

    await selectAndDeleteNotebook(page, 'Permanent Cascade Test');
    await page.waitForSelector('.notebook-item:has-text("Permanent Cascade Test")', { state: 'hidden' });

    await openTrashBin(page);

    page.once('dialog', dialog => dialog.accept());

    await page.click('.trash-item:has-text("Permanent Cascade Test") button:has-text("Delete Forever")');

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
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Confirm Delete Test');

    await selectAndDeleteNotebook(page, 'Confirm Delete Test');
    await page.waitForSelector('.notebook-item:has-text("Confirm Delete Test")', { state: 'hidden' });

    await openTrashBin(page);

    let dialogCount = 0;
    page.once('dialog', dialog => {
      dialogCount++;
      dialog.dismiss();
    });

    await page.click('.trash-item:has-text("Confirm Delete Test") button:has-text("Delete Forever")');

    await page.waitForTimeout(100);

    expect(dialogCount).toBeGreaterThanOrEqual(1);

    const notebooks = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:notebooks');
      return stored ? JSON.parse(stored) : [];
    });

    expect(notebooks.find((n: any) => n.name === 'Confirm Delete Test')).toBeDefined();
  });
});

test.describe('Trash Bin UI', () => {
  test('trash bin shows empty message when no deleted items', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openTrashBin(page);

    await expect(page.locator('.empty-trash')).toBeVisible();
    await expect(page.locator('.empty-trash p')).toHaveText('No deleted notebooks');
  });

  test('trash bin tabs switch between notebooks and memos', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Tab Test Notebook');

    await page.click('button:has-text("Tab Test Notebook")');
    await page.waitForSelector('.memo-view', { state: 'visible' });
    await addMemo(page, 'Tab Test Memo', 'Meaning');

    await deleteMemo(page, 'Tab Test Memo');

    await goBackToNotebookList(page);

    await selectAndDeleteNotebook(page, 'Tab Test Notebook');
    await page.waitForSelector('.notebook-item:has-text("Tab Test Notebook")', { state: 'hidden' });

    await openTrashBin(page);

    await expect(page.locator('.trash-tab:has-text("Notebooks")')).toHaveClass(/active/);
    await expect(page.locator('.trash-item:has-text("Tab Test Notebook")')).toBeVisible();

    await page.click('.trash-tab:has-text("Memos")');

    await expect(page.locator('.trash-tab:has-text("Memos")')).toHaveClass(/active/);
    await expect(page.locator('.trash-item:has-text("Tab Test Memo")')).toBeVisible();
  });

  test('trash bin shows correct counts in tabs', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Count Test 1');
    await createNotebook(page, 'Count Test 2');

    await selectAndDeleteNotebook(page, 'Count Test 1');
    await page.waitForSelector('.notebook-item:has-text("Count Test 1")', { state: 'hidden' });

    await selectAndDeleteNotebook(page, 'Count Test 2');
    await page.waitForSelector('.notebook-item:has-text("Count Test 2")', { state: 'hidden' });

    await openTrashBin(page);

    await expect(page.locator('.trash-tab:has-text("Notebooks")')).toContainText('2');
  });

  test('trash bin shows deletion date', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Date Test Notebook');

    await selectAndDeleteNotebook(page, 'Date Test Notebook');
    await page.waitForSelector('.notebook-item:has-text("Date Test Notebook")', { state: 'hidden' });

    await openTrashBin(page);

    await expect(page.locator('.trash-item:has-text("Date Test Notebook") .trash-item-meta')).toContainText('Deleted');
  });

  test('trash bin can be closed', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openTrashBin(page);
    await expect(page.locator('.trash-page-content')).toBeVisible();

    await page.click('button:has-text("← Back")');

    await page.waitForSelector('.trash-page-content', { state: 'hidden' });
    await expect(page.locator('h1:has-text("Memo Pads")')).toBeVisible();
  });

  test('clicking side menu backdrop closes menu', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await page.click('.menu-trigger-btn');
    await expect(page.locator('.side-menu--open')).toBeVisible();

    await page.click('.side-menu-backdrop');

    await page.waitForSelector('.side-menu--open', { state: 'hidden' });
  });
});

test.describe('Deletion Edge Cases', () => {
  test('deleting last memo in notebook shows empty state', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Last Memo Test');

    await page.click('button:has-text("Last Memo Test")');
    await page.waitForSelector('.memo-view', { state: 'visible' });
    await addMemo(page, 'Only Memo', 'The only one');

    await deleteMemo(page, 'Only Memo');

    await page.waitForSelector('.memo-card', { state: 'hidden' });

    await expect(page.locator('button:has-text("Add Your First Memo"), button.add-memo-btn')).toBeVisible();
  });

  test('deleting notebook clears view progress', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Progress Clear Test');

    await page.click('button:has-text("Progress Clear Test")');
    await page.waitForSelector('.memo-view', { state: 'visible' });
    await addMemo(page, 'Progress Memo', 'Test');

    await goBackToNotebookList(page);

    const beforeDelete = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:progress');
      return stored ? JSON.parse(stored) : {};
    });

    await selectAndDeleteNotebook(page, 'Progress Clear Test');
    await page.waitForSelector('.notebook-item:has-text("Progress Clear Test")', { state: 'hidden' });

    const afterDelete = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:progress');
      return stored ? JSON.parse(stored) : {};
    });

    const notebookId = Object.keys(beforeDelete)[0];
    expect(afterDelete[notebookId]).toBeUndefined();
  });

  test('restoring memo to deleted notebook shows in trash', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Restore Parent Test');

    await page.click('button:has-text("Restore Parent Test")');
    await page.waitForSelector('.memo-view', { state: 'visible' });
    await addMemo(page, 'Orphan Memo', 'Parent deleted');

    await goBackToNotebookList(page);

    await selectAndDeleteNotebook(page, 'Restore Parent Test');
    await page.waitForSelector('.notebook-item:has-text("Restore Parent Test")', { state: 'hidden' });

    await openTrashBin(page);

    await page.click('.trash-tab:has-text("Memos")');
    await page.click('.trash-item:has-text("Orphan Memo") button:has-text("Restore")');

    const memos = await page.evaluate(() => {
      const stored = localStorage.getItem('memo-pads:memos');
      return stored ? JSON.parse(stored) : [];
    });

    const restoredMemo = memos.find((m: any) => m.originalText === 'Orphan Memo');
    expect(restoredMemo.isDeleted).toBe(false);
  });

  test('deleted items persist across page reload', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });
    await createNotebook(page, 'Persist Delete Test');

    await selectAndDeleteNotebook(page, 'Persist Delete Test');
    await page.waitForSelector('.notebook-item:has-text("Persist Delete Test")', { state: 'hidden' });

    await page.reload();
    await page.waitForSelector('.app-header', { state: 'visible' });

    await expect(page.locator('.notebook-item:has-text("Persist Delete Test")')).not.toBeVisible();

    await openTrashBin(page);

    await expect(page.locator('.trash-item:has-text("Persist Delete Test")')).toBeVisible();
  });
});
