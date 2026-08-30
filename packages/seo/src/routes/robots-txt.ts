import type { APIRoute } from 'astro'

import { createCrawlPolicy, type CrawlPolicy } from '../crawl-policy.js'

function render(policy: CrawlPolicy, site: URL | undefined): string {
  const lines = ['User-agent: *']

  for (const path of policy.disallow) {
    lines.push(`Disallow: ${path}`)
  }
  for (const path of policy.allow) {
    lines.push(`Allow: ${path}`)
  }

  if (policy.sitemap && site) {
    lines.push('')
    lines.push(`Sitemap: ${new URL('sitemap-index.xml', site).href}`)
  }

  return `${lines.join('\n')}\n`
}

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    return new Response(render(createCrawlPolicy(true), undefined), {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const policy = createCrawlPolicy(process.env.EASY_WEB_SEO_NO_INDEX === 'true')

  return new Response(render(policy, site), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
