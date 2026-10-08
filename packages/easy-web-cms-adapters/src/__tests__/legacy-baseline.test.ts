import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import AdminPage from '../components/AdminPage.astro';
import { normalizeHtml } from './normalize-html';

/**
 * Baseline: today's legacy <AdminPage> (no `config` prop) renders the Decap
 * page that loads /admin/config.yml and decap-cms@3.14.0 from unpkg. A change
 * to this snapshot is a regression of legacy usage - do not update it.
 */
describe('AdminPage legacy rendering baseline', () => {
  it('renders the legacy page with no props', async () => {
    const container = await AstroContainer.create();
    const html = normalizeHtml(await container.renderToString(AdminPage));
    expect(html).toContain('href="/admin/config.yml"');
    expect(html).toContain('https://unpkg.com/decap-cms@3.14.0/dist/decap-cms.js');
    expect(html).toMatchSnapshot();
  });
});
