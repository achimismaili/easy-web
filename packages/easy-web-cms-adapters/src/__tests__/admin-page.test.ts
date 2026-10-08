import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import AdminPage from '../components/AdminPage.astro';

const render = async (props?: Record<string, unknown>): Promise<string> =>
    (await AstroContainer.create()).renderToString(AdminPage, props ? { props } : undefined);

describe('AdminPage manual init', () => {
    it('sets the manual-init flag before Decap loads, then calls initCMS after it', async () => {
        const html = await render({ config: { load_config_file: false, collections: [] }, decapVersion: '3.15.0', lang: 'de', title: 'CMS' });
        const flag = html.indexOf('window.CMS_MANUAL_INIT = true;');
        const decap = html.indexOf('decap-cms@3.15.0/dist/decap-cms.js');
        const init = html.indexOf('window.initCMS({ config: {"load_config_file":false,"collections":[]} });');
        expect(flag).toBeGreaterThan(-1);
        expect(flag).toBeLessThan(decap);
        expect(decap).toBeLessThan(init);
        expect(html).not.toContain('config.yml');
        expect(html).toContain('lang="de"');
        expect(html).toContain('<title>CMS</title>');
    });

    it('defaults manual init to the current Decap release without an explicit version', async () => {
        const html = await render({ config: { load_config_file: false, collections: [] } });
        expect(html).toContain('decap-cms@3.16.3/dist/decap-cms.js');
    });

    it('escapes a closing script tag inside the config', async () => {
        const html = await render({ config: { hint: '</script><b>' } });
        expect(html).not.toContain('</script><b>');
        expect(html).toContain('\\u003c/script>');
    });

    it('keeps the legacy page pinned and ignores decapVersion without config', async () => {
        const html = await render({ decapVersion: '9.9.9' });
        expect(html).toContain('decap-cms@3.14.0');
        expect(html).toContain('/admin/config.yml');
        expect(html).not.toContain('CMS_MANUAL_INIT');
    });
});
