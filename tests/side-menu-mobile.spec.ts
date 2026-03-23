import { test, expect } from '@playwright/test';

test.describe('Side Menu Mobile Visibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('side menu is fully visible within viewport on mobile', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    // Open side menu
    await page.click('.menu-trigger-btn');

    // Wait for the side menu to have the open class and be visible
    await page.waitForSelector('.side-menu.side-menu--open', { state: 'visible' });

    // Wait for CSS transition to complete (300ms)
    await page.waitForTimeout(400);

    // Check the actual computed style and class
    const sideMenuInfo = await page.evaluate(() => {
      const sideMenu = document.querySelector('.side-menu');
      if (!sideMenu) return null;
      const computedStyle = window.getComputedStyle(sideMenu);
      return {
        left: computedStyle.left,
        classList: Array.from(sideMenu.classList),
        hasOpenClass: sideMenu.classList.contains('side-menu--open')
      };
    });
    console.log('Side menu info:', sideMenuInfo);

    // Get viewport dimensions
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));

    // Get side menu bounding box
    const sideMenuBox = await page.locator('.side-menu').boundingBox();

    expect(sideMenuBox).not.toBeNull();
    if (sideMenuBox) {
      console.log('Viewport:', viewport);
      console.log('Side menu bounds:', sideMenuBox);

      // Verify side menu is within viewport (allow small tolerance for transition)
      expect(sideMenuBox.x).toBeGreaterThanOrEqual(-10);
      expect(sideMenuBox.y).toBeGreaterThanOrEqual(0);
      expect(sideMenuBox.width).toBeLessThanOrEqual(viewport.width + 10);
      expect(sideMenuBox.height).toBeLessThanOrEqual(viewport.height);

      console.log('✓ Side menu is within viewport bounds');
    }
  });

  test('all side menu items are visible and clickable on mobile', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    // Open side menu
    await page.click('.menu-trigger-btn');
    await page.waitForSelector('.side-menu.side-menu--open', { state: 'visible' });

    // Wait for CSS transition to complete (300ms)
    await page.waitForTimeout(400);

    // Get all menu items
    const menuItems = page.locator('.side-menu-item');
    const count = await menuItems.count();

    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} menu items`);

    // Check each menu item is visible
    for (let i = 0; i < count; i++) {
      const item = menuItems.nth(i);
      const box = await item.boundingBox();
      const text = await item.textContent();

      expect(box).not.toBeNull();
      if (box) {
        console.log(`Menu item ${i} (${text}):`, box);

        // Verify item is within side menu bounds (allow small tolerance)
        expect(box.x).toBeGreaterThanOrEqual(-10);
        expect(box.y).toBeGreaterThanOrEqual(0);

        // Verify item is visible (not outside viewport)
        const isVisible = await item.isVisible();
        expect(isVisible).toBe(true);

        console.log(`✓ Menu item "${text}" is visible`);
      }
    }
  });

  test('side menu content is scrollable if items exceed viewport', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    // Open side menu
    await page.click('.menu-trigger-btn');
    await page.waitForSelector('.side-menu--open', { state: 'visible' });

    // Get side menu content
    const sideMenuContent = page.locator('.side-menu-content');

    // Check if content is scrollable
    const scrollable = await sideMenuContent.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });

    console.log('Side menu content scrollable:', scrollable);

    // Get the last menu item
    const lastItem = page.locator('.side-menu-item').last();

    // Scroll to last item
    await lastItem.scrollIntoViewIfNeeded();

    // Verify last item is now visible
    const isVisible = await lastItem.isVisible();
    expect(isVisible).toBe(true);

    console.log('✓ Can scroll to last menu item');
  });

  test('clicking menu item works after scrolling into view', async ({ page }) => {
    await page.waitForSelector('.app-header', { state: 'visible' });

    // Open side menu
    await page.click('.menu-trigger-btn');
    await page.waitForSelector('.side-menu--open', { state: 'visible' });

    // Get the Trash Bin menu item (usually the second item)
    const trashBinItem = page.locator('.side-menu-item:has-text("🗑️ Trash Bin")');

    // Scroll into view and click
    await trashBinItem.scrollIntoViewIfNeeded();
    await trashBinItem.click();

    // Verify trash bin page opened
    await page.waitForSelector('.trash-page-content', { state: 'visible' });

    console.log('✓ Successfully clicked Trash Bin menu item after scrolling');
  });
});
