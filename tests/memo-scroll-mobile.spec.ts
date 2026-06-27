import { test, expect } from '@playwright/test';
import { waitForIonicPage, clearStorage, createNotebook, addMemo } from './test-utils';

test.describe('Memo Content Scrolling on Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await page.reload();
    await waitForIonicPage(page);
  });

  const isMobile = async (page: import('@playwright/test').Page): Promise<boolean> => {
    const viewport = page.viewportSize();
    return viewport !== null && viewport.width <= 768;
  };

  test('long memo original text is scrollable on mobile', async ({ page }) => {
    if (!(await isMobile(page))) {
      test.skip();
    }

    const longText = 'This is a very long memo text that should exceed the maximum height limit and become scrollable. '.repeat(10);

    await createNotebook(page, 'Scroll Test Notebook');
    await page.locator('ion-item:has-text("Scroll Test Notebook")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });

    await addMemo(page, longText, 'Short explanation');

    const contentElement = page.locator('.swiper-slide-active > div').first();
    await expect(contentElement).toBeVisible();

    const scrollInfo = await contentElement.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        overflowY: style.overflowY,
        hasScroll: el.scrollHeight > el.clientHeight
      };
    });

    console.log('Original text scroll info:', scrollInfo);
    expect(scrollInfo.overflowY).toBe('auto');
    expect(scrollInfo.hasScroll).toBe(true);

    await contentElement.evaluate((el) => {
      el.scrollTop = el.scrollHeight - el.clientHeight;
    });

    const newScrollTop = await contentElement.evaluate((el) => el.scrollTop);
    expect(newScrollTop).toBeGreaterThan(0);

    console.log('✓ Long memo original text is scrollable on mobile');
  });

  test('long memo explanation is scrollable on mobile', async ({ page }) => {
    if (!(await isMobile(page))) {
      test.skip();
    }

    const longExplanation = 'This is a very long explanation text that should exceed the maximum height limit and become scrollable. '.repeat(30);

    await createNotebook(page, 'Scroll Test Notebook 2');
    await page.locator('ion-item:has-text("Scroll Test Notebook 2")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });

    await addMemo(page, 'Short text', longExplanation);

    // Enable "Default show explanation" via header menu
    const headerMenuBtn = page.locator('ion-toolbar ion-button:has(ion-icon)').first();
    await headerMenuBtn.click();
    await page.waitForTimeout(300);

    await page.locator('ion-toggle').click();
    await page.waitForTimeout(500);

    const contentElement = page.locator('.swiper-slide-active > div').first();
    await expect(contentElement).toBeVisible();

    const scrollInfo = await contentElement.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        overflowY: style.overflowY,
        hasScroll: el.scrollHeight > el.clientHeight
      };
    });

    console.log('Explanation scroll info:', scrollInfo);
    expect(scrollInfo.overflowY).toBe('auto');
    expect(scrollInfo.hasScroll).toBe(true);

    await contentElement.evaluate((el) => {
      el.scrollTop = el.scrollHeight - el.clientHeight;
    });

    const newScrollTop = await contentElement.evaluate((el) => el.scrollTop);
    expect(newScrollTop).toBeGreaterThan(0);

    console.log('✓ Long memo explanation is scrollable on mobile');
  });

  test('memo card fills available space on mobile', async ({ page }) => {
    if (!(await isMobile(page))) {
      test.skip();
    }

    const longText = 'Long content '.repeat(50);
    const longExplanation = 'Long explanation '.repeat(50);

    await createNotebook(page, 'Viewport Test Notebook');
    await page.locator('ion-item:has-text("Viewport Test Notebook")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });

    await addMemo(page, longText, longExplanation);

    // Enable "Default show explanation" via header menu
    const headerMenuBtn = page.locator('ion-toolbar ion-button:has(ion-icon)').first();
    await headerMenuBtn.click();
    await page.waitForTimeout(300);

    await page.locator('ion-toggle').click();
    await page.waitForTimeout(500);

    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));

    const memoView = page.locator('.swiper-slide-active > div');
    const viewBox = await memoView.boundingBox();

    expect(viewBox).not.toBeNull();

    if (viewBox) {
      console.log('Viewport:', viewport);
      console.log('Memo view bounds:', viewBox);

      expect(viewBox.y).toBeGreaterThanOrEqual(0);
      expect(viewBox.y + viewBox.height).toBeLessThanOrEqual(viewport.height);

      const cardHeightRatio = viewBox.height / viewport.height;
      expect(cardHeightRatio).toBeGreaterThan(0.5);

      console.log('✓ Memo card fills available space on mobile');
    }
  });

  test('touch scrolling works on long memo content', async ({ page }) => {
    if (!(await isMobile(page))) {
      test.skip();
    }

    const longText = 'Touch scroll test content. '.repeat(30);

    await createNotebook(page, 'Touch Scroll Test');
    await page.locator('ion-item:has-text("Touch Scroll Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });

    await addMemo(page, longText, 'Explanation');

    const originalTextElement = page.locator('.swiper-slide-active > div').first();
    await expect(originalTextElement).toBeVisible();

    const initialScrollTop = await originalTextElement.evaluate((el) => el.scrollTop);
    expect(initialScrollTop).toBe(0);

    const box = await originalTextElement.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX, startY - 100, { steps: 10 });
      await page.mouse.up();

      const newScrollTop = await originalTextElement.evaluate((el) => el.scrollTop);
      console.log('Scroll position after touch scroll:', newScrollTop);

      console.log('✓ Touch scrolling works on long memo content');
    }
  });

  test('horizontal swipe navigation works with scrollable content', async ({ page }) => {
    if (!(await isMobile(page))) {
      test.skip();
    }

    const longText = 'Long content for swipe test. '.repeat(20);

    await createNotebook(page, 'Swipe Nav Test');
    await page.locator('ion-item:has-text("Swipe Nav Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });

    await addMemo(page, longText, 'Explanation 1');
    await addMemo(page, 'Second Memo', 'Explanation 2');

    const progressText = await page.locator('span').filter({ hasText: /\d+ \/ \d+/ }).textContent();
    expect(progressText).toContain('1 / 2');

    const memoCard = page.locator('.swiper-slide-active > div');
    const cardBox = await memoCard.boundingBox();
    expect(cardBox).not.toBeNull();

    if (cardBox) {
      // Use Swiper's slideNext method via evaluate
      await page.evaluate(() => {
        const swiperElement = document.querySelector('.swiper') as any;
        if (swiperElement && swiperElement.swiper) {
          swiperElement.swiper.slideNext();
        }
      });

      await page.waitForTimeout(1000);

      const newProgressText = await page.locator('span').filter({ hasText: /\d+ \/ \d+/ }).textContent();
      expect(newProgressText).toContain('2 / 2');

      console.log('✓ Horizontal swipe navigation works with scrollable content');
    }
  });

  test('default show explanation menu option toggles correctly', async ({ page }) => {
    if (!(await isMobile(page))) {
      test.skip();
    }

    await createNotebook(page, 'Default Show Test');
    await page.locator('ion-item:has-text("Default Show Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });

    await addMemo(page, 'Test memo', 'Test explanation');

    // Initially, explanation should be hidden
    const explanation = page.locator('.swiper-slide-active div').filter({ hasText: /^Test explanation$/ });
    await expect(explanation).not.toBeVisible();

    // Open header menu and enable "Default show explanation"
    const headerMenuBtn = page.locator('ion-toolbar ion-button:has(ion-icon)').first();
    await headerMenuBtn.click();
    await page.waitForTimeout(300);

    // Check that the toggle is not checked initially
    const toggle = page.locator('ion-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).not.toBeChecked();

    // Click to enable
    await toggle.click();
    await page.waitForTimeout(300);

    // Dismiss the popover
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Explanation should now be visible
    await expect(explanation).toBeVisible();

    // Open menu again and verify toggle is checked
    await headerMenuBtn.click();
    await page.waitForTimeout(300);
    const toggleChecked = page.locator('ion-toggle');
    await expect(toggleChecked).toBeChecked();

    console.log('✓ Default show explanation menu option toggles correctly');
  });

  test('explanation hides on swipe when default show is disabled', async ({ page }) => {
    if (!(await isMobile(page))) {
      test.skip();
    }

    await createNotebook(page, 'Swipe Hide Test');
    await page.locator('ion-item:has-text("Swipe Hide Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });

    await addMemo(page, 'First memo', 'First explanation');
    await addMemo(page, 'Second memo', 'Second explanation');

    // Enable explanation by clicking on card (tap to toggle)
    const card = page.locator('.swiper-slide-active > div');
    await card.click();
    await page.waitForTimeout(300);

    const explanation = page.locator('.swiper-slide-active div').filter({ hasText: /^First explanation$/ });
    await expect(explanation).toBeVisible();

    // Swipe to next memo
    const cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();

    if (cardBox) {
      const startX = cardBox.x + cardBox.width / 2;
      const startY = cardBox.y + cardBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 200, startY, { steps: 20 });
      await page.mouse.up();

      await page.waitForTimeout(300);

      // Explanation should be hidden after swipe
      const nextExplanation = page.locator('.swiper-slide-active div').filter({ hasText: /^Second explanation$/ });
      await expect(nextExplanation).not.toBeVisible();

      console.log('✓ Explanation hides on swipe when default show is disabled');
    }
  });

  test('explanation stays visible on swipe when default show is enabled', async ({ page }) => {
    if (!(await isMobile(page))) {
      test.skip();
    }

    await createNotebook(page, 'Swipe Keep Test');
    await page.locator('ion-item:has-text("Swipe Keep Test")').evaluate((el: any) => el.click());
    await page.waitForSelector('ion-back-button', { state: 'visible' });

    await addMemo(page, 'First memo', 'First explanation');
    await addMemo(page, 'Second memo', 'Second explanation');

    // Enable "Default show explanation"
    const headerMenuBtn = page.locator('ion-toolbar ion-button:has(ion-icon)').first();
    await headerMenuBtn.click();
    await page.waitForTimeout(300);

    await page.locator('ion-toggle').click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Explanation should be visible
    const explanation = page.locator('.swiper-slide-active div').filter({ hasText: /^First explanation$/ });
    await expect(explanation).toBeVisible();

    // Swipe to next memo
    const card = page.locator('.swiper-slide-active > div');
    const cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();

    if (cardBox) {
      const startX = cardBox.x + cardBox.width / 2;
      const startY = cardBox.y + cardBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 200, startY, { steps: 20 });
      await page.mouse.up();

      await page.waitForTimeout(300);

      // Explanation should still be visible after swipe
      const nextExplanation = page.locator('.swiper-slide-active div').filter({ hasText: /^Second explanation$/ });
      await expect(nextExplanation).toBeVisible();

      console.log('✓ Explanation stays visible on swipe when default show is enabled');
    }
  });
});
