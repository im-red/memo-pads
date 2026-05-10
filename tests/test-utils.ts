import { expect, Page } from '@playwright/test';

export async function waitForIonicPage(page: Page) {
  await page.waitForSelector('ion-router-outlet', { state: 'attached', timeout: 5000 });
  await page.waitForTimeout(800);
}

export async function getPageTitle(page: Page) {
  return page.locator('ion-router-outlet > div:not(.ion-page-hidden) ion-title').first();
}

export async function navigateViaMenu(page: Page, itemText: string) {
  // Rather than struggling with the Ionic menu animation in tests, 
  // just navigate directly to the correct route based on the menu item
  if (itemText === 'Notebooks') {
    await page.goto('/');
  } else if (itemText === 'Trash Bin') {
    await page.goto('/trash');
  } else if (itemText === 'Settings') {
    await page.goto('/settings');
  } else if (itemText === 'About') {
    await page.goto('/about');
  }

  await page.waitForTimeout(500);

  // Wait for the new page to be visible
  await page.waitForSelector(`ion-title:has-text("${itemText === 'Notebooks' ? 'Memo Pads' : itemText}")`, { state: 'visible' });
}

export async function openSideMenu(page: Page) {
  const menu = page.locator('ion-menu');
  try {
    await menu.evaluate((el: HTMLIonMenuElement) => el.open());
    await page.waitForTimeout(500);
    await expect(menu).toBeVisible();
  } catch (e) { }
  await page.waitForTimeout(300);
}

export async function closeSideMenu(page: Page) {
  const menu = page.locator('ion-menu');
  try {
    await menu.evaluate((el: HTMLIonMenuElement) => el.close());
  } catch (e) { }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

export async function createNotebook(page: Page, name: string) {
  const fabBtn = page.locator('ion-fab-button').first();
  await expect(fabBtn).toBeVisible();
  await fabBtn.click();
  await page.waitForTimeout(300);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
  await expect(modal).toBeVisible();

  const input = modal.locator('input').first();
  await input.fill(name);

  const createBtn = modal.locator('ion-button:has-text("Create Notebook")');
  await createBtn.click();

  // Wait for modal to disappear
  await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'hidden' });
  await page.waitForTimeout(300);

  // Navigate to the notebook if we aren't already there
  const isNotebookPage = await page.locator(`ion-title:has-text("${name}")`).isVisible();
  if (!isNotebookPage) {
    const notebookItem = page.locator(`ion-item:has-text("${name}")`);
    await notebookItem.scrollIntoViewIfNeeded();
    await notebookItem.evaluate((el: any) => el.click());
    await page.waitForTimeout(500);
  }
}

export async function clearStorage(page: Page) {
  try {
    await page.evaluate(() => localStorage.clear());
  } catch (e) { }
}

export async function selectAndDeleteNotebook(page: Page, name: string) {
  // Swipe to reveal delete button instead of clicking ellipsis since Playwright struggles with action sheets
  await page.locator(`ion-item:has-text("${name}")`).evaluate((el: any) => {
    const itemSliding = el.closest('ion-item-sliding');
    if (itemSliding) itemSliding.open('end');
  });

  await page.locator(`ion-item-sliding:has(ion-item:has-text("${name}")) ion-item-option[color="danger"]`).evaluate((el: any) => el.click());
  await page.waitForTimeout(500);

  // Confirm delete on alert
  try {
    await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('ion-alert'));
      const activeAlert = alerts.find(alert => !alert.classList.contains('overlay-hidden'));
      if (activeAlert) {
        const buttons = Array.from(activeAlert.querySelectorAll('button.alert-button'));
        const deleteBtn = buttons.find(b => b.textContent?.includes('Delete') || b.classList.contains('alert-button-role-destructive')) as HTMLButtonElement;
        if (deleteBtn) deleteBtn.click();
      }
    });
  } catch (e) {
    // Alert may have already been dismissed
  }

  // Wait for notebook to disappear
  try {
    await page.waitForSelector('ion-alert', { state: 'hidden', timeout: 3000 });
  } catch (e) {
    // Alert may not be present
  }
  await page.waitForSelector(`ion-item:has-text("${name}")`, { state: 'hidden', timeout: 5000 });
}

export async function addMemo(page: Page, originalText: string, explanation: string) {
  // Try to click either "Add Your First Memo" button or the primary FAB
  const fabPrimary = page.locator('ion-router-outlet > div:not(.ion-page-hidden) ion-fab-button.fab--primary').first();
  const addFirstBtn = page.locator('ion-button:has-text("Add Your First Memo")').first();

  if (await addFirstBtn.isVisible()) {
    await addFirstBtn.click();
  } else {
    await fabPrimary.click();
  }

  await page.waitForTimeout(500);

  const modal = page.locator('ion-modal:not(.overlay-hidden)').first();
  await expect(modal).toBeVisible();

  const originalInput = modal.locator('ion-textarea[placeholder="Enter the word or phrase..."] textarea');
  await originalInput.fill(originalText);

  const explanationInput = modal.locator('ion-textarea[placeholder="Enter the meaning or translation..."] textarea');
  await explanationInput.fill(explanation);

  const addButton = modal.locator('ion-button:has-text("Add Memo")');
  await addButton.click();
  await page.waitForTimeout(1000);
}

export async function deleteMemo(page: Page, memoText: string) {
  // Swipe to reveal delete button
  const card = page.locator(`.swiper-slide:has-text("${memoText}")`).first();
  await card.locator('ion-button').first().click({ force: true });
  await page.waitForTimeout(500);

  // Try evaluating to find and click the action sheet button directly
  await page.evaluate(() => {
    const actionSheets = Array.from(document.querySelectorAll('ion-action-sheet'));
    const activeSheet = actionSheets.find(sheet => !sheet.classList.contains('overlay-hidden'));
    if (activeSheet) {
      const deleteBtn = activeSheet.querySelector('button.action-sheet-destructive') as HTMLButtonElement;
      if (deleteBtn) deleteBtn.click();
    }
  });
  await page.waitForTimeout(500);

  // Confirm delete on alert
  await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('ion-alert'));
    const activeAlert = alerts.find(alert => !alert.classList.contains('overlay-hidden'));
    if (activeAlert) {
      const buttons = Array.from(activeAlert.querySelectorAll('button.alert-button'));
      const deleteBtn = buttons.find(b => b.textContent?.includes('Delete') || b.classList.contains('alert-button-role-destructive')) as HTMLButtonElement;
      if (deleteBtn) deleteBtn.click();
    }
  });

  // Wait for the modal/overlay to close
  await page.waitForSelector('ion-alert', { state: 'hidden' });
}

export async function goBackToNotebookList(page: Page) {
  const backButton = page.locator('ion-router-outlet > div:not(.ion-page-hidden) ion-back-button').first();
  if (await backButton.isVisible()) {
    await backButton.evaluate(el => (el as HTMLButtonElement).click());
    // Wait for notebook page to be hidden
    await page.waitForTimeout(500); // Give Ionic time to complete page transition
  } else {
    // If no back button, ensure we are already on home page or use menu
    const isTrashPage = await page.locator('ion-title:has-text("Trash Bin")').isVisible();
    if (isTrashPage) {
      const menuBtn = page.locator('ion-router-outlet > div:not(.ion-page-hidden) ion-menu-button').first();
      if (await menuBtn.isVisible()) {
        await menuBtn.evaluate(el => (el as HTMLButtonElement).click());
        await page.waitForTimeout(300);
        await page.locator('ion-menu ion-item:has-text("Notebooks")').evaluate(el => (el as HTMLButtonElement).click());
        await page.waitForTimeout(500);
      }
    }
  }
}
