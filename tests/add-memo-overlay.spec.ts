import { test, expect } from '@playwright/test';
import { waitForIonicPage, clearStorage, createNotebook, addMemo } from './test-utils';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  await waitForIonicPage(page);
});

// ── Open overlay ───────────────────────────────────────────────────────────

test('opens add-memo overlay via FAB', async ({ page }) => {
  await createNotebook(page, 'Test NB');

  const fab = page.locator('ion-router-outlet > div:not(.ion-page-hidden) ion-fab-button.fab--primary').first();
  await fab.click();
  await page.waitForTimeout(500);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
  await expect(modal).toBeVisible();
  await expect(modal.locator('ion-title')).toContainText('Add Memo');
});

test('opens add-memo overlay via "Add Your First Memo" button', async ({ page }) => {
  await createNotebook(page, 'Empty NB');

  const addFirstBtn = page.locator('ion-button:has-text("Add Your First Memo")');
  await expect(addFirstBtn).toBeVisible();
  await addFirstBtn.click();
  await page.waitForTimeout(500);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
  await expect(modal).toBeVisible();
});

test('opens paste-mode overlay via paste FAB', async ({ page }) => {
  await createNotebook(page, 'Paste NB');

  const pasteFab = page.locator('ion-fab.fab-secondary-container ion-fab-button').first();
  await pasteFab.click();
  await page.waitForTimeout(500);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
  await expect(modal).toBeVisible();
  // In paste mode, the paste from clipboard button should NOT be visible
  const pasteBtn = modal.locator('ion-button[title="Paste from clipboard"]');
  await expect(pasteBtn).not.toBeVisible();
});

// ── Single memo add ────────────────────────────────────────────────────────

test('adds a single memo', async ({ page }) => {
  await createNotebook(page, 'Single NB');

  const addFirstBtn = page.locator('ion-button:has-text("Add Your First Memo")');
  await addFirstBtn.click();
  await page.waitForTimeout(500);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
  await expect(modal).toBeVisible();

  const textareas = modal.locator('ion-textarea textarea');
  await expect(textareas).toHaveCount(2);

  // Fill original
  await textareas.first().fill('apple');
  // Fill explanation
  await textareas.last().fill('苹果');

  // Submit
  await modal.locator('ion-button:has-text("Add Memo")').click();
  await page.waitForTimeout(1000);

  // Memo should appear in the notebook
  await expect(page.locator('.memo-card-text:has-text("apple")')).toBeVisible();
  // Click card to show explanation
  await page.locator('.memo-card').click();
  await page.waitForTimeout(300);
  await expect(page.locator('.memo-card-explanation:has-text("苹果")')).toBeVisible();
});

// ── Multi-memo add ─────────────────────────────────────────────────────────

test('adds multiple memos in one submission', async ({ page }) => {
  await createNotebook(page, 'Multi NB');

  const addFirstBtn = page.locator('ion-button:has-text("Add Your First Memo")');
  await addFirstBtn.click();
  await page.waitForTimeout(500);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
  await expect(modal).toBeVisible();

  // Click "Add another memo" twice → 3 entries total
  const addAnotherBtn = modal.locator('ion-button[title="Add another memo"]');
  await addAnotherBtn.click();
  await page.waitForTimeout(200);
  await addAnotherBtn.click();
  await page.waitForTimeout(200);

  // Should show "3" in title and button
  await expect(modal.locator('ion-title')).toContainText('Add Memo (3)');
  await expect(modal.locator('ion-button:has-text("Add 3 Memos")')).toBeVisible();

  // Should have 6 textareas (3 entries × 2 fields)
  const textareas = modal.locator('ion-textarea textarea');
  await expect(textareas).toHaveCount(6);

  // Fill all three entries
  await textareas.nth(0).fill('one');
  await textareas.nth(1).fill('meaning one');
  await textareas.nth(2).fill('two');
  await textareas.nth(3).fill('meaning two');
  await textareas.nth(4).fill('three');
  await textareas.nth(5).fill('meaning three');

  // Submit
  await modal.locator('ion-button:has-text("Add 3 Memos")').click();
  await page.waitForTimeout(1000);

  // All three memos should exist in the swiper
  await expect(page.locator('.memo-card-text:has-text("one")')).toBeVisible();
  await expect(page.locator('.memo-card-text:has-text("two")')).toBeVisible();
  await expect(page.locator('.memo-card-text:has-text("three")')).toBeVisible();
});

// ── Remove entries ─────────────────────────────────────────────────────────

test('removes an entry row before submitting', async ({ page }) => {
  await createNotebook(page, 'Remove NB');

  const addFirstBtn = page.locator('ion-button:has-text("Add Your First Memo")');
  await addFirstBtn.click();
  await page.waitForTimeout(500);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();

  // Add a second entry
  await modal.locator('ion-button[title="Add another memo"]').click();
  await page.waitForTimeout(200);
  await expect(modal.locator('ion-title')).toContainText('(2)');

  // Remove the first entry
  const removeBtns = modal.locator('ion-button[title="Remove this memo"]');
  await expect(removeBtns).toHaveCount(2);
  await removeBtns.first().click();
  await page.waitForTimeout(200);

  // Back to single entry, no remove button visible
  await expect(modal.locator('ion-title')).toContainText('Add Memo');
  await expect(modal.locator('ion-button[title="Remove this memo"]')).not.toBeVisible();
  await expect(modal.locator('ion-textarea textarea')).toHaveCount(2);

  // Fill and submit the remaining entry
  const textareas = modal.locator('ion-textarea textarea');
  await textareas.first().fill('survivor');
  await textareas.last().fill('幸存者');
  await modal.locator('ion-button:has-text("Add Memo")').click();
  await page.waitForTimeout(1000);

  await expect(page.locator('.memo-card-text:has-text("survivor")')).toBeVisible();
});

// ── Validation ─────────────────────────────────────────────────────────────

test('shows error when Original text is empty', async ({ page }) => {
  await createNotebook(page, 'Validate NB');

  const addFirstBtn = page.locator('ion-button:has-text("Add Your First Memo")');
  await addFirstBtn.click();
  await page.waitForTimeout(500);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
  const textareas = modal.locator('ion-textarea textarea');

  // Fill only explanation, leave original empty
  await textareas.last().fill('some meaning');

  await modal.locator('ion-button:has-text("Add Memo")').click();
  await page.waitForTimeout(300);

  await expect(modal.locator('ion-text:has-text("Original text is required")')).toBeVisible();
});

test('shows error when Explanation is empty', async ({ page }) => {
  await createNotebook(page, 'Validate2 NB');

  const addFirstBtn = page.locator('ion-button:has-text("Add Your First Memo")');
  await addFirstBtn.click();
  await page.waitForTimeout(500);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
  const textareas = modal.locator('ion-textarea textarea');

  // Fill only original, leave explanation empty
  await textareas.first().fill('some word');

  await modal.locator('ion-button:has-text("Add Memo")').click();
  await page.waitForTimeout(300);

  await expect(modal.locator('ion-text:has-text("Explanation is required")')).toBeVisible();
});

test('validates all entries in multi-entry mode', async ({ page }) => {
  await createNotebook(page, 'ValidateMulti NB');

  const addFirstBtn = page.locator('ion-button:has-text("Add Your First Memo")');
  await addFirstBtn.click();
  await page.waitForTimeout(500);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();

  // Add a second entry
  await modal.locator('ion-button[title="Add another memo"]').click();
  await page.waitForTimeout(200);

  const textareas = modal.locator('ion-textarea textarea');
  // Fill first entry completely
  await textareas.nth(0).fill('valid');
  await textareas.nth(1).fill('valid meaning');
  // Second entry: fill only original (missing explanation)
  await textareas.nth(2).fill('incomplete');

  await modal.locator('ion-button:has-text("Add 2 Memos")').click();
  await page.waitForTimeout(300);

  await expect(modal.locator('ion-text:has-text("required for all entries")')).toBeVisible();
});

// ── Edit memo ──────────────────────────────────────────────────────────────

test('edits a memo via overlay', async ({ page }) => {
  await createNotebook(page, 'Edit NB');
  await addMemo(page, 'original', 'meaning');

  // Verify memo exists
  await expect(page.locator('.memo-card-text:has-text("original")')).toBeVisible();

  // Open action sheet on the memo card menu
  const menuBtn = page.locator('.swiper-slide-active ion-button:has(ion-icon)').first();
  await menuBtn.click();
  await page.waitForTimeout(500);

  // Click the Edit button in the action sheet
  await page.evaluate(() => {
    const sheets = Array.from(document.querySelectorAll('ion-action-sheet'));
    const active = sheets.find(s => !s.classList.contains('overlay-hidden'));
    if (active) {
      const editBtn = Array.from(active.querySelectorAll('button.action-sheet-button'))
        .find(b => b.textContent?.includes('Edit')) as HTMLButtonElement;
      if (editBtn) editBtn.click();
    }
  });
  await page.waitForTimeout(500);

  // Edit overlay should show with pre-filled values and "Edit Memo" title
  const editModal = page.locator('ion-modal:not(.overlay-hidden)').first();
  await expect(editModal).toBeVisible();
  await expect(editModal.locator('ion-title')).toContainText('Edit Memo');

  // "Add another memo" button should NOT appear in edit mode
  await expect(editModal.locator('ion-button[title="Add another memo"]')).not.toBeVisible();

  const textareas = editModal.locator('ion-textarea textarea');
  await expect(textareas.first()).toHaveValue('original');
  await expect(textareas.last()).toHaveValue('meaning');

  // Modify values
  await textareas.first().fill('updated');
  await textareas.last().fill('更新');

  // Save changes
  await editModal.locator('ion-button:has-text("Save Changes")').click();
  await page.waitForTimeout(1000);

  // Updated text should appear
  await expect(page.locator('.memo-card-text:has-text("updated")')).toBeVisible();
});

// ── Cancel ──────────────────────────────────────────────────────────────────

test('closes overlay when Cancel is clicked', async ({ page }) => {
  await createNotebook(page, 'Cancel NB');

  const addFirstBtn = page.locator('ion-button:has-text("Add Your First Memo")');
  await addFirstBtn.click();
  await page.waitForTimeout(500);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
  await expect(modal).toBeVisible();

  await modal.locator('ion-button:has-text("Cancel")').click();
  await page.waitForTimeout(500);

  // Modal should close
  await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'hidden' });
});

// ── Duplicate detection ────────────────────────────────────────────────────

test('shows error when memo already exists', async ({ page }) => {
  await createNotebook(page, 'Dup NB');
  await addMemo(page, 'moon', '月球');

  // Try adding the same memo again
  const fab = page.locator('ion-router-outlet > div:not(.ion-page-hidden) ion-fab-button.fab--primary').first();
  await fab.click();
  await page.waitForTimeout(500);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
  const textareas = modal.locator('ion-textarea textarea');
  await textareas.first().fill('moon');
  await textareas.last().fill('月球');

  await modal.locator('ion-button:has-text("Add Memo")').click();
  await page.waitForTimeout(500);

  // Error should stay visible in the modal (not closed)
  await expect(modal.locator('ion-text:has-text("already exists")')).toBeVisible();
});
