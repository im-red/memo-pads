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
  await page.waitForSelector(`button:has-text("${name}")`, { state: 'visible' });
}

async function addMemo(page: any, originalText: string, explanation: string) {
  await page.waitForSelector('.memo-view', { state: 'visible' });
  await page.click('button:has-text("Add Your First Memo"), button.fab--primary');
  await page.waitForSelector('.overlay:has-text("Add New Memo")', { state: 'visible' });
  await page.fill('textarea[placeholder="Enter the word or phrase..."]', originalText);
  await page.fill('textarea[placeholder="Enter the meaning or translation..."]', explanation);
  await page.click('.overlay .form-actions button:has-text("Add Memo")');
  await page.waitForSelector('.memo-card', { state: 'visible' });
}

async function goBackToNotebookList(page: any) {
  await page.click('button:has-text("←")');
  await page.waitForSelector('h1:has-text("Memo Pads")', { state: 'visible' });
}

async function openSideMenu(page: any) {
  await page.click('.menu-trigger-btn');
  await page.waitForSelector('.side-menu.side-menu--open', { state: 'visible' });
  await page.waitForTimeout(400); // Wait for CSS transition
}

test.describe('ExportOverlay', () => {
  test('can open export overlay from side menu', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Export")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });
    await expect(page.locator('.overlay-header h2')).toHaveText('Export Data');
  });

  test('shows all notebooks with correct memo counts', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Test Notebook 1');

    await page.click('button:has-text("Test Notebook 1")');
    await page.waitForSelector('.back-btn', { state: 'visible' });
    await addMemo(page, 'Test memo text', 'Test explanation');

    await goBackToNotebookList(page);

    await openSideMenu(page);
    await page.click('button:has-text("Export")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await expect(page.locator('.export-notebook-item')).toHaveCount(1);
    await expect(page.locator('.export-notebook-name')).toHaveText('Test Notebook 1');
    await expect(page.locator('.export-notebook-count')).toHaveText('1 memos');
  });

  test('shows preview of what will be exported', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Export Test Notebook');

    await openSideMenu(page);
    await page.click('button:has-text("Export")');

    await page.waitForSelector('.export-preview', { state: 'visible' });
    await page.waitForSelector('.export-notebook-item', { state: 'visible' });

    await expect(page.locator('.export-notebook-item')).toHaveCount(1);
  });

  test('all notebooks are selected by default', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Notebook A');
    await createNotebook(page, 'Notebook B');

    await openSideMenu(page);
    await page.click('button:has-text("Export")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    const checkboxes = await page.locator('.export-notebook-item input[type="checkbox"]').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).toBeChecked();
    }
  });

  test('can toggle individual notebook selection', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Toggle Test Notebook');

    await openSideMenu(page);
    await page.click('button:has-text("Export")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await page.click('.export-notebook-item');
    await expect(page.locator('.export-notebook-item input[type="checkbox"]')).not.toBeChecked();

    await page.click('.export-notebook-item');
    await expect(page.locator('.export-notebook-item input[type="checkbox"]')).toBeChecked();
  });

  test('can select all notebooks', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Select All Test 1');
    await createNotebook(page, 'Select All Test 2');

    await openSideMenu(page);
    await page.click('button:has-text("Export")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });
    await page.waitForSelector('.export-notebook-item input[type="checkbox"]:checked');

    await page.click('.export-notebook-item:first-child');
    await expect(page.locator('.export-notebook-item:first-child input[type="checkbox"]')).not.toBeChecked();

    await page.locator('.overlay-panel .export-select-actions button').filter({ hasText: /^Select All$/ }).click();

    const checkboxes = await page.locator('.export-notebook-item input[type="checkbox"]').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).toBeChecked();
    }
  });

  test('can deselect all notebooks', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Deselect All Test');

    await openSideMenu(page);
    await page.click('button:has-text("Export")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await page.locator('.overlay-panel button:has-text("Deselect All")').click();

    const checkboxes = await page.locator('.export-notebook-item input[type="checkbox"]').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).not.toBeChecked();
    }
  });

  test('export button is disabled when no notebooks selected', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Disabled Export Test');

    await openSideMenu(page);
    await page.click('button:has-text("Export")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await page.locator('.overlay-panel button:has-text("Deselect All")').click();

    await expect(page.locator('.overlay-panel button.btn-primary:has-text("Export")')).toBeDisabled();
  });

  test('shows empty message when no notebooks exist', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Export")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await expect(page.locator('.overlay-panel .empty-message')).toHaveText('No notebooks to export');
  });

  test('can close via close button', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Export")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await page.click('.overlay-close');

    await page.waitForSelector('.overlay-panel', { state: 'hidden' });
  });

  test('can close via backdrop click', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Export")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await page.evaluate(() => {
      const backdrop = document.querySelector('.overlay-backdrop') as HTMLElement;
      backdrop.click();
    });

    await page.waitForSelector('.overlay-panel', { state: 'hidden' });
  });

  test('preview updates when selection changes', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Preview Update Test');

    await page.click('button:has-text("Preview Update Test")');
    await page.waitForSelector('.back-btn', { state: 'visible' });
    await addMemo(page, 'Memo 1', 'Explanation 1');

    await goBackToNotebookList(page);

    await openSideMenu(page);
    await page.click('button:has-text("Export")');

    await page.waitForSelector('.export-preview', { state: 'visible' });

    await expect(page.locator('.export-preview')).toContainText('1 notebooks');
    await expect(page.locator('.export-preview')).toContainText('1 memos');

    await page.click('.export-notebook-item');

    await expect(page.locator('.export-preview')).toContainText('0 notebooks');
    await expect(page.locator('.export-preview')).toContainText('0 memos');
  });

  test('can export selected notebooks', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Export Success Test');

    await openSideMenu(page);
    await page.click('button:has-text("Export")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });
    await page.waitForSelector('.export-notebook-item input[type="checkbox"]:checked');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('.overlay-panel button.btn-primary:has-text("Export")').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('memo-pads_');
    expect(download.suggestedFilename()).toContain('.json');
  });
});

test.describe('ImportOverlay', () => {
  test('can open import overlay from side menu', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });
    await expect(page.locator('.overlay-header h2')).toHaveText('Import Data');
  });

  test('shows file selection button initially', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await expect(page.locator('button:has-text("Select JSON File")')).toBeVisible();
  });

  test('shows error for invalid JSON file', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.form-error', { state: 'visible' });
    await expect(page.locator('.form-error')).toContainText('is not valid JSON');
  });

  test('shows error for file missing notebooks array', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.form-error', { state: 'visible' });
    await expect(page.locator('.form-error')).toContainText('missing notebooks array');
  });

  test('shows error for file missing memos array', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.form-error', { state: 'visible' });
    await expect(page.locator('.form-error')).toContainText('missing memos array');
  });

  test('shows imported notebooks with memo counts', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.export-notebook-item', { state: 'visible' });

    await expect(page.locator('.export-notebook-name')).toHaveText('Imported Notebook');
    await expect(page.locator('.export-notebook-count')).toHaveText('2 memos');
  });

  test('shows new status for new notebooks', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.import-status', { state: 'visible' });

    await expect(page.locator('.import-status--new')).toHaveText('New');
  });

  test('shows existing status for existing notebooks by id', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Existing Notebook');

    const notebookId = await page.evaluate(() => {
      const notebooks = JSON.parse(localStorage.getItem('memo-pads-notebooks') || '[]');
      return notebooks[0]?.id;
    });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.import-status', { state: 'visible' });

    await expect(page.locator('.import-status--existing')).toHaveText('Existing');
  });

  test('shows update status for notebooks with same id but different name', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Original Name');

    const notebookId = await page.evaluate(() => {
      const notebooks = JSON.parse(localStorage.getItem('memo-pads-notebooks') || '[]');
      return notebooks[0]?.id;
    });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.import-status', { state: 'visible' });

    const statusText = await page.locator('.import-status').first().textContent();
    expect(statusText).toBeTruthy();
  });

  test('all imported notebooks are selected by default', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.export-notebook-item', { state: 'visible' });

    const checkboxes = await page.locator('.export-notebook-item input[type="checkbox"]').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).toBeChecked();
    }
  });

  test('can toggle individual notebook selection in import', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.export-notebook-item', { state: 'visible' });

    await page.click('.export-notebook-item');
    await expect(page.locator('.export-notebook-item input[type="checkbox"]')).not.toBeChecked();

    await page.click('.export-notebook-item');
    await expect(page.locator('.export-notebook-item input[type="checkbox"]')).toBeChecked();
  });

  test('can select all in import', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.export-notebook-item', { state: 'visible' });

    await page.click('.export-notebook-item:first-child');
    await expect(page.locator('.export-notebook-item:first-child input[type="checkbox"]')).not.toBeChecked();

    await page.locator('.overlay-panel .export-select-actions button').filter({ hasText: /^Select All$/ }).click();

    const checkboxes = await page.locator('.export-notebook-item input[type="checkbox"]').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).toBeChecked();
    }
  });

  test('can deselect all in import', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.export-notebook-item', { state: 'visible' });

    await page.locator('.overlay-panel button:has-text("Deselect All")').click();

    const checkboxes = await page.locator('.export-notebook-item input[type="checkbox"]').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).not.toBeChecked();
    }
  });

  test('import button is disabled when no notebooks selected', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.export-notebook-item', { state: 'visible' });

    await page.locator('.overlay-panel button:has-text("Deselect All")').click();

    await expect(page.locator('.overlay-panel button.btn-primary:has-text("Import")')).toBeDisabled();
  });

  test('shows import preview with correct counts', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.import-preview', { state: 'visible' });

    await expect(page.locator('.import-preview')).toContainText('1 new notebooks will be created');
    await expect(page.locator('.import-preview')).toContainText('2 new memos will be added');
  });

  test('shows duplicate count in preview', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Duplicate Test Notebook');

    const notebookId = await page.evaluate(() => {
      const notebooks = JSON.parse(localStorage.getItem('memo-pads-notebooks') || '[]');
      return notebooks[0]?.id;
    });

    await page.click('button:has-text("Duplicate Test Notebook")');
    await page.waitForSelector('.back-btn', { state: 'visible' });
    await addMemo(page, 'Duplicate Memo', 'Duplicate Explanation');

    await goBackToNotebookList(page);

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.import-preview', { state: 'visible' });

    await expect(page.locator('.import-duplicates')).toContainText('1 duplicate memos will be skipped');
  });

  test('can import new notebooks successfully', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.export-notebook-item', { state: 'visible' });

    page.on('dialog', dialog => dialog.accept());
    await page.locator('.overlay-panel button.btn-primary:has-text("Import")').click();

    await page.waitForSelector('.overlay-panel', { state: 'hidden' });

    await page.waitForSelector('button:has-text("Successfully Imported")');
    await page.click('button:has-text("Successfully Imported")');

    await page.waitForSelector('.memo-card');
    await expect(page.locator('.memo-card')).toContainText('Imported Memo');
  });

  test('can close import overlay via close button', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await page.click('.overlay-close');

    await page.waitForSelector('.overlay-panel', { state: 'hidden' });
  });

  test('can close import overlay via backdrop click', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await page.evaluate(() => {
      const backdrop = document.querySelector('.overlay-backdrop') as HTMLElement;
      backdrop.click();
    });

    await page.waitForSelector('.overlay-panel', { state: 'hidden' });
  });

  test('resets state when closed and reopened', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.export-notebook-item', { state: 'visible' });

    await page.click('.overlay-close');

    await page.waitForSelector('.overlay-panel', { state: 'hidden' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await expect(page.locator('button:has-text("Select JSON File")')).toBeVisible();
    await expect(page.locator('.export-notebook-item')).toHaveCount(0);
  });

  test('shows empty message for file with no notebooks', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

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

    await page.waitForSelector('.overlay-panel .empty-message', { state: 'visible' });
    await expect(page.locator('.overlay-panel .empty-message')).toHaveText('No notebooks in file');
  });
});
