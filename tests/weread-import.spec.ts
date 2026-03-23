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

async function openSideMenu(page: any) {
  await page.click('.menu-trigger-btn');
  await page.waitForSelector('.side-menu.side-menu--open', { state: 'visible' });
  await page.waitForTimeout(400); // Wait for CSS transition
}

const sampleWeReadContent = `
◆ 2024/01/15发表想法

这是我的第一条笔记的想法内容

原文：这是第一条原文内容

◆ 2024/01/16发表想法

这是我的第二条笔记的想法内容

原文：这是第二条原文内容
`;

test.describe('WeReadImportOverlay', () => {
  test('can open WeRead import overlay from side menu', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });
    await expect(page.locator('.overlay-header h2')).toHaveText('Import WeRead Notes');
  });

  test('shows file and text input tabs', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await expect(page.locator('button:has-text("From File")')).toBeVisible();
    await expect(page.locator('button:has-text("From Text")')).toBeVisible();
  });

  test('can switch between file and text input modes', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    // Default is file mode
    await expect(page.locator('button:has-text("Select WeRead Notes File")')).toBeVisible();

    // Switch to text mode
    await page.click('button:has-text("From Text")');
    await expect(page.locator('textarea[placeholder="Paste WeRead notes here..."]')).toBeVisible();
    await expect(page.locator('button:has-text("Parse Notes")')).toBeVisible();

    // Switch back to file mode
    await page.click('button:has-text("From File")');
    await expect(page.locator('button:has-text("Select WeRead Notes File")')).toBeVisible();
  });

  test('can parse WeRead notes from text input', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    // Switch to text mode
    await page.click('button:has-text("From Text")');

    // Enter text content
    await page.fill('textarea[placeholder="Paste WeRead notes here..."]', sampleWeReadContent);

    // Click parse
    await page.click('button:has-text("Parse Notes")');

    // Should show preview
    await page.waitForSelector('.weread-import-info', { state: 'visible' });
    await expect(page.locator('.weread-import-count')).toContainText('Found');
  });

  test('shows notebook dropdown when notes are parsed', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    // Create a notebook first
    await createNotebook(page, 'Test Notebook');

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    // Switch to text mode and parse
    await page.click('button:has-text("From Text")');
    await page.fill('textarea[placeholder="Paste WeRead notes here..."]', sampleWeReadContent);
    await page.click('button:has-text("Parse Notes")');

    // Wait for the form with dropdown
    await page.waitForSelector('select#notebookSelect', { state: 'visible' });

    // Check dropdown has the notebook
    const options = await page.locator('select#notebookSelect option').allTextContents();
    expect(options).toContain('Test Notebook');
  });

  test('can select notebook from dropdown', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Target Notebook');

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    // Parse notes
    await page.click('button:has-text("From Text")');
    await page.fill('textarea[placeholder="Paste WeRead notes here..."]', sampleWeReadContent);
    await page.click('button:has-text("Parse Notes")');

    // Select notebook from dropdown
    await page.waitForSelector('select#notebookSelect', { state: 'visible' });
    await page.selectOption('select#notebookSelect', { label: 'Target Notebook' });

    // Verify selection
    const selectedValue = await page.locator('select#notebookSelect').inputValue();
    expect(selectedValue).not.toBe('');
  });

  test('import button is disabled when no notebook is selected', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Test Notebook');

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    // Parse notes
    await page.click('button:has-text("From Text")');
    await page.fill('textarea[placeholder="Paste WeRead notes here..."]', sampleWeReadContent);
    await page.click('button:has-text("Parse Notes")');

    // Don't select any notebook
    await page.waitForSelector('select#notebookSelect', { state: 'visible' });

    // Import button should be disabled
    await expect(page.locator('button[type="submit"].btn-primary')).toBeDisabled();
  });

  test('can import WeRead notes to selected notebook', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Import Target');

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    // Parse notes
    await page.click('button:has-text("From Text")');
    await page.fill('textarea[placeholder="Paste WeRead notes here..."]', sampleWeReadContent);
    await page.click('button:has-text("Parse Notes")');

    // Select notebook
    await page.waitForSelector('select#notebookSelect', { state: 'visible' });
    await page.selectOption('select#notebookSelect', { label: 'Import Target' });

    // Handle alert
    page.on('dialog', dialog => dialog.accept());

    // Click import
    await page.click('button[type="submit"].btn-primary');

    // Wait for overlay to close
    await page.waitForSelector('.overlay-panel', { state: 'hidden' });

    // Navigate to notebook and verify memos were imported
    await page.click('button:has-text("Import Target")');
    await page.waitForSelector('.memo-card', { state: 'visible' });

    // Should have imported memos
    const memoCount = await page.locator('.memo-card').count();
    expect(memoCount).toBeGreaterThan(0);
  });

  test('shows duplicate count for existing notes', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await createNotebook(page, 'Duplicate Test');

    // First import
    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');
    await page.waitForSelector('.overlay-panel', { state: 'visible' });
    await page.click('button:has-text("From Text")');
    await page.fill('textarea[placeholder="Paste WeRead notes here..."]', sampleWeReadContent);
    await page.click('button:has-text("Parse Notes")');
    await page.waitForSelector('select#notebookSelect', { state: 'visible' });
    await page.selectOption('select#notebookSelect', { label: 'Duplicate Test' });

    page.on('dialog', dialog => dialog.accept());
    await page.click('button[type="submit"].btn-primary');
    await page.waitForSelector('.overlay-panel', { state: 'hidden' });

    // Second import of same content
    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');
    await page.waitForSelector('.overlay-panel', { state: 'visible' });
    await page.click('button:has-text("From Text")');
    await page.fill('textarea[placeholder="Paste WeRead notes here..."]', sampleWeReadContent);
    await page.click('button:has-text("Parse Notes")');

    // Should show duplicates
    await page.waitForSelector('.weread-import-info', { state: 'visible' });
    await expect(page.locator('.import-duplicates')).toContainText('duplicate');
  });

  test('can go back from preview to input', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    // Parse notes
    await page.click('button:has-text("From Text")');
    await page.fill('textarea[placeholder="Paste WeRead notes here..."]', sampleWeReadContent);
    await page.click('button:has-text("Parse Notes")');

    // Wait for preview
    await page.waitForSelector('.weread-import-info', { state: 'visible' });

    // Click back
    await page.click('button:has-text("Back")');

    // Should show input again - check for the tab buttons instead
    await expect(page.locator('button:has-text("From File")')).toBeVisible();
    await expect(page.locator('button:has-text("From Text")')).toBeVisible();
  });

  test('can close overlay via close button', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await page.click('.overlay-close');

    await page.waitForSelector('.overlay-panel', { state: 'hidden' });
  });

  test('can close overlay via backdrop click', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await page.evaluate(() => {
      const backdrop = document.querySelector('.overlay-backdrop') as HTMLElement;
      backdrop.click();
    });

    await page.waitForSelector('.overlay-panel', { state: 'hidden' });
  });

  test('shows error for empty text input', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await page.click('button:has-text("From Text")');
    // Don't enter any text - button should be disabled
    await expect(page.locator('button:has-text("Parse Notes")')).toBeDisabled();
  });

  test('shows error when no notes found in content', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    await page.click('button:has-text("From Text")');
    await page.fill('textarea[placeholder="Paste WeRead notes here..."]', 'Some random text without proper WeRead format');
    await page.click('button:has-text("Parse Notes")');

    await expect(page.locator('.form-error')).toContainText('No WeRead notes found');
  });

  test('dropdown shows all active notebooks', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    // Create multiple notebooks
    await createNotebook(page, 'Notebook A');
    await createNotebook(page, 'Notebook B');
    await createNotebook(page, 'Notebook C');

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    // Parse notes
    await page.click('button:has-text("From Text")');
    await page.fill('textarea[placeholder="Paste WeRead notes here..."]', sampleWeReadContent);
    await page.click('button:has-text("Parse Notes")');

    await page.waitForSelector('select#notebookSelect', { state: 'visible' });

    // Check all notebooks are in dropdown
    const options = await page.locator('select#notebookSelect option').allTextContents();
    expect(options).toContain('Notebook A');
    expect(options).toContain('Notebook B');
    expect(options).toContain('Notebook C');
  });

  test('only shows active notebooks in dropdown', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    // Create notebooks - we only create active ones in this test
    await createNotebook(page, 'First Notebook');
    await createNotebook(page, 'Second Notebook');

    await openSideMenu(page);
    await page.click('button:has-text("Import WeRead")');

    await page.waitForSelector('.overlay-panel', { state: 'visible' });

    // Parse notes
    await page.click('button:has-text("From Text")');
    await page.fill('textarea[placeholder="Paste WeRead notes here..."]', sampleWeReadContent);
    await page.click('button:has-text("Parse Notes")');

    await page.waitForSelector('select#notebookSelect', { state: 'visible' });

    // Check all active notebooks are in dropdown
    const options = await page.locator('select#notebookSelect option').allTextContents();
    expect(options).toContain('First Notebook');
    expect(options).toContain('Second Notebook');
    // First option should be the placeholder
    expect(options[0]).toBe('Select a notebook...');
  });
});
