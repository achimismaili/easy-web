import { expect, test } from '@playwright/test';

for (const width of [375, 768, 1280]) {
  test(`card images keep 16:9 cover at ${width}px without a global image reset`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:4322/easy-web/testing/card-images/');

    const cases = page.locator('[data-card-case]');
    await expect(cases).toHaveCount(12);

    for (const fixture of await cases.all()) {
      const name = await fixture.getAttribute('data-card-case');
      const image = fixture.locator('img');
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

      const geometry = await image.evaluate((img: HTMLImageElement) => {
        const card = img.parentElement!;
        const bounds = img.getBoundingClientRect();
        return {
          width: bounds.width,
          height: bounds.height,
          cardWidth: card.clientWidth,
          fit: getComputedStyle(img).objectFit,
          scopeMatches: card.getAttributeNames()
            .filter(name => name.startsWith('data-astro-cid-'))
            .some(name => img.hasAttribute(name)),
          sourceRatio: img.naturalWidth / img.naturalHeight,
        };
      });

      expect(geometry.width, name!).toBeGreaterThan(100);
      expect(Math.abs(geometry.width - geometry.cardWidth), name!).toBeLessThan(1);
      expect(Math.abs(geometry.height - geometry.width * 9 / 16), name!).toBeLessThan(1);
      expect(geometry.fit, name!).toBe('cover');
      expect(geometry.scopeMatches, name!).toBe(true);
      expect(geometry.sourceRatio, name!).toBeCloseTo(Number(await fixture.getAttribute('data-source-ratio')), 2);

      const intrinsicWidth = await fixture.getAttribute('data-width');
      const intrinsicHeight = await fixture.getAttribute('data-height');
      if (intrinsicWidth && intrinsicHeight) {
        await expect(image).toHaveAttribute('width', intrinsicWidth);
        await expect(image).toHaveAttribute('height', intrinsicHeight);
        await expect(image).toHaveAttribute('srcset', /400w/);
      } else {
        await expect(image).not.toHaveAttribute('width');
        await expect(image).not.toHaveAttribute('height');
      }
    }
  });
}
