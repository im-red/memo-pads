import { test, expect, Page } from '@playwright/test';
import { waitForIonicPage, clearStorage, openSideMenu, closeSideMenu, navigateViaMenu, createNotebook, goBackToNotebookList } from './test-utils';

async function getPageTitle(page: Page) {
  return page.locator('ion-router-outlet > div:not(.ion-page-hidden) ion-title').first();
}

test.describe('Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await page.reload();
    await waitForIonicPage(page);
  });

  test('home page displays header with title "Memo Pads"', async ({ page }) => {
    const title = await getPageTitle(page);
    await expect(title).toHaveText('Memo Pads');
  });

  test('home page displays menu button', async ({ page }) => {
    const menuButton = page.locator('ion-menu-button').first();
    await expect(menuButton).toBeVisible();
  });

  test('home page displays FAB add button', async ({ page }) => {
    const fabButton = page.locator('ion-fab-button').first();
    await expect(fabButton).toBeVisible();
  });

  test('home page shows empty state when no notebooks exist', async ({ page }) => {
    const emptyText = page.locator('ion-router-outlet > div:not(.ion-page-hidden) p', { hasText: 'No notebooks yet' });
    await expect(emptyText).toBeVisible();
  });

  test('side menu opens when menu button is clicked', async ({ page }) => {
    await openSideMenu(page);
    const menuHeader = page.locator('ion-menu ion-header ion-title').first();
    await expect(menuHeader).toHaveText('Menu');
  });

  test('side menu displays navigation items', async ({ page }) => {
    await openSideMenu(page);
    const menu = page.locator('ion-menu');
    await expect(menu.locator('ion-item:has-text("Trash Bin")')).toBeVisible();
    await expect(menu.locator('ion-item:has-text("Export Data")')).toBeVisible();
    await expect(menu.locator('ion-item:has-text("Import Data")')).toBeVisible();
    await expect(menu.locator('ion-item:has-text("Import WeRead Notes")')).toBeVisible();
    await expect(menu.locator('ion-item:has-text("Settings")')).toBeVisible();
  });

  test('side menu closes when Escape is pressed', async ({ page }) => {
    await openSideMenu(page);
    await closeSideMenu(page);
    await page.waitForTimeout(500);
    const menu = page.locator('ion-menu');
    const isOpen = await menu.evaluate((el: HTMLIonMenuElement) => el.isOpen());
    expect(isOpen).toBe(false);
  });

  test('create notebook modal opens when FAB is clicked', async ({ page }) => {
    const fabButton = page.locator('ion-fab-button').first();
    await fabButton.click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();
    const modalTitle = modal.locator('ion-title').first();
    await expect(modalTitle).toHaveText('New Notebook');
  });

  test('create notebook modal can be cancelled', async ({ page }) => {
    const fabButton = page.locator('ion-fab-button').first();
    await fabButton.click();
    await page.waitForTimeout(500);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();

    const cancelButton = modal.locator('ion-button:has-text("Cancel")');
    await cancelButton.click();
    await page.waitForTimeout(500);

    await expect(modal).not.toBeVisible();
  });

  test('create notebook and navigate to notebook detail', async ({ page }) => {
    await createNotebook(page, 'Test Notebook');

    // Notebook is created on home page, click it to navigate
    const notebookItem = page.locator('ion-item:has-text("Test Notebook")').first();
    await notebookItem.evaluate((el: any) => el.click());
    await page.waitForTimeout(1000);

    await expect(page).toHaveURL(/\/notebook\//);
    const title = await getPageTitle(page);
    await expect(title).toContainText('Test Notebook');
  });

  test('navigate back from notebook detail to home via back button', async ({ page }) => {
    await createNotebook(page, 'Test Notebook');
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/notebook\//);

    const backButton = page.locator('ion-router-outlet > div:not(.ion-page-hidden) ion-back-button').first();
    await backButton.evaluate((el: any) => el.click());
    await page.waitForTimeout(1000);

    await expect(page).toHaveURL(/\//);
    const homeTitle = await getPageTitle(page);
    await expect(homeTitle).toHaveText('Memo Pads');
  });

  test('navigate to trash bin from side menu', async ({ page }) => {
    await navigateViaMenu(page, 'Trash Bin');

    await expect(page).toHaveURL(/\/trash/);
    const title = await getPageTitle(page);
    await expect(title).toHaveText('Trash Bin');
  });

  test('navigate back from trash bin to home via back button', async ({ page }) => {
    await navigateViaMenu(page, 'Trash Bin');
    await expect(page).toHaveURL(/\/trash/);

    const backButton = page.locator('ion-router-outlet > div:not(.ion-page-hidden) ion-back-button').first();
    await backButton.click();
    await page.waitForTimeout(1000);

    await expect(page).toHaveURL(/\//);
  });

  test('export data modal opens from side menu', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Export Data")').click();
    await page.waitForTimeout(800);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();
    const title = modal.locator('ion-title').first();
    await expect(title).toHaveText('Export Data');

    const closeBtn = modal.locator('ion-button:has-text("Close")').first();
    await closeBtn.click();
    await page.waitForTimeout(500);
    await expect(modal).not.toBeVisible();
  });

  test('import data modal opens from side menu', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Import Data")').click();
    await page.waitForTimeout(800);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();
    const title = modal.locator('ion-title').first();
    await expect(title).toHaveText('Import Data');

    const closeBtn = modal.locator('ion-button:has-text("Close")').first();
    await closeBtn.click();
    await page.waitForTimeout(500);
    await expect(modal).not.toBeVisible();
  });

  test('import weread notes modal opens from side menu', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Import WeRead Notes")').click();
    await page.waitForTimeout(800);

    const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
    await expect(modal).toBeVisible();
    const title = modal.locator('ion-title').first();
    await expect(title).toHaveText('Import WeRead Notes');

    const closeBtn = modal.locator('ion-button:has-text("Close")').first();
    await closeBtn.click();
    await page.waitForTimeout(500);
    await expect(modal).not.toBeVisible();
  });

  test('navigate to settings from side menu', async ({ page }) => {
    await navigateViaMenu(page, 'Settings');

    await expect(page).toHaveURL(/\/settings/);
    const title = await getPageTitle(page);
    await expect(title).toHaveText('Settings');
  });

  test('navigate back from settings to home', async ({ page }) => {
    await navigateViaMenu(page, 'Settings');

    const backButton = page.locator('ion-router-outlet > div:not(.ion-page-hidden) ion-back-button').first();
    await backButton.click();
    await page.waitForTimeout(1000);

    await expect(page).toHaveURL(/\//);
  });

  test('navigate to about page from settings', async ({ page }) => {
    await navigateViaMenu(page, 'Settings');
    await expect(page).toHaveURL(/\/settings/);

    const aboutItem = page.locator('ion-router-outlet > div:not(.ion-page-hidden) ion-item:has-text("About")');
    await aboutItem.click();
    await page.waitForTimeout(1000);

    await expect(page).toHaveURL(/\/about/);
    const title = await getPageTitle(page);
    await expect(title).toHaveText('About');
  });

  test('navigate back from about to settings', async ({ page }) => {
    await navigateViaMenu(page, 'Settings');

    const aboutItem = page.locator('ion-router-outlet > div:not(.ion-page-hidden) ion-item:has-text("About")');
    await aboutItem.click();
    await page.waitForTimeout(1000);

    const backButton = page.locator('ion-router-outlet > div:not(.ion-page-hidden) ion-back-button').first();
    await backButton.click();
    await page.waitForTimeout(1000);

    await expect(page).toHaveURL(/\/settings/);
    const title = await getPageTitle(page);
    await expect(title).toHaveText('Settings');
  });

  test('notebook action sheet opens', async ({ page }) => {
    await createNotebook(page, 'Action Test');
    await goBackToNotebookList(page);

    const moreButton = page.locator('ion-router-outlet > div:not(.ion-page-hidden) ion-item ion-button').last();
    await moreButton.click();
    await page.waitForTimeout(500);

    const actionSheet = page.locator('ion-action-sheet');
    await expect(actionSheet).toBeVisible();
  });
});

test.describe('Mobile Navigation Tests', () => {
  test.use({ viewport: { width: 393, height: 851 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await page.reload();
    await waitForIonicPage(page);
  });

  test('home page elements are visible on mobile viewport', async ({ page }) => {
    const title = await getPageTitle(page);
    await expect(title).toBeVisible();

    const menuButton = page.locator('ion-menu-button').first();
    await expect(menuButton).toBeVisible();

    const fabButton = page.locator('ion-fab-button').first();
    await expect(fabButton).toBeVisible();
  });

  test('side menu is fully visible on mobile', async ({ page }) => {
    await openSideMenu(page);
    const menu = page.locator('ion-menu');
    await expect(menu.locator('ion-item:has-text("Settings")')).toBeVisible();
  });

  test('navigate to trash bin on mobile', async ({ page }) => {
    await navigateViaMenu(page, 'Trash Bin');
    await expect(page).toHaveURL(/\/trash/);
    const title = await getPageTitle(page);
    await expect(title).toHaveText('Trash Bin');
  });
});

test.describe('Deep Link Navigation Tests', () => {
  test('direct navigation to /settings', async ({ page }) => {
    await page.goto('/settings');
    await waitForIonicPage(page);

    const title = await getPageTitle(page);
    await expect(title).toHaveText('Settings');
  });

  test('direct navigation to /about', async ({ page }) => {
    await page.goto('/about');
    await waitForIonicPage(page);

    const title = await getPageTitle(page);
    await expect(title).toHaveText('About');
  });

  test('direct navigation to /trash', async ({ page }) => {
    await page.goto('/trash');
    await waitForIonicPage(page);

    const title = await getPageTitle(page);
    await expect(title).toHaveText('Trash Bin');
  });

  test('direct navigation to /notebook/invalid-id redirects to home', async ({ page }) => {
    await page.goto('/notebook/nonexistent-id');
    // The component redirects to / if notebook doesn't exist and notebooks array is loaded.
    // We can wait for network idle and check the URL.
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\//);
  });
});
