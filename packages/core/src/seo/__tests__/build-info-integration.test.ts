import { afterEach, describe, expect, it, vi } from 'vitest';
import easyWebSeo, { type Options } from '../index.js';
import { GET as robots } from '../routes/robots-txt.js';
import { GET as version } from '../routes/version-json.js';

const { sitemapSpy } = vi.hoisted(() => ({ sitemapSpy: vi.fn() }));
vi.mock('@astrojs/sitemap', () => ({ default: (options: unknown) => {
    sitemapSpy(options);
    return { name: '@astrojs/sitemap', hooks: {} };
} }));

function setup(options: Options = {}, base = '/') {
    const integration = easyWebSeo(options);
    const injectRoute = vi.fn();
    const hook = integration.hooks['astro:config:setup'];
    if (!hook) throw new Error('Missing setup hook');
    Reflect.apply(hook, undefined, [{
        config: { root: new URL('../../../../../apps/contract-fixture/', import.meta.url), site: 'https://example.com', base, trailingSlash: 'ignore', build: { format: 'directory' }, integrations: [] },
        updateConfig: vi.fn(), injectRoute, logger: { warn: vi.fn(), error: vi.fn() },
    }]);
    return injectRoute;
}

afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.EASY_WEB_SEO_BUILD_INFO;
    delete process.env.EASY_WEB_SEO_BUILD_INFO_JSON;
    delete process.env.EASY_WEB_SEO_BASE;
    delete process.env.EASY_WEB_SEO_NO_INDEX;
    delete process.env.EASY_WEB_SEO_TRAILING_SLASH;
    sitemapSpy.mockClear();
});

describe('opt-in build-info routes', () => {
    it('injects both routes as prerendered when enabled', () => {
        // Given explicit opt-in
        const options = { buildInfo: { site: 'Public', json: true } };
        // When setting up SEO
        const routes = setup(options).mock.calls.map(([route]) => route);
        // Then Astro receives both static route declarations
        expect(routes).toEqual(expect.arrayContaining([
            expect.objectContaining({ pattern: '/version', prerender: true }),
            expect.objectContaining({ pattern: '/version.json', prerender: true }),
        ]));
    });

    it('serves the exact shared manifest with safe JSON headers', async () => {
        // Given opt-in setup and unrelated private environment state
        vi.stubEnv('PRIVATE_TENANT', 'secret-tenant');
        setup({ buildInfo: { site: 'Public', releaseId: 'release-42', json: true } });
        const expected = process.env.EASY_WEB_SEO_BUILD_INFO;
        // When requesting the machine endpoint
        const response = await Reflect.apply(version, undefined, [{}]);
        // Then bytes match the immutable handoff, with no framework/private additions
        expect(await response.text()).toBe(expected);
        expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
        expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
        expect(expected).not.toContain('secret-tenant');
    });

    it('retains prior robots bytes and route set when omitted after an enabled build', async () => {
        // Given an earlier enabled build in the same process
        setup({ buildInfo: { site: 'Earlier' } });
        // When setting up a site without the feature
        const routes = setup().mock.calls.map(([route]) => route.pattern);
        const response = await Reflect.apply(robots, undefined, [{ site: new URL('https://example.com') }]);
        // Then the old public behavior is byte-equivalent and no manifest survives
        expect(routes).toEqual(['/robots.txt']);
        expect(process.env.EASY_WEB_SEO_BUILD_INFO).toBeUndefined();
        expect(await response.text()).toBe('User-agent: *\nDisallow: /admin/\nAllow: /\n\nSitemap: https://example.com/sitemap-index.xml\n');
        const filter = sitemapSpy.mock.lastCall?.[0].filter;
        expect(filter('https://example.com/version/')).toBe(true);
    });

    it('keeps JSON disabled unless the host explicitly supports its response headers', () => {
        const routes = setup({ buildInfo: { site: 'Public' } }).mock.calls.map(([route]) => route.pattern);

        expect(routes).toContain('/version');
        expect(routes).not.toContain('/version.json');
        expect(process.env.EASY_WEB_SEO_BUILD_INFO_JSON).toBe('false');
    });

    it.each(['/', '/sub/'])('excludes both routes from the sitemap while leaving noindex discoverable under base %s', async (base) => {
        // Given public opt-in with a caller filter that allows everything
        setup({ buildInfo: { site: 'Public' }, filter: () => true }, base);
        // When evaluating sitemap URLs and robots
        const filter = sitemapSpy.mock.lastCall?.[0].filter;
        const response = await Reflect.apply(robots, undefined, [{ site: new URL('https://example.com') }]);
        // Then neither version surface is advertised, but robots does not hide
        // the routes from crawlers that must read their noindex directives.
        for (const route of ['version', 'version/', 'version.json']) expect(filter(`https://example.com${base}${route}`)).toBe(false);
        expect(filter(`https://example.com${base}version-history/`)).toBe(true);
        expect(await response.text()).toBe(`User-agent: *\nDisallow: /admin/\nAllow: /\n\nSitemap: https://example.com${base}sitemap-index.xml\n`);
    });

    it('keeps noIndex policy global without redundant route rules', async () => {
        // Given a wholly unindexed site
        setup({ noIndex: true, buildInfo: { site: 'Public' } });
        // When rendering robots
        const response = await Reflect.apply(robots, undefined, [{ site: new URL('https://example.com') }]);
        // Then the global rule is unchanged
        expect(await response.text()).toBe('User-agent: *\nDisallow: /\n');
        expect(sitemapSpy).not.toHaveBeenCalled();
    });
});
