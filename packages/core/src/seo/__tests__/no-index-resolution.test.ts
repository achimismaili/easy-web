import { describe, it, expect, afterEach } from 'vitest';

/**
 * Mirrors the crawl-policy resolution inside SeoHead.astro. Tests the precedence
 * rules, not the Astro rendering (which requires a full Astro setup) — same
 * approach as content-blocks' UniversalMedia dispatch test.
 *
 * This pins the contract that was broken before: `easyWebSeo()` resolves the
 * crawl policy once and publishes it to the environment, and `<SeoHead>` must
 * consume that value. Defaulting the prop to `false` instead made the
 * integration and the rendered document disagree — sitemap suppressed and
 * robots.txt disallowing everything, while every page still shipped without a
 * robots meta tag.
 */
function resolveShouldNoIndex(noIndex: boolean | undefined, isNotFoundRoute: boolean): boolean {
  const policyNoIndex = process.env.EASY_WEB_SEO_NO_INDEX === 'true';
  return (noIndex ?? policyNoIndex) || isNotFoundRoute;
}

describe('<SeoHead> crawl-policy resolution', () => {
  afterEach(() => {
    delete process.env.EASY_WEB_SEO_NO_INDEX;
  });

  it('inherits noindex from the integration when the prop is omitted', () => {
    process.env.EASY_WEB_SEO_NO_INDEX = 'true';
    expect(resolveShouldNoIndex(undefined, false)).toBe(true);
  });

  it('stays indexable when neither the prop nor the policy asks for noindex', () => {
    expect(resolveShouldNoIndex(undefined, false)).toBe(false);
  });

  it('lets an explicit prop override a site-wide noindex policy', () => {
    process.env.EASY_WEB_SEO_NO_INDEX = 'true';
    expect(resolveShouldNoIndex(false, false)).toBe(false);
  });

  it('honours an explicit prop when no policy is published', () => {
    expect(resolveShouldNoIndex(true, false)).toBe(true);
  });

  it('always noindexes a 404 route, whatever the prop and policy say', () => {
    expect(resolveShouldNoIndex(false, true)).toBe(true);
    process.env.EASY_WEB_SEO_NO_INDEX = 'true';
    expect(resolveShouldNoIndex(false, true)).toBe(true);
  });

  it('treats any non-"true" env value as indexable rather than truthy-string', () => {
    process.env.EASY_WEB_SEO_NO_INDEX = 'false';
    expect(resolveShouldNoIndex(undefined, false)).toBe(false);
  });
});
