import { expect, test, type Locator } from '@playwright/test';

const contractFixtureUrl = 'http://127.0.0.1:4321/admin';
const showcaseComponentsUrl = 'http://127.0.0.1:4322/easy-web/components';

test('contract fixture admin renders its CMS login without configuration errors', async ({ page }) => {
  await page.goto(contractFixtureUrl);

  await expect(page.getByText(/Config Errors|Error loading the CMS configuration/i)).toHaveCount(0);
  await expect(page.locator('button').first()).toBeVisible();
});

test('asset and public-path galleries open matching images and restore focus on Escape', async ({ page }) => {
  await page.goto(showcaseComponentsUrl);

  for (const id of ['gallery-lightbox-assets', 'gallery-lightbox-paths']) {
    await assertLightboxBehavior(page.locator(`#${id}`));
  }
});

async function assertLightboxBehavior(gallery: Locator): Promise<void> {
  const trigger = gallery.locator('button[aria-label^="Open "]').first();
  const thumbnail = trigger.locator('img');
  const expectedSource = await thumbnail.evaluate(image => image.currentSrc || image.src);

  await trigger.click();

  const dialog = gallery.locator('[role="dialog"][data-open="true"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img')).toHaveJSProperty('currentSrc', expectedSource);

  await dialog.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
}
