import { describe, it, expect, afterEach } from 'vitest';
import type { APIContext } from 'astro';
import { GET } from '../src/routes/robots-txt.js';

const runGET = (ctx: Partial<APIContext>): Response => {
  const result = GET(ctx as APIContext);
  if (!(result instanceof Response)) {
    throw new Error('GET returned a non-Response value; robots-txt handler must be synchronous Response');
  }
  return result;
};

describe('robots-txt GET handler', () => {
  afterEach(() => {
    delete process.env.EASY_WEB_SEO_NO_INDEX;
  });

  it('returns public robots.txt with Sitemap when EASY_WEB_SEO_NO_INDEX is "false"', async () => {
    process.env.EASY_WEB_SEO_NO_INDEX = 'false';
    const response = runGET({ site: new URL('https://harleyrentflorida.de') });
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(text).toContain('User-agent: *');
    expect(text).toContain('Disallow: /admin/');
    expect(text).toContain('Allow: /');
    expect(text).toContain('Sitemap: https://harleyrentflorida.de/sitemap-index.xml');
    expect(text).not.toMatch(/Disallow: \/\n/);
  });

  it('returns noIndex robots.txt (Disallow: /) without Sitemap when EASY_WEB_SEO_NO_INDEX is "true"', async () => {
    process.env.EASY_WEB_SEO_NO_INDEX = 'true';
    const response = runGET({ site: new URL('https://dev.ismaili.de') });
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(text).toContain('User-agent: *');
    expect(text).toMatch(/Disallow: \/\n/);
    expect(text).not.toContain('Sitemap:');
    expect(text).not.toContain('/admin/');
    expect(text).not.toContain('Allow: /');
  });

  it('returns 500 fail-safe (Disallow: /, no Sitemap) when site is undefined', async () => {
    const response = runGET({ site: undefined });
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(text).toContain('User-agent: *');
    expect(text).toContain('Disallow: /');
    expect(text).not.toContain('Sitemap:');
  });

  it('treats missing EASY_WEB_SEO_NO_INDEX env var as public mode (Sitemap present)', async () => {
    delete process.env.EASY_WEB_SEO_NO_INDEX;
    const response = runGET({ site: new URL('https://example.com') });
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('Sitemap: https://example.com/sitemap-index.xml');
    expect(text).toContain('Disallow: /admin/');
  });
});
