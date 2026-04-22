import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test.describe('Side Menu Entry', () => {
        test('side menu should have settings menu item', async ({ page }) => {
            await page.click('.menu-trigger-btn');
            await page.waitForSelector('.side-menu--open');
            await expect(page.locator('.side-menu-item:has-text("Settings")')).toBeVisible();
        });

        test('clicking settings should navigate to SettingsPage', async ({ page }) => {
            await page.click('.menu-trigger-btn');
            await page.waitForSelector('.side-menu--open');
            await page.click('.side-menu-item:has-text("Settings")');
            await expect(page.locator('.settings-container')).toBeVisible();
            await expect(page.locator('.settings-container .app-header h1')).toHaveText('Settings');
        });

        test('side menu should close after clicking settings', async ({ page }) => {
            await page.click('.menu-trigger-btn');
            await page.waitForSelector('.side-menu--open');
            await page.click('.side-menu-item:has-text("Settings")');
            await expect(page.locator('.side-menu--open')).not.toBeVisible();
        });
    });

    test.describe('Geometry and Styling', () => {
        test('settings container should have proper height and flex layout', async ({ page }) => {
            await page.click('.menu-trigger-btn');
            await page.waitForSelector('.side-menu--open');
            await page.click('.side-menu-item:has-text("Settings")');
            await page.waitForSelector('.settings-container');

            // container should have display: flex and flex-direction: column
            const containerStyle = await page.evaluate(() => {
                const el = document.querySelector('.settings-container');
                if (!el) return null;
                const style = window.getComputedStyle(el);
                return {
                    display: style.display,
                    flexDirection: style.flexDirection,
                    height: style.height,
                    flexGrow: style.flexGrow,
                    width: style.width
                };
            });
            
            expect(containerStyle?.display).toBe('flex');
            expect(containerStyle?.flexDirection).toBe('column');
            expect(containerStyle?.flexGrow).toBe('1');
        });

        test('settings items should have proper padding, gap, and rounded corners', async ({ page }) => {
            await page.click('.menu-trigger-btn');
            await page.waitForSelector('.side-menu--open');
            await page.click('.side-menu-item:has-text("Settings")');
            await page.waitForSelector('.settings-item');

            const itemStyle = await page.evaluate(() => {
                const el = document.querySelector('.settings-item');
                if (!el) return null;
                const style = window.getComputedStyle(el);
                return {
                    display: style.display,
                    alignItems: style.alignItems,
                    padding: style.padding,
                    borderRadius: style.borderRadius,
                    minHeight: style.minHeight,
                    background: style.backgroundColor
                };
            });

            expect(itemStyle?.display).toBe('flex');
            expect(itemStyle?.alignItems).toBe('center');
            // Ensure padding and border radius are set (meaning CSS loaded)
            expect(itemStyle?.padding).not.toBe('0px');
            expect(itemStyle?.borderRadius).not.toBe('0px');
            expect(itemStyle?.minHeight).toBe('48px');
            expect(itemStyle?.background).not.toBe('rgba(0, 0, 0, 0)');
        });
    });

    test.describe('Settings Page Items', () => {
        test('should display check update item', async ({ page }) => {
            await page.click('.menu-trigger-btn');
            await page.waitForSelector('.side-menu--open');
            await page.click('.side-menu-item:has-text("Settings")');
            await expect(page.locator('.settings-item:has-text("Check for Updates")')).toBeVisible();
        });

        test('should display about item', async ({ page }) => {
            await page.click('.menu-trigger-btn');
            await page.waitForSelector('.side-menu--open');
            await page.click('.side-menu-item:has-text("Settings")');
            await expect(page.locator('.settings-item:has-text("About")')).toBeVisible();
        });

        test('all settings items should have the same height', async ({ page }) => {
            await page.click('.menu-trigger-btn');
            await page.waitForSelector('.side-menu--open');
            await page.click('.side-menu-item:has-text("Settings")');
            await page.waitForSelector('.settings-item');

            const items = page.locator('.settings-item');
            const count = await items.count();
            expect(count).toBeGreaterThanOrEqual(2);

            const heights: number[] = [];
            for (let i = 0; i < count; i++) {
                const box = await items.nth(i).boundingBox();
                if (box) {
                    heights.push(box.height);
                }
            }

            // All items should have the same height
            const firstHeight = heights[0];
            for (const h of heights) {
                expect(h).toBeCloseTo(firstHeight, 0);
            }
        });

        test('settings item text should be vertically centered', async ({ page }) => {
            await page.click('.menu-trigger-btn');
            await page.waitForSelector('.side-menu--open');
            await page.click('.side-menu-item:has-text("Settings")');
            await page.waitForSelector('.settings-item');

            const items = page.locator('.settings-item');
            const count = await items.count();

            for (let i = 0; i < count; i++) {
                const itemBox = await items.nth(i).boundingBox();
                const contentBox = await items.nth(i).locator('.settings-item-content').boundingBox();

                if (itemBox && contentBox) {
                    const itemCenterY = itemBox.y + itemBox.height / 2;
                    const contentCenterY = contentBox.y + contentBox.height / 2;
                    // Content center should be close to item center (within 2px tolerance)
                    expect(Math.abs(itemCenterY - contentCenterY)).toBeLessThan(2);
                }
            }
        });
    });

    test.describe('Check Update Modal', () => {
        test('update modal title and text should be horizontally centered', async ({ page }) => {
            await page.click('.menu-trigger-btn');
            await page.waitForSelector('.side-menu--open');
            await page.click('.side-menu-item:has-text("Settings")');
            await page.waitForSelector('.settings-item');
            await page.click('.settings-item:has-text("Check for Updates")');

            // Wait for the modal to appear (could be checking state or result)
            await page.waitForSelector('.update-modal-body', { timeout: 15000 });

            const modalBody = page.locator('.update-modal-body');
            const bodyBox = await modalBody.boundingBox();

            // Check title centering
            const title = page.locator('.update-modal-title');
            const titleBox = await title.boundingBox();

            if (bodyBox && titleBox) {
                const bodyCenterX = bodyBox.x + bodyBox.width / 2;
                const titleCenterX = titleBox.x + titleBox.width / 2;
                // Title center should align with body center (within 2px tolerance)
                expect(Math.abs(bodyCenterX - titleCenterX)).toBeLessThan(2);
            }

            // Check text centering
            const text = page.locator('.update-modal-text');
            const textBox = await text.boundingBox();

            if (bodyBox && textBox) {
                const bodyCenterX = bodyBox.x + bodyBox.width / 2;
                const textCenterX = textBox.x + textBox.width / 2;
                // Text center should align with body center (within 2px tolerance)
                expect(Math.abs(bodyCenterX - textCenterX)).toBeLessThan(2);
            }
        });
    });

    test.describe('Navigation', () => {
        test('clicking about should navigate to AboutPage', async ({ page }) => {
            await page.click('.menu-trigger-btn');
            await page.waitForSelector('.side-menu--open');
            await page.click('.side-menu-item:has-text("Settings")');
            await page.click('.settings-item:has-text("About")');
            await expect(page.locator('.about-app-info')).toBeVisible();
            await expect(page.locator('.about-container .app-header h1')).toHaveText('About');
        });

        test('back button should return to home from settings', async ({ page }) => {
            await page.click('.menu-trigger-btn');
            await page.waitForSelector('.side-menu--open');
            await page.click('.side-menu-item:has-text("Settings")');
            await page.click('.back-btn');
            await expect(page.locator('.container')).toBeVisible();
        });

        test('back button from about should return to settings', async ({ page }) => {
            await page.click('.menu-trigger-btn');
            await page.waitForSelector('.side-menu--open');
            await page.click('.side-menu-item:has-text("Settings")');
            await page.click('.settings-item:has-text("About")');
            await expect(page.locator('.about-container')).toBeVisible();
            await page.click('.back-btn');
            await expect(page.locator('.settings-container .app-header h1')).toHaveText('Settings');
        });
    });
});

test.describe('Settings Page - Mobile Viewport', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('settings page should be visible on mobile', async ({ page }) => {
        await page.click('.menu-trigger-btn');
        await page.waitForSelector('.side-menu--open');
        await page.click('.side-menu-item:has-text("Settings")');
        await expect(page.locator('.settings-container')).toBeVisible();
    });

    test('all settings items should have the same height on mobile', async ({ page }) => {
        await page.click('.menu-trigger-btn');
        await page.waitForSelector('.side-menu--open');
        await page.click('.side-menu-item:has-text("Settings")');
        await page.waitForSelector('.settings-item');

        const items = page.locator('.settings-item');
        const count = await items.count();
        expect(count).toBeGreaterThanOrEqual(2);

        const heights: number[] = [];
        for (let i = 0; i < count; i++) {
            const box = await items.nth(i).boundingBox();
            if (box) {
                heights.push(box.height);
            }
        }

        const firstHeight = heights[0];
        for (const h of heights) {
            expect(h).toBeCloseTo(firstHeight, 0);
        }
    });

    test('settings item text should be vertically centered on mobile', async ({ page }) => {
        await page.click('.menu-trigger-btn');
        await page.waitForSelector('.side-menu--open');
        await page.click('.side-menu-item:has-text("Settings")');
        await page.waitForSelector('.settings-item');

        const items = page.locator('.settings-item');
        const count = await items.count();

        for (let i = 0; i < count; i++) {
            const itemBox = await items.nth(i).boundingBox();
            const contentBox = await items.nth(i).locator('.settings-item-content').boundingBox();

            if (itemBox && contentBox) {
                const itemCenterY = itemBox.y + itemBox.height / 2;
                const contentCenterY = contentBox.y + contentBox.height / 2;
                expect(Math.abs(itemCenterY - contentCenterY)).toBeLessThan(2);
            }
        }
    });
});
