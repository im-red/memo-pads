import { test, expect } from '@playwright/test';
import { waitForIonicPage, clearStorage, openSideMenu, closeSideMenu } from './test-utils';

test.describe('Side Menu Mobile Visibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await page.reload();
    await waitForIonicPage(page);
  });

  test('side menu is fully visible within viewport on mobile', async ({ page }) => {
    await openSideMenu(page);

    const menu = page.locator('ion-menu');
    await page.waitForTimeout(400);

    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));

    const sideMenuBox = await menu.boundingBox();

    expect(sideMenuBox).not.toBeNull();
    if (sideMenuBox) {
      console.log('Viewport:', viewport);
      console.log('Side menu bounds:', sideMenuBox);

      expect(sideMenuBox.x).toBeGreaterThanOrEqual(-10);
      expect(sideMenuBox.y).toBeGreaterThanOrEqual(0);
      expect(sideMenuBox.width).toBeLessThanOrEqual(viewport.width + 10);
      expect(sideMenuBox.height).toBeLessThanOrEqual(viewport.height);

      console.log('✓ Side menu is within viewport bounds');
    }
  });

  test('all side menu items are visible and clickable on mobile', async ({ page }) => {
    await openSideMenu(page);
    await page.waitForTimeout(400);

    const menuItems = page.locator('ion-menu ion-item');
    const count = await menuItems.count();

    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} menu items`);

    for (let i = 0; i < count; i++) {
      const item = menuItems.nth(i);
      const box = await item.boundingBox();
      const text = await item.textContent();

      expect(box).not.toBeNull();
      if (box) {
        console.log(`Menu item ${i} (${text}):`, box);

        expect(box.x).toBeGreaterThanOrEqual(-10);
        expect(box.y).toBeGreaterThanOrEqual(0);

        const isVisible = await item.isVisible();
        expect(isVisible).toBe(true);

        console.log(`✓ Menu item "${text}" is visible`);
      }
    }
  });

  test('side menu content is scrollable if items exceed viewport', async ({ page }) => {
    await openSideMenu(page);

    const menuContent = page.locator('ion-menu ion-content');

    const scrollable = await menuContent.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });

    console.log('Side menu content scrollable:', scrollable);

    const lastItem = page.locator('ion-menu ion-item').last();

    await lastItem.scrollIntoViewIfNeeded();

    const isVisible = await lastItem.isVisible();
    expect(isVisible).toBe(true);

    console.log('✓ Can scroll to last menu item');
  });

  test('clicking menu item works after scrolling into view', async ({ page }) => {
    await openSideMenu(page);

    const trashBinItem = page.locator('ion-menu ion-item:has-text("Trash Bin")');

    await trashBinItem.scrollIntoViewIfNeeded();
    await trashBinItem.click();
    await page.waitForTimeout(500);

    await expect(page.locator('ion-title:has-text("Trash Bin")')).toBeVisible();

    console.log('✓ Successfully clicked Trash Bin menu item after scrolling');
  });
});
