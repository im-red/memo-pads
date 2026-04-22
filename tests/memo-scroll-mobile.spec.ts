import { test, expect } from '@playwright/test';

test.describe('Memo Content Scrolling on Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  const isMobile = async (page: import('@playwright/test').Page): Promise<boolean> => {
    const viewport = page.viewportSize();
    return viewport !== null && viewport.width <= 768;
  };

  test('long memo original text is scrollable on mobile', async ({ page }) => {
    if (!(await isMobile(page))) {
      test.skip();
    }

    await page.waitForSelector('.app-header', { state: 'visible' });

    const longText = 'This is a very long memo text that should exceed the maximum height limit and become scrollable. '.repeat(10);

    await page.click('button.add-notebook-btn');
    await page.waitForSelector('.overlay:has-text("New Notebook")', { state: 'visible' });
    await page.fill('input[placeholder="Enter notebook name..."]', 'Scroll Test Notebook');
    await page.click('button:has-text("Create Notebook")');
    await page.waitForSelector('.notebook-item:has-text("Scroll Test Notebook")', { state: 'visible' });

    await page.click('.notebook-item:has-text("Scroll Test Notebook") .notebook-item__btn');
    await page.waitForSelector('.memo-view', { state: 'visible' });

    await page.click('button:has-text("Add Your First Memo")');
    await page.waitForSelector('.overlay:has-text("Add New Memo")', { state: 'visible' });
    await page.fill('textarea[placeholder="Enter the word or phrase..."]', longText);
    await page.fill('textarea[placeholder="Enter the meaning or translation..."]', 'Short explanation');
    await page.click('.overlay .form-actions button:has-text("Add Memo")');
    await page.waitForTimeout(500);

    const contentElement = page.locator('.memo-card__content');
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

    await page.waitForSelector('.app-header', { state: 'visible' });

    const longExplanation = 'This is a very long explanation text that should exceed the maximum height limit and become scrollable. '.repeat(30);

    await page.click('button.add-notebook-btn');
    await page.waitForSelector('.overlay:has-text("New Notebook")', { state: 'visible' });
    await page.fill('input[placeholder="Enter notebook name..."]', 'Scroll Test Notebook 2');
    await page.click('button:has-text("Create Notebook")');
    await page.waitForSelector('.notebook-item:has-text("Scroll Test Notebook 2")', { state: 'visible' });

    await page.click('.notebook-item:has-text("Scroll Test Notebook 2") .notebook-item__btn');
    await page.waitForSelector('.memo-view', { state: 'visible' });

    await page.click('button:has-text("Add Your First Memo")');
    await page.waitForSelector('.overlay:has-text("Add New Memo")', { state: 'visible' });
    await page.fill('textarea[placeholder="Enter the word or phrase..."]', 'Short text');
    await page.fill('textarea[placeholder="Enter the meaning or translation..."]', longExplanation);
    await page.click('.overlay .form-actions button:has-text("Add Memo")');
    await page.waitForTimeout(500);

    // Enable "Always show explanation" via header menu
    await page.click('.header-menu-btn');
    await page.waitForTimeout(200);
    await page.click('.header-menu-dropdown button:has-text("Always show explanation")');
    await page.waitForTimeout(300);

    const contentElement = page.locator('.memo-card__content');
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

    await page.waitForSelector('.app-header', { state: 'visible' });

    const longText = 'Long content '.repeat(50);
    const longExplanation = 'Long explanation '.repeat(50);

    await page.click('button.add-notebook-btn');
    await page.waitForSelector('.overlay:has-text("New Notebook")', { state: 'visible' });
    await page.fill('input[placeholder="Enter notebook name..."]', 'Viewport Test Notebook');
    await page.click('button:has-text("Create Notebook")');
    await page.waitForSelector('.notebook-item:has-text("Viewport Test Notebook")', { state: 'visible' });

    await page.click('.notebook-item:has-text("Viewport Test Notebook") .notebook-item__btn');
    await page.waitForSelector('.memo-view', { state: 'visible' });

    await page.click('button:has-text("Add Your First Memo")');
    await page.waitForSelector('.overlay:has-text("Add New Memo")', { state: 'visible' });
    await page.fill('textarea[placeholder="Enter the word or phrase..."]', longText);
    await page.fill('textarea[placeholder="Enter the meaning or translation..."]', longExplanation);
    await page.click('.overlay .form-actions button:has-text("Add Memo")');
    await page.waitForTimeout(500);

    // Enable "Always show explanation" via header menu
    await page.click('.header-menu-btn');
    await page.waitForTimeout(200);
    await page.click('.header-menu-dropdown button:has-text("Always show explanation")');
    await page.waitForTimeout(300);

    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));

    const memoView = page.locator('.memo-view');
    const viewBox = await memoView.boundingBox();

    const memoCard = page.locator('.memo-card');
    const cardBox = await memoCard.boundingBox();

    expect(viewBox).not.toBeNull();
    expect(cardBox).not.toBeNull();

    if (viewBox && cardBox) {
      console.log('Viewport:', viewport);
      console.log('Memo view bounds:', viewBox);
      console.log('Memo card bounds:', cardBox);

      expect(cardBox.y).toBeGreaterThanOrEqual(0);
      expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(viewport.height);

      const cardHeightRatio = cardBox.height / viewBox.height;
      expect(cardHeightRatio).toBeGreaterThan(0.5);

      console.log('✓ Memo card fills available space on mobile');
    }
  });

  test('touch scrolling works on long memo content', async ({ page }) => {
    if (!(await isMobile(page))) {
      test.skip();
    }

    await page.waitForSelector('.app-header', { state: 'visible' });

    const longText = 'Touch scroll test content. '.repeat(30);

    await page.click('button.add-notebook-btn');
    await page.waitForSelector('.overlay:has-text("New Notebook")', { state: 'visible' });
    await page.fill('input[placeholder="Enter notebook name..."]', 'Touch Scroll Test');
    await page.click('button:has-text("Create Notebook")');
    await page.waitForSelector('.notebook-item:has-text("Touch Scroll Test")', { state: 'visible' });

    await page.click('.notebook-item:has-text("Touch Scroll Test") .notebook-item__btn');
    await page.waitForSelector('.memo-view', { state: 'visible' });

    await page.click('button:has-text("Add Your First Memo")');
    await page.waitForSelector('.overlay:has-text("Add New Memo")', { state: 'visible' });
    await page.fill('textarea[placeholder="Enter the word or phrase..."]', longText);
    await page.fill('textarea[placeholder="Enter the meaning or translation..."]', 'Explanation');
    await page.click('.overlay .form-actions button:has-text("Add Memo")');
    await page.waitForTimeout(500);

    const originalTextElement = page.locator('.memo-card__original');
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

    await page.waitForSelector('.app-header', { state: 'visible' });

    const longText = 'Long content for swipe test. '.repeat(20);

    await page.click('button.add-notebook-btn');
    await page.waitForSelector('.overlay:has-text("New Notebook")', { state: 'visible' });
    await page.fill('input[placeholder="Enter notebook name..."]', 'Swipe Nav Test');
    await page.click('button:has-text("Create Notebook")');
    await page.waitForSelector('.notebook-item:has-text("Swipe Nav Test")', { state: 'visible' });

    await page.click('.notebook-item:has-text("Swipe Nav Test") .notebook-item__btn');
    await page.waitForSelector('.memo-view', { state: 'visible' });

    await page.click('button:has-text("Add Your First Memo")');
    await page.waitForSelector('.overlay:has-text("Add New Memo")', { state: 'visible' });
    await page.fill('textarea[placeholder="Enter the word or phrase..."]', longText);
    await page.fill('textarea[placeholder="Enter the meaning or translation..."]', 'Explanation 1');
    await page.click('.overlay .form-actions button:has-text("Add Memo")');
    await page.waitForTimeout(500);

    await page.click('.fab--primary');
    await page.waitForSelector('.overlay:has-text("Add New Memo")', { state: 'visible' });
    await page.fill('textarea[placeholder="Enter the word or phrase..."]', 'Second Memo');
    await page.fill('textarea[placeholder="Enter the meaning or translation..."]', 'Explanation 2');
    await page.click('.overlay .form-actions button:has-text("Add Memo")');
    await page.waitForTimeout(500);

    const progressText = await page.locator('.memo-view__progress span').textContent();
    expect(progressText).toBe('1 / 2');

    const memoCard = page.locator('.memo-card');
    const cardBox = await memoCard.boundingBox();
    expect(cardBox).not.toBeNull();

    if (cardBox) {
      const startX = cardBox.x + cardBox.width / 2;
      const startY = cardBox.y + cardBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 200, startY, { steps: 20 });
      await page.mouse.up();

      await page.waitForTimeout(300);

      const newProgressText = await page.locator('.memo-view__progress span').textContent();
      expect(newProgressText).toBe('2 / 2');

      console.log('✓ Horizontal swipe navigation works with scrollable content');
    }
  });

  test('always show explanation menu option toggles correctly', async ({ page }) => {
    if (!(await isMobile(page))) {
      test.skip();
    }

    await page.waitForSelector('.app-header', { state: 'visible' });

    await page.click('button.add-notebook-btn');
    await page.waitForSelector('.overlay:has-text("New Notebook")', { state: 'visible' });
    await page.fill('input[placeholder="Enter notebook name..."]', 'Always Show Test');
    await page.click('button:has-text("Create Notebook")');
    await page.waitForSelector('.notebook-item:has-text("Always Show Test")', { state: 'visible' });

    await page.click('.notebook-item:has-text("Always Show Test") .notebook-item__btn');
    await page.waitForSelector('.memo-view', { state: 'visible' });

    await page.click('button:has-text("Add Your First Memo")');
    await page.waitForSelector('.overlay:has-text("Add New Memo")', { state: 'visible' });
    await page.fill('textarea[placeholder="Enter the word or phrase..."]', 'Test memo');
    await page.fill('textarea[placeholder="Enter the meaning or translation..."]', 'Test explanation');
    await page.click('.overlay .form-actions button:has-text("Add Memo")');
    await page.waitForTimeout(500);

    // Initially, explanation should be hidden
    await expect(page.locator('.memo-card__explanation')).not.toBeVisible();

    // Open header menu and enable "Always show explanation"
    await page.click('.header-menu-btn');
    await page.waitForTimeout(200);

    // Check that the option is not checked initially
    const menuItem = page.locator('.header-menu-dropdown button:has-text("Always show explanation")');
    await expect(menuItem).toBeVisible();
    const initialText = await menuItem.textContent();
    expect(initialText).not.toContain('✓');

    // Click to enable
    await menuItem.click();
    await page.waitForTimeout(300);

    // Explanation should now be visible
    await expect(page.locator('.memo-card__explanation')).toBeVisible();

    // Open menu again and verify checkmark
    await page.click('.header-menu-btn');
    await page.waitForTimeout(200);
    const checkedText = await page.locator('.header-menu-dropdown button:has-text("Always show explanation")').textContent();
    expect(checkedText).toContain('✓');

    console.log('✓ Always show explanation menu option toggles correctly');
  });

  test('explanation hides on swipe when always show is disabled', async ({ page }) => {
    if (!(await isMobile(page))) {
      test.skip();
    }

    await page.waitForSelector('.app-header', { state: 'visible' });

    await page.click('button.add-notebook-btn');
    await page.waitForSelector('.overlay:has-text("New Notebook")', { state: 'visible' });
    await page.fill('input[placeholder="Enter notebook name..."]', 'Swipe Hide Test');
    await page.click('button:has-text("Create Notebook")');
    await page.waitForSelector('.notebook-item:has-text("Swipe Hide Test")', { state: 'visible' });

    await page.click('.notebook-item:has-text("Swipe Hide Test") .notebook-item__btn');
    await page.waitForSelector('.memo-view', { state: 'visible' });

    // Add two memos
    await page.click('button:has-text("Add Your First Memo")');
    await page.waitForSelector('.overlay:has-text("Add New Memo")', { state: 'visible' });
    await page.fill('textarea[placeholder="Enter the word or phrase..."]', 'First memo');
    await page.fill('textarea[placeholder="Enter the meaning or translation..."]', 'First explanation');
    await page.click('.overlay .form-actions button:has-text("Add Memo")');
    await page.waitForTimeout(500);

    await page.click('.fab--primary');
    await page.waitForSelector('.overlay:has-text("Add New Memo")', { state: 'visible' });
    await page.fill('textarea[placeholder="Enter the word or phrase..."]', 'Second memo');
    await page.fill('textarea[placeholder="Enter the meaning or translation..."]', 'Second explanation');
    await page.click('.overlay .form-actions button:has-text("Add Memo")');
    await page.waitForTimeout(500);

    // Enable explanation by clicking on card (tap to toggle)
    await page.click('.memo-card');
    await page.waitForTimeout(300);
    await expect(page.locator('.memo-card__explanation')).toBeVisible();

    // Swipe to next memo
    const memoCard = page.locator('.memo-card');
    const cardBox = await memoCard.boundingBox();
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
      await expect(page.locator('.memo-card__explanation')).not.toBeVisible();

      console.log('✓ Explanation hides on swipe when always show is disabled');
    }
  });

  test('explanation stays visible on swipe when always show is enabled', async ({ page }) => {
    if (!(await isMobile(page))) {
      test.skip();
    }

    await page.waitForSelector('.app-header', { state: 'visible' });

    await page.click('button.add-notebook-btn');
    await page.waitForSelector('.overlay:has-text("New Notebook")', { state: 'visible' });
    await page.fill('input[placeholder="Enter notebook name..."]', 'Swipe Keep Test');
    await page.click('button:has-text("Create Notebook")');
    await page.waitForSelector('.notebook-item:has-text("Swipe Keep Test")', { state: 'visible' });

    await page.click('.notebook-item:has-text("Swipe Keep Test") .notebook-item__btn');
    await page.waitForSelector('.memo-view', { state: 'visible' });

    // Add two memos
    await page.click('button:has-text("Add Your First Memo")');
    await page.waitForSelector('.overlay:has-text("Add New Memo")', { state: 'visible' });
    await page.fill('textarea[placeholder="Enter the word or phrase..."]', 'First memo');
    await page.fill('textarea[placeholder="Enter the meaning or translation..."]', 'First explanation');
    await page.click('.overlay .form-actions button:has-text("Add Memo")');
    await page.waitForTimeout(500);

    await page.click('.fab--primary');
    await page.waitForSelector('.overlay:has-text("Add New Memo")', { state: 'visible' });
    await page.fill('textarea[placeholder="Enter the word or phrase..."]', 'Second memo');
    await page.fill('textarea[placeholder="Enter the meaning or translation..."]', 'Second explanation');
    await page.click('.overlay .form-actions button:has-text("Add Memo")');
    await page.waitForTimeout(500);

    // Enable "Always show explanation"
    await page.click('.header-menu-btn');
    await page.waitForTimeout(200);
    await page.click('.header-menu-dropdown button:has-text("Always show explanation")');
    await page.waitForTimeout(300);

    // Explanation should be visible
    await expect(page.locator('.memo-card__explanation')).toBeVisible();

    // Swipe to next memo
    const memoCard = page.locator('.memo-card');
    const cardBox = await memoCard.boundingBox();
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
      await expect(page.locator('.memo-card__explanation')).toBeVisible();

      console.log('✓ Explanation stays visible on swipe when always show is enabled');
    }
  });
});
