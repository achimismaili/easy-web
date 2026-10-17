import { expect, test } from '@playwright/test';

const showcaseUrl = process.env.SHOWCASE_TEST_URL ?? 'http://127.0.0.1:4322/easy-web';

for (const header of ['standard', 'centered', 'hide-on-scroll', 'flyout']) {
  for (const width of [375, 1280]) {
    test(`${header} keeps the keyboard skip link above the header at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${showcaseUrl}/testing/page-shell/${header}/`);

      const skip = page.getByRole('link', { name: 'Zum Hauptinhalt springen' });
      await page.keyboard.press('Tab');
      await expect(skip).toBeFocused();
      await expect(skip).toBeInViewport();
      const visible = await skip.evaluate(link => {
        const bounds = link.getBoundingClientRect();
        const header = document.querySelector('header')!.getBoundingClientRect();
        const style = getComputedStyle(link);
        return {
          overlapsHeader: bounds.top < header.bottom && bounds.bottom > header.top,
          unobscured: [0.1, 0.5, 0.9].every(x =>
            [0.1, 0.5, 0.9].every(y =>
              document.elementFromPoint(bounds.left + bounds.width * x, bounds.top + bounds.height * y) === link)),
          focusRing: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2,
        };
      });
      expect(visible).toEqual({ overlapsHeader: true, unobscured: true, focusRing: true });

      await page.keyboard.press('Enter');
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('main')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Bilder', exact: true })).toBeFocused();
      await expect(page.getByRole('heading', { name: 'Bilder', level: 2, exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'See öffnen', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      // The modal must still cover the header after adopting the sticky token.
      expect(await dialog.evaluate(element => element.contains(document.elementFromPoint(20, 20)))).toBe(true);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    });
  }
}
