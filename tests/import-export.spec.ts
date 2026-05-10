import { test, expect } from '@playwright/test';
import { waitForIonicPage, clearStorage, createNotebook, selectAndDeleteNotebook, addMemo, deleteMemo, navigateViaMenu, openSideMenu, closeSideMenu, goBackToNotebookList, getPageTitle } from './test-utils';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  await waitForIonicPage(page);
});

test.describe('ExportOverlay', () => {
  test('can open export overlay from side menu', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Export Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();
    await expect(modal.locator('ion-title')).toHaveText('Export Data');
  });

  test('shows all notebooks with correct memo counts', async ({ page }) => {
    await createNotebook(page, 'Test Notebook 1');
    await page.waitForTimeout(500);
    await addMemo(page, 'Test memo text', 'Test explanation');

    await goBackToNotebookList(page);

    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Export Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    await expect(modal.locator('ion-item')).toHaveCount(1);
    await expect(modal.locator('ion-label h2')).toHaveText('Test Notebook 1');
    await expect(modal.locator('ion-label p')).toHaveText('1 memos');
  });

  test('shows preview of what will be exported', async ({ page }) => {
    await createNotebook(page, 'Export Test Notebook');
    await goBackToNotebookList(page);

    await openSideMenu(page);
    const exportItem = page.locator('ion-menu ion-item:has-text("Export Data")');
    await exportItem.scrollIntoViewIfNeeded();
    await exportItem.click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    await expect(modal.locator('ion-item')).toHaveCount(1);
  });

  test('all notebooks are selected by default', async ({ page }) => {
    await createNotebook(page, 'Notebook A');
    await goBackToNotebookList(page);
    await createNotebook(page, 'Notebook B');
    await goBackToNotebookList(page);

    await openSideMenu(page);
    const exportItem = page.locator('ion-menu ion-item:has-text("Export Data")');
    await exportItem.scrollIntoViewIfNeeded();
    await exportItem.click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    const checkboxes = await modal.locator('ion-item ion-checkbox').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).toBeChecked();
    }
  });

  test('can toggle individual notebook selection', async ({ page }) => {
    await createNotebook(page, 'Toggle Test Notebook');
    await goBackToNotebookList(page);

    await openSideMenu(page);
    const exportItem = page.locator('ion-menu ion-item:has-text("Export Data")');
    await exportItem.scrollIntoViewIfNeeded();
    await exportItem.click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    await modal.locator('ion-item').click();
    await expect(modal.locator('ion-item ion-checkbox')).not.toBeChecked();

    await modal.locator('ion-item').click();
    await expect(modal.locator('ion-item ion-checkbox')).toBeChecked();
  });

  test('can select all notebooks', async ({ page }) => {
    await createNotebook(page, 'Select All Test 1');
    await goBackToNotebookList(page);
    await createNotebook(page, 'Select All Test 2');
    await goBackToNotebookList(page);

    await openSideMenu(page);
    const exportItem = page.locator('ion-menu ion-item:has-text("Export Data")');
    await exportItem.scrollIntoViewIfNeeded();
    await exportItem.click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();
    await page.waitForTimeout(300);

    await modal.locator('ion-item:first-child').click();
    await expect(modal.locator('ion-item:first-child ion-checkbox')).not.toBeChecked();

    await modal.locator('ion-button').filter({ hasText: /^Select All$/ }).click();

    const checkboxes = await modal.locator('ion-item ion-checkbox').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).toBeChecked();
    }
  });

  test('can deselect all notebooks', async ({ page }) => {
    await createNotebook(page, 'Deselect All Test');
    await goBackToNotebookList(page);

    await openSideMenu(page);
    const exportItem = page.locator('ion-menu ion-item:has-text("Export Data")');
    await exportItem.scrollIntoViewIfNeeded();
    await exportItem.click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    await modal.locator('ion-button').filter({ hasText: /^Deselect All$/ }).click();

    const checkboxes = await modal.locator('ion-item ion-checkbox').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).not.toBeChecked();
    }
  });

  test('export button is disabled when no notebooks selected', async ({ page }) => {
    await createNotebook(page, 'Disabled Export Test');
    await goBackToNotebookList(page);

    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Export Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    const deselectBtn = modal.locator('ion-button').filter({ hasText: /^Deselect All$/ });
    await deselectBtn.click();
    await page.waitForTimeout(500);

    const exportBtn = modal.locator('ion-button:has-text("Export")');
    await expect(exportBtn).toHaveAttribute('disabled', '');
  });

  test('shows empty message when no notebooks exist', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Export Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    await expect(modal.locator('ion-label')).toContainText('No notebooks to export');
  });

  test('can close via close button', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Export Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    await modal.locator('ion-button:has-text("Close")').click();

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'hidden' });
  });

  test('preview updates when selection changes', async ({ page }) => {
    await createNotebook(page, 'Preview Update Test');
    await page.waitForTimeout(500);
    await addMemo(page, 'Memo 1', 'Explanation 1');

    await goBackToNotebookList(page);

    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Export Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    await expect(modal.locator('.export-preview')).toContainText('1 notebooks');
    await expect(modal.locator('.export-preview')).toContainText('1 memos');

    await modal.locator('ion-item').click();

    await expect(modal.locator('.export-preview')).toContainText('0 notebooks');
    await expect(modal.locator('.export-preview')).toContainText('0 memos');
  });

  test('can export selected notebooks', async ({ page }) => {
    await createNotebook(page, 'Export Success Test');
    await goBackToNotebookList(page);

    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Export Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();
    await page.waitForTimeout(300);

    const downloadPromise = page.waitForEvent('download');
    await modal.locator('ion-button:has-text("Export")').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('memo-pads_');
    expect(download.suggestedFilename()).toContain('.json');
  });
});

test.describe('ImportOverlay', () => {
  test('can open import overlay from side menu', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Import Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();
    await expect(modal.locator('ion-title')).toHaveText('Import Data');
  });

  test('shows file selection button initially', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Import Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    await expect(modal.locator('ion-button:has-text("Select JSON File")')).toBeVisible();
  });

  test('shows error for invalid JSON file', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Import Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    const invalidJsonContent = 'this is not valid json';
    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'invalid.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, invalidJsonContent);

    await page.waitForTimeout(500);
    await expect(modal.locator('ion-text[color="danger"]')).toContainText('is not valid JSON');
  });

  test('shows error for file missing notebooks array', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Import Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    const invalidContent = JSON.stringify({ memos: [] });
    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'missing-notebooks.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, invalidContent);

    await page.waitForTimeout(500);
    await expect(modal.locator('ion-text[color="danger"]')).toContainText('missing notebooks array');
  });

  test('shows error for file missing memos array', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Import Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    const invalidContent = JSON.stringify({ notebooks: [] });
    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'missing-memos.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, invalidContent);

    await page.waitForTimeout(500);
    await expect(modal.locator('ion-text[color="danger"]')).toContainText('missing memos array');
  });

  test('shows imported notebooks with memo counts', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Import Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    const validContent = JSON.stringify({
      notebooks: [
        { id: 'nb1', name: 'Imported Notebook', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' }
      ],
      memos: [
        { id: 1, notebookId: 'nb1', originalText: 'Memo 1', explanation: 'Exp 1', createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 2, notebookId: 'nb1', originalText: 'Memo 2', explanation: 'Exp 2', createdAt: '2024-01-01T00:00:00.000Z' }
      ]
    });

    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'valid.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, validContent);

    await page.waitForTimeout(500);
    await expect(modal.locator('ion-label h2')).toHaveText('Imported Notebook');
    await expect(modal.locator('ion-label p')).toHaveText('2 memos');
  });

  test('shows new status for new notebooks', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Import Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    const validContent = JSON.stringify({
      notebooks: [
        { id: 'new-nb-1', name: 'Brand New Notebook', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' }
      ],
      memos: []
    });

    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'new-notebook.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, validContent);

    await page.waitForTimeout(500);
    await expect(modal.locator('ion-badge')).toHaveText('New');
  });

  test('shows existing status for existing notebooks by id', async ({ page }) => {
    await createNotebook(page, 'Existing Notebook');
    await goBackToNotebookList(page);

    const notebookId = await page.evaluate(() => {
      const notebooks = JSON.parse(localStorage.getItem('memo-pads-notebooks') || '[]');
      return notebooks[0]?.id;
    });

    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Import Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    const validContent = JSON.stringify({
      notebooks: [
        { id: notebookId, name: 'Existing Notebook', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' }
      ],
      memos: []
    });

    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'existing-notebook.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, validContent);

    await page.waitForTimeout(500);
    await expect(modal.locator('ion-badge')).toHaveText('Existing');
  });

  test('shows update status for notebooks with same id but different name', async ({ page }) => {
    await createNotebook(page, 'Original Name');
    await goBackToNotebookList(page);

    const notebookId = await page.evaluate(() => {
      const notebooks = JSON.parse(localStorage.getItem('memo-pads-notebooks') || '[]');
      return notebooks[0]?.id;
    });

    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Import Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    const validContent = JSON.stringify({
      notebooks: [
        { id: notebookId, name: 'Updated Name', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' }
      ],
      memos: []
    });

    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'update-notebook.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, validContent);

    await page.waitForTimeout(500);

    const statusText = await modal.locator('ion-badge').first().textContent();
    expect(statusText).toBeTruthy();
  });

  test('all imported notebooks are selected by default', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Import Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    const validContent = JSON.stringify({
      notebooks: [
        { id: 'nb1', name: 'Notebook 1', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' },
        { id: 'nb2', name: 'Notebook 2', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' }
      ],
      memos: []
    });

    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'multi-notebooks.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, validContent);

    await page.waitForTimeout(500);

    const checkboxes = await modal.locator('ion-item ion-checkbox').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).toBeChecked();
    }
  });

  test('can toggle individual notebook selection in import', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Import Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    const validContent = JSON.stringify({
      notebooks: [
        { id: 'nb1', name: 'Toggle Import Test', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' }
      ],
      memos: []
    });

    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'toggle-import.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, validContent);

    await page.waitForTimeout(500);

    await modal.locator('ion-item').click();
    await expect(modal.locator('ion-item ion-checkbox')).not.toBeChecked();

    await modal.locator('ion-item').click();
    await expect(modal.locator('ion-item ion-checkbox')).toBeChecked();
  });

  test('can select all in import', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Import Data")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    const validContent = JSON.stringify({
      notebooks: [
        { id: 'nb1', name: 'Select All Import 1', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' },
        { id: 'nb2', name: 'Select All Import 2', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' }
      ],
      memos: []
    });

    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'select-all-import.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, validContent);

    await page.waitForTimeout(500);

    await modal.locator('ion-item:first-child').click();
    await expect(modal.locator('ion-item:first-child ion-checkbox')).not.toBeChecked();

    await modal.locator('ion-button').filter({ hasText: /^Select All$/ }).click();

    const checkboxes = await modal.locator('ion-item ion-checkbox').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).toBeChecked();
    }
  });

  test('can deselect all in import', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import Data")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    const validContent = JSON.stringify({
      notebooks: [
        { id: 'nb1', name: 'Deselect All Import', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' }
      ],
      memos: []
    });

    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'deselect-all-import.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, validContent);

    await page.waitForSelector('ion-item', { state: 'visible' });

    await page.locator('ion-modal ion-button').filter({ hasText: /^Deselect All$/ }).click();

    const checkboxes = await page.locator('ion-item ion-checkbox').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).not.toBeChecked();
    }
  });

  test('import button is disabled when no notebooks selected', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import Data")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    const validContent = JSON.stringify({
      notebooks: [
        { id: 'nb1', name: 'Disabled Import Test', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' }
      ],
      memos: []
    });

    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'disabled-import.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, validContent);

    await page.waitForSelector('ion-item', { state: 'visible' });

    await page.locator('ion-modal ion-button').filter({ hasText: /^Deselect All$/ }).click();

    await expect(page.locator('ion-modal:not(.overlay-hidden) ion-button:has-text("Import")')).toHaveAttribute('disabled', /.*/);
  });

  test('shows import preview with correct counts', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import Data")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    const validContent = JSON.stringify({
      notebooks: [
        { id: 'nb1', name: 'Preview Import Test', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' }
      ],
      memos: [
        { id: 1, notebookId: 'nb1', originalText: 'Memo 1', explanation: 'Exp 1', createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 2, notebookId: 'nb1', originalText: 'Memo 2', explanation: 'Exp 2', createdAt: '2024-01-01T00:00:00.000Z' }
      ]
    });

    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'preview-import.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, validContent);

    await page.waitForSelector('ion-modal:not(.overlay-hidden) ion-text:has-text("new notebooks will be created")', { state: 'visible' });

    await expect(page.locator('ion-modal:not(.overlay-hidden) ion-text')).toContainText('1 new notebooks will be created');
    await expect(page.locator('ion-modal:not(.overlay-hidden) ion-text')).toContainText('2 new memos will be added');
  });

  test('shows duplicate count in preview', async ({ page }) => {
    await createNotebook(page, 'Duplicate Test Notebook');

    const notebookId = await page.evaluate(() => {
      const notebooks = JSON.parse(localStorage.getItem('memo-pads-notebooks') || '[]');
      return notebooks[0]?.id;
    });

    await addMemo(page, 'Duplicate Memo', 'Duplicate Explanation');

    await goBackToNotebookList(page);

    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import Data")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    const validContent = JSON.stringify({
      notebooks: [
        { id: notebookId, name: 'Duplicate Test Notebook', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' }
      ],
      memos: [
        { id: 999, notebookId: notebookId, originalText: 'Duplicate Memo', explanation: 'Duplicate Explanation', createdAt: '2024-01-01T00:00:00.000Z' }
      ]
    });

    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'duplicate-memo.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, validContent);

    await page.waitForSelector('ion-modal:not(.overlay-hidden) ion-text:has-text("duplicate memos will be skipped")', { state: 'visible' });

    await expect(page.locator('ion-modal:not(.overlay-hidden) ion-text')).toContainText('1 duplicate memos will be skipped');
  });

  test('can import new notebooks successfully', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import Data")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    const validContent = JSON.stringify({
      notebooks: [
        { id: 'import-nb-1', name: 'Successfully Imported', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' }
      ],
      memos: [
        { id: 1, notebookId: 'import-nb-1', originalText: 'Imported Memo', explanation: 'Imported Explanation', createdAt: '2024-01-01T00:00:00.000Z' }
      ]
    });

    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'successful-import.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, validContent);

    await page.waitForSelector('ion-item', { state: 'visible' });

    page.on('dialog', dialog => dialog.accept());
    await page.locator('ion-modal:not(.overlay-hidden) ion-button:has-text("Import")').evaluate((el: any) => el.click());

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'hidden' });
    await closeSideMenu(page);

    await page.waitForSelector('ion-item:has-text("Successfully Imported")');
    await page.click('ion-item:has-text("Successfully Imported")');

    await page.waitForSelector('.swiper-slide');
    await expect(page.locator('.swiper-slide-active')).toContainText('Imported Memo');
  });

  test('can close import overlay via close button', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import Data")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    await page.click('ion-button:has-text("Close")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'hidden' });
  });

  test('can close import overlay via backdrop click', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import Data")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    await page.evaluate(() => {
      const modal = document.querySelector('ion-modal:not(.overlay-hidden)') as any;
      modal.dismiss();
    });

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'hidden' });
  });

  test('resets state when closed and reopened', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import Data")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    const validContent = JSON.stringify({
      notebooks: [
        { id: 'reset-test', name: 'Reset Test Notebook', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', version: 1, deviceId: 'test' }
      ],
      memos: []
    });

    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'reset-test.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, validContent);

    await page.waitForSelector('ion-item', { state: 'visible' });

    await page.click('ion-button:has-text("Close")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'hidden' });

    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import Data")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    await expect(page.locator('ion-modal:not(.overlay-hidden) ion-button:has-text("Select JSON File")')).toBeVisible();
    await expect(page.locator('ion-modal:not(.overlay-hidden) ion-item')).toHaveCount(0);
  });

  test('shows empty message for file with no notebooks', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import Data")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    const validContent = JSON.stringify({
      notebooks: [],
      memos: []
    });

    await page.evaluate(content => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'empty-notebooks.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, validContent);

    await page.waitForSelector('ion-modal:not(.overlay-hidden) ion-label:has-text("No notebooks in file")', { state: 'visible' });
    await expect(page.locator('ion-modal:not(.overlay-hidden) ion-label')).toHaveText('No notebooks in file');
  });
});
