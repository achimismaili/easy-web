import type { APIRoute } from 'astro';

/**
 * Dynamic robots.txt endpoint injected by @achimismaili/easy-web-seo integration.
 *
 * Behavior:
 * - noIndex mode (process.env.EASY_WEB_SEO_NO_INDEX === 'true'):
 *   Emits Disallow: / (blocks all crawlers — for auth-gated/staging sites)
 * - Public mode (default):
 *   Emits Disallow: /admin/, Allow: /, Sitemap: <site>/sitemap-index.xml
 *
 * The noIndex flag is set by the integration factory in astro:config:setup
 * via process.env.EASY_WEB_SEO_NO_INDEX before this route is injected.
 */
export const GET: APIRoute = ({ site }) => {
  const noIndex = process.env.EASY_WEB_SEO_NO_INDEX === 'true';

  if (!site) {
    // Fail safe: if site is not configured, block all crawlers
    return new Response('User-agent: *\nDisallow: /\n', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const lines: string[] = ['User-agent: *'];

  if (noIndex) {
    // Auth-gated / staging / dev site — block all crawlers
    lines.push('Disallow: /');
  } else {
    // Public site — allow all, block CMS admin, link sitemap
    lines.push('Disallow: /admin/');
    lines.push('Allow: /');
    lines.push('');
    lines.push(`Sitemap: ${new URL('sitemap-index.xml', site).href}`);
  }

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
