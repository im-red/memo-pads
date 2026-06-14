import { test } from '@playwright/test';
import path from 'path';
import { waitForIonicPage } from './test-utils';

test.describe('Capture Screenshots for README', () => {
    test.skip();

    test('capture notebooks list', async ({ page }) => {
        await page.goto('/');

        // Add some mock notebooks
        await page.evaluate(() => {
            const notebooks = [
                { id: '1', name: 'English Vocabulary', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isDeleted: false, importOrder: 0 },
                { id: '2', name: 'Programming Concepts', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isDeleted: false, importOrder: 1 },
                { id: '3', name: 'Reading Notes', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isDeleted: false, importOrder: 2 }
            ];
            localStorage.setItem('memo-pads:notebooks', JSON.stringify(notebooks));

            const memos = [
                { id: '1', notebookId: '1', originalText: 'Ephemeral', explanation: 'lasting for a very short time.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isDeleted: false, importOrder: 0 },
                { id: '2', notebookId: '1', originalText: 'Serendipity', explanation: 'the occurrence and development of events by chance in a happy or beneficial way.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isDeleted: false, importOrder: 1 },
                { id: '3', notebookId: '2', originalText: 'Closure', explanation: 'A closure is the combination of a function bundled together with references to its surrounding state.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isDeleted: false, importOrder: 0 }
            ];
            localStorage.setItem('memo-pads:memos', JSON.stringify(memos));
        });

        await page.reload();
        await waitForIonicPage(page);
        await page.waitForSelector('ion-item:has-text("English Vocabulary")');
        await page.waitForTimeout(500); // Wait for rendering

        await page.screenshot({
            path: path.join('docs', 'screenshots', 'notebooks-list.png'),
            fullPage: false
        });
    });

    test('capture side menu', async ({ page }) => {
        await page.goto('/');
        await waitForIonicPage(page);

        // Click the menu button
        await page.click('ion-menu-button');
        await page.waitForTimeout(500); // Wait for animation

        await page.screenshot({
            path: path.join('docs', 'screenshots', 'side-menu.png'),
            fullPage: false
        });
    });

    test('capture memo reading view', async ({ page }) => {
        await page.goto('/');

        // Add some mock data and set a progress state
        await page.evaluate(() => {
            const notebooks = [
                { id: '1', name: 'English Vocabulary', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isDeleted: false, importOrder: 0 }
            ];
            localStorage.setItem('memo-pads:notebooks', JSON.stringify(notebooks));

            const memos = [
                { id: '1', notebookId: '1', originalText: 'Serendipity', explanation: 'the occurrence and development of events by chance in a happy or beneficial way.\n\nExample:\nThey found each other by pure serendipity.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isDeleted: false, importOrder: 1 }
            ];
            localStorage.setItem('memo-pads:memos', JSON.stringify(memos));

            localStorage.setItem('memo-pads:progress', JSON.stringify({
                '1': { currentMemoId: '1', showExplanation: true, alwaysShowExplanation: false }
            }));
        });

        await page.reload();
        await waitForIonicPage(page);
        await page.waitForTimeout(500); // Wait for rendering

        // Click into the notebook
        await page.locator('ion-item:has-text("English Vocabulary")').evaluate((el: any) => el.click());
        await page.waitForSelector('ion-back-button');

        // Ensure explanation is visible
        const explLocator = page.locator('.swiper-slide-active > div > div').filter({ hasText: 'the occurrence and development' });
        if (await explLocator.isHidden().catch(() => true)) {
            await page.locator('.swiper-slide-active > div').first().click();
        }

        await page.waitForTimeout(500); // Wait for transition

        await page.screenshot({
            path: path.join('docs', 'screenshots', 'memo-reading.png'),
            fullPage: false
        });
    });

    test('capture settings page', async ({ page }) => {
        await page.goto('/');
        await waitForIonicPage(page);

        // Click menu, then Settings
        await page.click('ion-menu-button');
        await page.waitForTimeout(500); // Wait for animation
        await page.locator('ion-menu ion-item:has-text("Settings")').evaluate((el: any) => el.click());

        await page.waitForSelector('ion-item:has-text("About")');
        await page.waitForTimeout(500); // Wait for transition

        await page.screenshot({
            path: path.join('docs', 'screenshots', 'settings-page.png'),
            fullPage: false
        });
    });
});
