import { describe, it, expect } from 'vitest'
import { createCrawlPolicy, isDisallowedPath } from '../src/crawl-policy.js'

describe('createCrawlPolicy', () => {
  it('blocks only /admin/ and publishes a sitemap in public mode', () => {
    const policy = createCrawlPolicy(false)

    expect(policy.disallow).toEqual(['/admin/'])
    expect(policy.allow).toEqual(['/'])
    expect(policy.sitemap).toBe(true)
  })

  it('blocks everything and publishes no sitemap in noIndex mode', () => {
    const policy = createCrawlPolicy(true)

    expect(policy.disallow).toEqual(['/'])
    expect(policy.allow).toEqual([])
    expect(policy.sitemap).toBe(false)
  })
})

describe('isDisallowedPath', () => {
  const publicPolicy = createCrawlPolicy(false)

  it('matches the admin route with and without a trailing slash', () => {
    expect(isDisallowedPath('/admin', publicPolicy)).toBe(true)
    expect(isDisallowedPath('/admin/', publicPolicy)).toBe(true)
  })

  it('matches nested admin routes', () => {
    expect(isDisallowedPath('/admin/settings/', publicPolicy)).toBe(true)
  })

  it('does not match routes that merely share the admin prefix', () => {
    expect(isDisallowedPath('/administration/', publicPolicy)).toBe(false)
    expect(isDisallowedPath('/adminfoo', publicPolicy)).toBe(false)
  })

  it('leaves ordinary routes crawlable', () => {
    expect(isDisallowedPath('/', publicPolicy)).toBe(false)
    expect(isDisallowedPath('/datenschutz/', publicPolicy)).toBe(false)
  })

  it('blocks every path in noIndex mode', () => {
    const policy = createCrawlPolicy(true)

    expect(isDisallowedPath('/', policy)).toBe(true)
    expect(isDisallowedPath('/bikes/fatboy/', policy)).toBe(true)
  })
})
