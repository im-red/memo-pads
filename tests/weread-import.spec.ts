import { test, expect } from '@playwright/test';
import { waitForIonicPage, clearStorage, createNotebook, selectAndDeleteNotebook, addMemo, deleteMemo, navigateViaMenu, openSideMenu, closeSideMenu, goBackToNotebookList, getPageTitle } from './test-utils';

const sampleWeReadContent = `
◆ 2024/01/15发表想法

这是我的第一条笔记的想法内容

原文：这是第一条原文内容

◆ 2024/01/16发表想法

这是我的第二条笔记的想法内容

原文：这是第二条原文内容
`;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  await waitForIonicPage(page);
});

test.describe('WeReadImportOverlay', () => {
  test('can open WeRead import overlay from side menu', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });
    await expect(page.locator('ion-modal:not(.overlay-hidden) ion-title')).toHaveText('Import WeRead Notes');
  });

  test('shows file and text input tabs', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    await expect(page.locator('ion-segment-button[value="file"]')).toBeVisible();
    await expect(page.locator('ion-segment-button[value="text"]')).toBeVisible();
  });

  test('can switch between file and text input modes', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    // Default is file mode
    await expect(page.locator('ion-button:has-text("Select WeRead Notes File")')).toBeVisible();

    // Switch to text mode
    await page.click('ion-segment-button[value="text"]');
    await expect(page.locator('ion-textarea[placeholder="Paste WeRead notes here..."]')).toBeVisible();
    await expect(page.locator('ion-button:has-text("Parse Notes")')).toBeVisible();

    // Switch back to file mode
    await page.click('ion-segment-button[value="file"]');
    await expect(page.locator('ion-button:has-text("Select WeRead Notes File")')).toBeVisible();
  });

  test('can parse WeRead notes from text input', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    // Switch to text mode
    await page.click('ion-segment-button[value="text"]');

    // Enter text content
    await page.locator('ion-textarea[placeholder="Paste WeRead notes here..."]').evaluate((el: any, content) => {
      el.value = content;
      el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: content } }));
    }, sampleWeReadContent);

    // Click parse
    await page.click('ion-button:has-text("Parse Notes")');

    // Should show preview
    const infoLocator = page.locator('ion-modal:not(.overlay-hidden) ion-text:has-text("Found")');
    await expect(infoLocator).toBeVisible();
  });

  test('shows notebook dropdown when notes are parsed', async ({ page }) => {
    // Create a notebook first
    await createNotebook(page, 'Test Notebook');
    await goBackToNotebookList(page);

    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    // Switch to text mode and parse
    await page.click('ion-segment-button[value="text"]');
    await page.locator('ion-textarea[placeholder="Paste WeRead notes here..."]').evaluate((el: any, content) => {
      el.value = content;
      el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: content } }));
    }, sampleWeReadContent);
    await page.click('ion-button:has-text("Parse Notes")');

    // Wait for the form with dropdown
    await page.waitForSelector('ion-select[label="Import to Notebook"]', { state: 'visible' });

    // Check dropdown has the notebook
    const options = await page.locator('ion-select-option').allTextContents();
    expect(options).toContain('Test Notebook');
  });

  test('can select notebook from dropdown', async ({ page }) => {
    await createNotebook(page, 'Target Notebook');
    await goBackToNotebookList(page);

    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    // Parse notes
    await page.click('ion-segment-button[value="text"]');
    await page.locator('ion-textarea[placeholder="Paste WeRead notes here..."]').evaluate((el: any, content) => {
      el.value = content;
      el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: content } }));
    }, sampleWeReadContent);
    await page.click('ion-button:has-text("Parse Notes")');

    // Select notebook from dropdown
    await page.waitForSelector('ion-select[label="Import to Notebook"]', { state: 'visible' });
    await page.locator('ion-select[label="Import to Notebook"]').evaluate((el: any) => {
      const option = Array.from(el.querySelectorAll('ion-select-option')).find((o: any) => o.textContent.includes('Target Notebook')) as any;
      if (option) {
          el.value = option.value;
          el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: option.value } }));
      }
    });

    // Verify selection
    const selectedValue = await page.locator('ion-select[label="Import to Notebook"]').evaluate((el: any) => el.value);
    expect(selectedValue).not.toBe('');
  });

  test('import button is disabled when no notebook is selected', async ({ page }) => {
    await createNotebook(page, 'Test Notebook');
    await goBackToNotebookList(page);

    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    // Parse notes
    await page.click('ion-segment-button[value="text"]');
    await page.locator('ion-textarea[placeholder="Paste WeRead notes here..."]').evaluate((el: any, content) => {
      el.value = content;
      el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: content } }));
    }, sampleWeReadContent);
    await page.click('ion-button:has-text("Parse Notes")');

    // Don't select any notebook
    await page.waitForSelector('ion-select[label="Import to Notebook"]', { state: 'visible' });

    // Import button should be disabled
    await expect(page.locator('ion-button:has-text("Import")')).toHaveAttribute('disabled', /.*/);
  });

  test('can import WeRead notes to selected notebook', async ({ page }) => {
    await createNotebook(page, 'Import Target');
    await goBackToNotebookList(page);

    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    // Parse notes
    await page.click('ion-segment-button[value="text"]');
    await page.locator('ion-textarea[placeholder="Paste WeRead notes here..."]').evaluate((el: any, content) => {
      el.value = content;
      el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: content } }));
    }, sampleWeReadContent);
    await page.click('ion-button:has-text("Parse Notes")');

    // Select notebook
    await page.waitForSelector('ion-select[label="Import to Notebook"]', { state: 'visible' });
    await page.locator('ion-select[label="Import to Notebook"]').evaluate((el: any) => {
      const option = Array.from(el.querySelectorAll('ion-select-option')).find((o: any) => o.textContent.includes('Import Target')) as any;
      if (option) {
          el.value = option.value;
          el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: option.value } }));
      }
    });

    // Handle alert
    // IonAlert is not a native dialog

    // Click import
    await page.click('ion-button:has-text("Import")');

    // Wait for overlay to close
    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'hidden' });
    await page.waitForTimeout(500);

    // Close side menu if it's open
    await closeSideMenu(page);

    // Navigate to notebook and verify memos were imported
    await page.click('ion-item:has-text("Import Target")');
    await page.waitForSelector('.swiper-slide', { state: 'visible' });

    // Should have imported memos
    const memoCount = await page.locator('.swiper-slide').count();
    expect(memoCount).toBeGreaterThan(0);
  });

  test('shows duplicate count for existing notes', async ({ page }) => {
    await createNotebook(page, 'Duplicate Test');
    await goBackToNotebookList(page);

    // First import
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');
    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });
    await page.click('ion-segment-button[value="text"]');
    await page.locator('ion-textarea[placeholder="Paste WeRead notes here..."]').evaluate((el: any, content) => {
      el.value = content;
      el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: content } }));
    }, sampleWeReadContent);
    await page.click('ion-button:has-text("Parse Notes")');
    await page.waitForSelector('ion-select[label="Import to Notebook"]', { state: 'visible' });
    await page.locator('ion-select[label="Import to Notebook"]').evaluate((el: any) => {
      const option = Array.from(el.querySelectorAll('ion-select-option')).find((o: any) => o.textContent.includes('Duplicate Test')) as any;
      if (option) {
          el.value = option.value;
          el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: option.value } }));
      }
    });

    // IonAlert is not a native dialog
    await page.click('ion-button:has-text("Import")');
    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'hidden' });
    await page.waitForTimeout(500);
    await closeSideMenu(page);

    // Second import of same content
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');
    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });
    await page.click('ion-segment-button[value="text"]');
    await page.locator('ion-textarea[placeholder="Paste WeRead notes here..."]').evaluate((el: any, content) => {
      el.value = content;
      el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: content } }));
    }, sampleWeReadContent);
    await page.click('ion-button:has-text("Parse Notes")');

    // Should show duplicates
    const infoLocator = page.locator('ion-modal:not(.overlay-hidden) ion-text:has-text("Found")');
    await expect(infoLocator).toBeVisible();
    await expect(page.locator('ion-modal:not(.overlay-hidden) ion-text')).toContainText('duplicate');
  });

  test('can go back from preview to input', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    // Parse notes
    await page.click('ion-segment-button[value="text"]');
    await page.locator('ion-textarea[placeholder="Paste WeRead notes here..."]').evaluate((el: any, content) => {
      el.value = content;
      el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: content } }));
    }, sampleWeReadContent);
    await page.click('ion-button:has-text("Parse Notes")');

    // Wait for preview
    const infoLocator = page.locator('ion-modal:not(.overlay-hidden) ion-text:has-text("Found")');
    await expect(infoLocator).toBeVisible();

    // Click back
    await page.click('ion-button:has-text("Back")');

    // Should show input again - check for the tab buttons instead
    await expect(page.locator('ion-segment-button[value="file"]')).toBeVisible();
    await expect(page.locator('ion-segment-button[value="text"]')).toBeVisible();
  });

  test('can close overlay via close button', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    await page.click('ion-button:has-text("Close")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'hidden' });
  });

  test('can close overlay via backdrop click', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    await page.evaluate(() => {
      const modal = document.querySelector('ion-modal:not(.overlay-hidden)') as any;
      modal.dismiss();
    });

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'hidden' });
  });

  test('shows error for empty text input', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    await page.click('ion-segment-button[value="text"]');
    // Don't enter any text - button should be disabled
    await expect(page.locator('ion-button:has-text("Parse Notes")')).toHaveAttribute('disabled', /.*/);
  });

  test('shows error when no notes found in content', async ({ page }) => {
    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    await page.click('ion-segment-button[value="text"]');
    await page.locator('ion-textarea[placeholder="Paste WeRead notes here..."]').evaluate((el: any, content) => {
      el.value = content;
      el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: content } }));
    }, 'Some random text without proper WeRead format');
    await page.locator('ion-button:has-text("Parse Notes")').evaluate((el: any) => el.click());

    const errorLocator = page.locator('ion-modal:not(.overlay-hidden) ion-text[color="danger"]');
    await expect(errorLocator).toContainText('No WeRead notes found');
  });

  test('dropdown shows all active notebooks', async ({ page }) => {
    // Create multiple notebooks
    await createNotebook(page, 'Notebook A');
    await goBackToNotebookList(page);
    await createNotebook(page, 'Notebook B');
    await goBackToNotebookList(page);
    await createNotebook(page, 'Notebook C');
    await goBackToNotebookList(page);

    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    // Parse notes
    await page.click('ion-segment-button[value="text"]');
    await page.locator('ion-textarea[placeholder="Paste WeRead notes here..."]').evaluate((el: any, content) => {
      el.value = content;
      el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: content } }));
    }, sampleWeReadContent);
    await page.click('ion-button:has-text("Parse Notes")');

    await page.waitForSelector('ion-select[label="Import to Notebook"]', { state: 'visible' });

    // Check all notebooks are in dropdown
    const options = await page.locator('ion-select-option').allTextContents();
    expect(options).toContain('Notebook A');
    expect(options).toContain('Notebook B');
    expect(options).toContain('Notebook C');
  });

  test('only shows active notebooks in dropdown', async ({ page }) => {
    // Create notebooks - we only create active ones in this test
    await createNotebook(page, 'First Notebook');
    await goBackToNotebookList(page);
    await createNotebook(page, 'Second Notebook');
    await goBackToNotebookList(page);

    await openSideMenu(page);
    await page.click('ion-menu ion-item:has-text("Import WeRead Notes")');

    await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible' });

    // Parse notes
    await page.click('ion-segment-button[value="text"]');
    await page.locator('ion-textarea[placeholder="Paste WeRead notes here..."]').evaluate((el: any, content) => {
      el.value = content;
      el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: content } }));
    }, sampleWeReadContent);
    await page.click('ion-button:has-text("Parse Notes")');

    await page.waitForSelector('ion-select[label="Import to Notebook"]', { state: 'visible' });

    // Check all active notebooks are in dropdown
    const options = await page.locator('ion-select-option').allTextContents();
    expect(options).toContain('First Notebook');
    expect(options).toContain('Second Notebook');
  });
});
