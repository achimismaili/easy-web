import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import AdminPage from '../components/AdminPage.astro';
import type { AdminShellContent } from '../content/admin-content.js';
import { normalizeHtml } from './normalize-html';

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

type Notice = AdminShellContent['notice'];

const info: Notice = { enabled: true, level: 'info', message: 'Editor message' };
const links: AdminShellContent['footerLinks'] = [
    { label: 'Website', href: '/' },
    { label: 'Decap features', href: 'https://decapcms.org/features/?persona=editor' },
    { label: 'Version', href: '/version' },
];
const shell = (notice: Notice, footerLinks = links): AdminShellContent => ({ notice, footerLinks });
const MODES: [string, Record<string, unknown>][] = [
    ['manual config', { config: { load_config_file: false, collections: [] } }],
    ['legacy', {}],
];

const region = (html: string, tag: 'header' | 'footer'): string =>
    new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`).exec(html)?.[0] ?? '';
const count = (html: string, needle: string): number => html.split(needle).length - 1;
const compactCss = (html: string): string =>
    [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
        .map((match) => match[1] ?? '')
        .join('')
        .replace(/\s*([{}:;,])\s*/g, '$1')
        .replace(/\s+/g, ' ');

describe.each(MODES)('AdminPage admin shell (%s)', (_mode, base) => {
    const renderShell = (admin: AdminShellContent, extra: Record<string, unknown> = {}): Promise<string> =>
        render({ ...base, ...extra, admin });

    it('mounts Decap in exactly one empty #nc-root that exists before any Decap script', async () => {
        const html = await renderShell(shell(info));
        expect(count(html, 'id="nc-root"')).toBe(1);
        expect(html).toMatch(/<div[^>]*id="nc-root"[^>]*><\/div>/);
        expect(html.indexOf('id="nc-root"')).toBeLessThan(html.indexOf('decap-cms@'));
    });

    it('stacks notice, mount and footer without a page header, title or second main landmark', async () => {
        const html = await renderShell(shell(info));
        expect(count(html, '<header')).toBe(1);
        expect(count(html, '<footer')).toBe(1);
        expect(html.indexOf('<header')).toBeLessThan(html.indexOf('id="nc-root"'));
        expect(html.indexOf('id="nc-root"')).toBeLessThan(html.indexOf('<footer'));
        expect(html).not.toContain('<main');
        expect(html).not.toMatch(/<h[1-6][\s>]/);
    });

    it('drops only the notice when it is disabled; the mount and footer remain', async () => {
        const html = await renderShell(shell({ ...info, enabled: false, message: 'Hidden message' }));
        expect(html).not.toContain('<header');
        expect(html).not.toContain('Hidden message');
        expect(count(html, 'id="nc-root"')).toBe(1);
        expect(region(html, 'footer')).toContain('Website');
    });

    it.each([
        ['info', 'status', 'alert', 'Information'],
        ['warning', 'alert', 'status', 'Warning'],
        ['critical', 'alert', 'status', 'Critical'],
    ] as const)('marks a %s notice with role=%s, data-level and a text label', async (level, role, other, label) => {
        const header = region(await renderShell(shell({ ...info, level })), 'header');
        expect(header).toContain(`data-level="${level}"`);
        expect(header).toContain(`role="${role}"`);
        expect(header).not.toContain(`role="${other}"`);
        expect(header).not.toMatch(/<header[^>]*role=/);
        expect(header).toContain(`${label}</span>`);
        expect(header).toContain('aria-hidden="true"');
        expect(header).toContain('Editor message');
    });

    it.each([
        ['de', 'Warnung', 'Editor-Links', 'Warning', 'Editor links'],
        ['de-AT', 'Warnung', 'Editor-Links', 'Warning', 'Editor links'],
        ['en', 'Warning', 'Editor links', 'Warnung', 'Editor-Links'],
        ['fr', 'Warning', 'Editor links', 'Warnung', 'Editor-Links'],
    ])('uses one language of built-in labels for lang=%s', async (lang, label, nav, otherLabel, otherNav) => {
        const html = await renderShell(shell({ ...info, level: 'warning' }), { lang });
        expect(region(html, 'header')).toContain(`${label}</span>`);
        expect(region(html, 'header')).not.toContain(otherLabel);
        expect(region(html, 'footer')).toContain(`aria-label="${nav}"`);
        expect(html).not.toContain(`aria-label="${otherNav}"`);
        expect(html).toContain(`lang="${lang}"`);
    });

    it('escapes editor text, labels and hrefs instead of emitting markup', async () => {
        const html = await renderShell(shell(
            { enabled: true, level: 'warning', message: '<script>alert(1)</script>',
                link: { label: '<b>Go</b>', href: '/x"onmouseover="alert(1)' } },
            [{ label: '<img src=x onerror=alert(1)>', href: '/y' }],
        ));
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(html).toContain('&lt;b&gt;Go&lt;/b&gt;');
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
        for (const raw of ['<script>alert(1)', '<b>Go', '<img', '"onmouseover="']) {
            expect(html).not.toContain(raw);
        }
    });

    it('renders the notice link only when both label and href are present', async () => {
        const linked = region(await renderShell(shell({ ...info, link: { label: 'Settings', href: 'https://example.com/a?b=1' } })), 'header');
        expect(linked).toMatch(/<a [^>]*href="https:\/\/example\.com\/a\?b=1"[^>]*>Settings<\/a>/);
        expect(linked).not.toContain('target=');
        const incomplete = [info, { ...info, link: { label: '', href: '/x' } }, { ...info, link: { label: 'Settings', href: '' } },
            { ...info, link: { label: 'Unsafe', href: 'javascript:alert(1)' } }, { ...info, link: { label: 'Unsafe', href: '/\\attacker.example' } }];
        for (const notice of incomplete) {
            expect(region(await renderShell(shell(notice)), 'header')).not.toContain('<a ');
        }
    });

    it('renders footer links in configured order, same-tab, inside a named nav', async () => {
        const footer = region(await renderShell(shell(info)), 'footer');
        const anchors = [...footer.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map((match) => [match[1], match[2]]);
        expect(anchors).toEqual([
            ['/', 'Website'],
            ['https://decapcms.org/features/?persona=editor', 'Decap features'],
            ['/version', 'Version'],
        ]);
        expect(footer).toMatch(/<nav [^>]*aria-label="Editor links"/);
        expect(footer).not.toContain('target=');
    });

    it('omits the footer when no safe links remain', async () => {
        const html = await renderShell(shell(info, [
            { label: 'Unsafe', href: 'javascript:alert(1)' },
            { label: '', href: '/version' },
        ]));
        expect(html).not.toContain('<footer');
    });
});

describe('AdminPage admin shell with the legacy config link', () => {
    it('keeps the pinned Decap release and config.yml link next to the shell', async () => {
        const html = await render({ admin: shell(info), decapVersion: '9.9.9' });
        expect(count(html, 'id="nc-root"')).toBe(1);
        expect(html).toContain('decap-cms@3.14.0');
        expect(html).toContain('href="/admin/config.yml"');
        expect(html).not.toContain('CMS_MANUAL_INIT');
    });
});

describe('AdminPage admin shell with manual init', () => {
    it('creates #nc-root before the manual-init flag, Decap and initCMS, and keeps script escaping', async () => {
        const html = await render({ config: { hint: '</script><b>' }, decapVersion: '3.15.0', admin: shell(info) });
        const root = html.indexOf('id="nc-root"');
        const flag = html.indexOf('window.CMS_MANUAL_INIT = true;');
        const decap = html.indexOf('decap-cms@3.15.0/dist/decap-cms.js');
        const init = html.indexOf('window.initCMS(');
        expect(root).toBeGreaterThan(-1);
        expect(root).toBeLessThan(flag);
        expect(flag).toBeLessThan(decap);
        expect(decap).toBeLessThan(init);
        expect(html).not.toContain('</script><b>');
        expect(html).toContain('\\u003c/script>');
    });
});

describe('AdminPage admin shell CSS contract', () => {
    const styles = async (): Promise<string> => compactCss(await render({ admin: shell(info) }));

    it('emits the shell stylesheet inside the head and marks <html> for page-level rules', async () => {
        const html = await render({ admin: shell(info) });
        expect(html.indexOf('<style')).toBeGreaterThan(-1);
        expect(html.indexOf('<style')).toBeLessThan(html.indexOf('</head>'));
        expect(html).toMatch(/<html[^>]*class="ew-admin-page"/);
    });

    it('bounds the shell to the dynamic viewport with a three-row grid and a single bounded column', async () => {
        const sheet = await styles();
        expect(sheet).toContain('block-size:100vh;block-size:100dvh;block-size:100dvb;');
        expect(sheet).toContain('grid-template-rows:auto minmax(0,1fr) auto;');
        expect(sheet).toContain('grid-template-columns:minmax(0,1fr);');
    });

    it('lets #nc-root own scrolling and pins each region to its row so a missing notice cannot shift it', async () => {
        const sheet = await styles();
        expect(sheet).toMatch(/\.ew-admin-root\{[^}]*grid-row:2;[^}]*min-block-size:0;[^}]*overflow:auto;/);
        expect(sheet).toMatch(/\.ew-admin-notice\{[^}]*grid-row:1;[^}]*max-block-size:25dvb;/);
        expect(sheet).toMatch(/\.ew-admin-footer\{[^}]*grid-row:3;[^}]*max-block-size:25dvb;/);
        expect(sheet).not.toContain(':has(');
    });

    it('removes page margin and page scroll while the shell is active', async () => {
        expect(await styles()).toContain('.ew-admin-page,.ew-admin-page body{margin:0;overflow:hidden;}');
    });

    it('reuses --ew-* tokens, with zero-specificity defaults taken from DESIGN.md', async () => {
        const sheet = await styles();
        expect(sheet).toContain(':where(.ew-admin-page){');
        for (const token of ['surface:#ffffff', 'surface-muted:#f3f4f6', 'on-surface:#111827', 'muted:#6b7280',
            'border:#d1d5db', 'primary:#2563eb', 'danger:#dc2626', 'accent:#f59e0b']) {
            expect(sheet).toContain(`--ew-${token};`);
        }
        for (const use of ['--ew-surface-muted', '--ew-space-3', '--ew-space-5', '--ew-radius-md', '--ew-text-sm']) {
            expect(sheet).toContain(`var(${use})`);
        }
    });

    it('gives links hover and focus-visible states, and wraps long text safely', async () => {
        const sheet = await styles();
        expect(sheet).toMatch(/\.ew-admin-footer__link:hover\{[^}]*background:var\(--ew-surface-muted\)/);
        expect(sheet).toMatch(/:focus-visible\{[^}]*outline:2px solid var\(--ew-primary\);[^}]*outline-offset:2px;/);
        expect(sheet).toMatch(/\.ew-admin-notice,\.ew-admin-footer\{[^}]*overflow-wrap:anywhere;/);
    });

    it('renders info normally, warning boldly, and critical boldly in danger text', async () => {
        const sheet = await styles();
        expect(sheet).toContain('.ew-admin-notice__label{');
        expect(sheet).toContain('font-weight:inherit;');
        expect(sheet).toContain('.ew-admin-notice[data-level="warning"],.ew-admin-notice[data-level="critical"]{font-weight:600;}');
        expect(sheet).toContain('.ew-admin-notice[data-level="critical"]{color:var(--ew-danger);}');
    });

    it('adds no shadows, motion, overlays, !important or colored state borders', async () => {
        const sheet = await styles();
        expect(sheet).toContain('.ew-admin-shell{');
        expect(sheet).not.toMatch(/box-shadow|animation|transition|@keyframes|!important/);
        expect(sheet).not.toMatch(/position:(?:fixed|sticky|absolute)/);
        expect(sheet).not.toMatch(/border-(?:inline|block)-(?:start|end):[^;]*(?:accent|danger|primary)/);
    });
});

describe('AdminPage without the admin prop', () => {
    const LEGACY = '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex"><title>Content Manager</title><link rel="cms-config-url" href="/admin/config.yml" type="text/yaml"></head><body><script src="https://unpkg.com/decap-cms@3.14.0/dist/decap-cms.js"></script></body></html>';
    const MANUAL = '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex"><title>Content Manager</title></head><body><script>window.CMS_MANUAL_INIT = true;</script><script src="https://unpkg.com/decap-cms@3.16.3/dist/decap-cms.js"></script><script>window.initCMS({ config: {"load_config_file":false,"collections":[]} });</script></body></html>';
    const CASES: [string, Record<string, unknown> | undefined, string][] = [
        ['legacy', undefined, LEGACY],
        ['manual config', { config: { load_config_file: false, collections: [] } }, MANUAL],
    ];

    it.each(CASES)('renders the unchanged %s document, also with admin explicitly undefined', async (_mode, props, expected) => {
        expect(normalizeHtml(await render(props))).toBe(expected);
        expect(normalizeHtml(await render({ ...props, admin: undefined }))).toBe(expected);
    });

    it.each(CASES)('emits no shell markup, styles or classes in %s mode', async (_mode, props) => {
        const html = await render(props);
        for (const artifact of ['ew-admin', 'nc-root', '<style', '<header', '<main', '<footer', 'class=']) {
            expect(html).not.toContain(artifact);
        }
    });
});
