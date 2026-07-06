// Stub — implementation in T7
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  return new Response(`User-agent: *\nDisallow: /admin/\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site ?? 'https://example.com').href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
