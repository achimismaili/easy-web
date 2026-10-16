import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, expect, it, vi } from 'vitest';
import VersionPage from '../routes/version.astro';

afterEach(() => vi.unstubAllEnvs());

it('renders escaped manifest values in an accessible zero-hydration document', async () => {
    // Given a manifest whose public labels need HTML escaping
    vi.stubEnv('EASY_WEB_SEO_BUILD_INFO', JSON.stringify({ schema: 'easy-web/build-info', schemaVersion: 1, site: '<script>alert(1)</script>', releaseId: 'release<&>', easyWeb: { version: '1.2.3', packages: ['core'] } }));
    const container = await AstroContainer.create();
    // When rendering the actual shipped route
    const html = await container.renderToString(VersionPage);
    // Then structured document semantics and safe text survive without client code
    expect(html).toMatch(/<meta name="robots" content="noindex,nofollow"/);
    expect(html).toMatch(/<h1[^>]*>Build information<\/h1>/);
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('@easy-web/core');
    expect(html).not.toMatch(/<script|astro-island/);
});
