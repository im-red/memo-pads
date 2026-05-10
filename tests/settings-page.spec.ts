import { test, expect } from '@playwright/test';
import { waitForIonicPage, clearStorage, openSideMenu, closeSideMenu, getPageTitle } from './test-utils';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await page.reload();
    await waitForIonicPage(page);
  });

  test.describe('Side Menu Entry', () => {
    test('side menu should have settings menu item', async ({ page }) => {
      await openSideMenu(page);
      await expect(page.locator('ion-menu ion-item:has-text("Settings")')).toBeVisible();
    });

    test('clicking settings should navigate to SettingsPage', async ({ page }) => {
      await openSideMenu(page);
      await page.locator('ion-menu ion-item:has-text("Settings")').click();
      await page.waitForTimeout(500);

      const title = await getPageTitle(page);
      await expect(title).toHaveText('Settings');
    });

    test('side menu should close after clicking settings', async ({ page }) => {
      await openSideMenu(page);
      await page.locator('ion-menu ion-item:has-text("Settings")').click();
      await page.waitForTimeout(500);

      const menu = page.locator('ion-menu');
      const isOpen = await menu.evaluate((el: HTMLIonMenuElement) => el.isOpen());
      expect(isOpen).toBe(false);
    });
  });

  test.describe('Settings Page Items', () => {
    test.beforeEach(async ({ page }) => {
      await openSideMenu(page);
      await page.locator('ion-menu ion-item:has-text("Settings")').click();
      await page.waitForTimeout(500);
    });

    test('should display about item', async ({ page }) => {
      await expect(page.locator('ion-item:has-text("About")')).toBeVisible();
    });

    test('all settings items should have the same height', async ({ page }) => {
      const items = page.locator('ion-item');
      const count = await items.count();
      expect(count).toBeGreaterThanOrEqual(1);

      const heights: number[] = [];
      for (let i = 0; i < count; i++) {
        const box = await items.nth(i).boundingBox();
        if (box) {
          heights.push(box.height);
        }
      }

      if (heights.length > 1) {
        const firstHeight = heights[0];
        for (const h of heights) {
          expect(h).toBeCloseTo(firstHeight, 0);
        }
      }
    });
  });

  test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await openSideMenu(page);
      await page.locator('ion-menu ion-item:has-text("Settings")').click();
      await page.waitForTimeout(500);
    });

    test('clicking about should navigate to AboutPage', async ({ page }) => {
      await page.locator('ion-item:has-text("About")').click();
      await page.waitForTimeout(500);

      const title = await getPageTitle(page);
      await expect(title).toHaveText('About');
    });

    test('back button should return to home from settings', async ({ page }) => {
      const backButton = page.locator('ion-back-button');
      await backButton.click();
      await page.waitForTimeout(500);

      const title = await getPageTitle(page);
      await expect(title).toHaveText('Memo Pads');
    });

    test('back button from about should return to settings', async ({ page }) => {
      await page.locator('ion-item:has-text("About")').click();
      await page.waitForTimeout(500);

      const backButton = page.locator('ion-toolbar:has-text("About") ion-back-button');
      await backButton.click();
      await page.waitForTimeout(500);

      const title = await getPageTitle(page);
      await expect(title).toHaveText('Settings');
    });
  });
});

test.describe('Settings Page - Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await page.reload();
    await waitForIonicPage(page);
  });

  test('settings page should be visible on mobile', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Settings")').click();
    await page.waitForTimeout(500);

    const title = await getPageTitle(page);
    await expect(title).toHaveText('Settings');
  });

  test('all settings items should have the same height on mobile', async ({ page }) => {
    await openSideMenu(page);
    await page.locator('ion-menu ion-item:has-text("Settings")').click();
    await page.waitForTimeout(500);

    const items = page.locator('ion-item');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const heights: number[] = [];
    for (let i = 0; i < count; i++) {
      const box = await items.nth(i).boundingBox();
      if (box) {
        heights.push(box.height);
      }
    }

    if (heights.length > 1) {
      const firstHeight = heights[0];
      for (const h of heights) {
        expect(h).toBeCloseTo(firstHeight, 0);
      }
    }
  });
});
