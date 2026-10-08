import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { ImageMetadata } from 'astro';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import Footer from '../Footer.astro';
import Header from '../Header.astro';
import HeaderCentered from '../HeaderCentered.astro';
import HeaderFlyout from '../HeaderFlyout.astro';
import HeaderHideOnScroll from '../HeaderHideOnScroll.astro';
import LanguageSwitch from '../LanguageSwitch.astro';
import PageShell from '../PageShell.astro';
import ThemeToggle from '../ThemeToggle.astro';
import { resolveLabels } from '../labels';

// Pinned literally on purpose: expectations derived from labels.ts would let a
// wrong dictionary value pass.
const german = {
  mainNavigation: 'Hauptnavigation',
  toggleNavigationMenu: 'Navigationsmenü umschalten',
  toggleColorTheme: 'Farbschema wechseln (Darkmode)',
  skipToMainContent: 'Zum Hauptinhalt springen',
  legal: 'Rechtliches',
  switchToEn: 'Wechseln zu en',
};
const english = resolveLabels('en');

async function render(
  component: AstroComponentFactory,
  props: Record<string, unknown>,
  slots?: Record<string, string>,
): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(component, { props, slots });
}

const headerProps = {
  siteName: 'Example Site',
  navItems: [
    { label: 'Home', href: '/' },
    { label: 'Kontakt', href: '/kontakt/' },
  ],
  currentLang: 'de',
  pathname: '/',
  alternateHref: '/en/',
  locales: ['de', 'en'],
};

const headerVariants = [
  ['Header', Header],
  ['HeaderCentered', HeaderCentered],
  ['HeaderHideOnScroll', HeaderHideOnScroll],
  ['HeaderFlyout', HeaderFlyout],
] as const;

const footerProps = {
  siteName: 'Example Site',
  legalLinks: [
    { label: 'Impressum', href: '/impressum/' },
    { label: 'Datenschutz', href: '/datenschutz/' },
  ],
};

describe('resolveLabels', () => {
  it('defaults to English and falls back to it for unknown languages', () => {
    expect(resolveLabels()).toEqual(english);
    expect(resolveLabels('fr')).toEqual(english);
  });

  it('returns the German dictionary for de, with overrides winning per key', () => {
    const labels = resolveLabels('de', { legal: 'Impressum und Datenschutz' });
    expect(labels.legal).toBe('Impressum und Datenschutz');
    expect(labels.mainNavigation).toBe(german.mainNavigation);
    expect(labels.switchToLanguage('en')).toBe(german.switchToEn);
  });
});

describe('header family', () => {
  it.each(headerVariants)('%s renders the German labels with lang="de"', async (_name, component) => {
    const html = await render(component, { ...headerProps, lang: 'de' });
    expect(html).toContain(`aria-label="${german.mainNavigation}"`);
    expect(html).toContain(`aria-label="${german.toggleNavigationMenu}"`);
    // lang reaches the fallback actions as well.
    expect(html).toContain(`aria-label="${german.toggleColorTheme}"`);
    expect(html).toContain(`aria-label="${german.switchToEn}"`);
    expect(html).not.toContain(english.mainNavigation);
    expect(html).not.toContain(english.toggleNavigationMenu);
  });

  it('lets labels override a key and menuLabel override the menu label', async () => {
    const html = await render(Header, {
      ...headerProps,
      lang: 'de',
      labels: { mainNavigation: 'Seitennavigation' },
      menuLabel: 'Menü',
    });
    expect(html).toContain('aria-label="Seitennavigation"');
    expect(html).toContain('aria-label="Menü"');
    expect(html).not.toContain(german.toggleNavigationMenu);
  });

  it('renders an Image logo through Media with its own alt text', async () => {
    const html = await render(Header, { ...headerProps, logo: { src: '/brand.svg', alt: 'Brand mark' } });
    const img = html.match(/<img\b[^>]*>/)?.[0] ?? '';
    expect(img).toContain('src="/brand.svg"');
    expect(img).toContain('alt="Brand mark"');
    expect(img).toContain('class="ew-header__logo"');
  });

  it('renders an ImageMetadata logo with a srcset', async () => {
    const asset: ImageMetadata = { src: '/src/assets/logo.png', width: 1600, height: 400, format: 'png' };
    const html = await render(HeaderFlyout, { ...headerProps, logo: { src: asset, alt: 'Brand mark' } });
    const img = html.match(/<img\b[^>]*>/)?.[0] ?? '';
    expect(img).toContain('srcset=');
    expect(img).toContain('alt="Brand mark"');
  });

  it('keeps the header scope on a string logo so its scoped styles still apply', async () => {
    const html = await render(Header, { ...headerProps, logo: '/logo.png' });
    const scope = html.match(/<header\b[^>]*\s(data-astro-cid-[a-z0-9]+)/)?.[1];
    const img = html.match(/<img\b[^>]*>/)?.[0] ?? '';
    expect(scope).toBeDefined();
    expect(img).toContain(scope);
  });

  it('renders the site name and no img when the logo is empty', async () => {
    const html = await render(HeaderCentered, { ...headerProps, logo: '' });
    expect(html).not.toContain('<img');
    expect(html).toContain('Example Site');
  });
});

describe('ThemeToggle', () => {
  it('renders the German label for both aria-label and title with lang="de"', async () => {
    const html = await render(ThemeToggle, { lang: 'de' });
    expect(html).toContain(`aria-label="${german.toggleColorTheme}"`);
    expect(html).toContain(`title="${german.toggleColorTheme}"`);
  });

  it('keeps the explicit label prop ahead of lang', async () => {
    const html = await render(ThemeToggle, { lang: 'de', label: 'Design wechseln' });
    expect(html).toContain('aria-label="Design wechseln"');
    expect(html).not.toContain(german.toggleColorTheme);
  });
});

describe('PageShell', () => {
  it('uses the German skip-link text with lang="de"', async () => {
    const html = await render(PageShell, { lang: 'de' }, { default: '<p>Body</p>' });
    expect(html).toMatch(new RegExp(`<a class="ew-skip-link"[^>]*>${german.skipToMainContent}</a>`));
  });

  it('keeps an explicit skipLabel ahead of lang', async () => {
    const html = await render(PageShell, { lang: 'de', skipLabel: 'Direkt zum Inhalt' });
    expect(html).toMatch(/<a class="ew-skip-link"[^>]*>Direkt zum Inhalt<\/a>/);
  });
});

describe('Footer', () => {
  it('labels the legal navigation in German with lang="de"', async () => {
    const html = await render(Footer, { ...footerProps, lang: 'de' });
    expect(html).toMatch(new RegExp(`<nav class="ew-footer__legal" aria-label="${german.legal}"`));
  });

  it('renders the actions slot inside the inner row, after the legal navigation', async () => {
    const html = await render(Footer, footerProps, {
      actions: '<button type="button" class="site-toggle">Toggle</button>',
    });
    const inner = html.indexOf('class="ew-footer__inner"');
    const legal = html.indexOf('class="ew-footer__legal"');
    const actions = html.indexOf('class="ew-footer__actions"');
    expect(inner).toBeGreaterThan(-1);
    expect(legal).toBeGreaterThan(inner);
    expect(actions).toBeGreaterThan(legal);
    // The slot content sits in the actions wrapper, which closes the inner row.
    expect(html.slice(actions).replace(/\s+/g, ' ')).toMatch(
      /^class="ew-footer__actions"[^>]*> ?<button type="button" class="site-toggle">Toggle<\/button> ?<\/div> ?<\/div> ?<\/footer>/,
    );
  });

  it('renders neither actions nor columns wrappers when both are unused', async () => {
    const html = await render(Footer, footerProps);
    expect(html).not.toContain('ew-footer__actions');
    expect(html).not.toContain('ew-footer__columns');
  });

  it('renders link columns before the copyright and legal row', async () => {
    const html = await render(Footer, {
      ...footerProps,
      columns: [
        { title: 'Verein', links: [{ label: 'Training', href: '/training/' }] },
        { links: [{ label: 'Verband', href: 'https://example.org/', external: true }] },
      ],
    });
    const columns = html.indexOf('class="ew-footer__columns"');
    expect(columns).toBeGreaterThan(-1);
    expect(columns).toBeLessThan(html.indexOf('class="ew-footer__inner"'));
    expect(html.match(/class="ew-footer__column"/g)).toHaveLength(2);
    expect(html.match(/class="ew-footer__column-title"/g)).toHaveLength(1);
    expect(html).toMatch(/<h2 class="ew-footer__column-title"[^>]*>Verein<\/h2>/);
    expect(html).toMatch(/<a href="\/training\/" class="ew-footer__link"[^>]*>Training<\/a>/);
    expect(html).toMatch(/<a href="https:\/\/example\.org\/" class="ew-footer__link" rel="external"[^>]*>Verband<\/a>/);
  });
});

describe('LanguageSwitch', () => {
  it('names the derived link in German with lang="de"', async () => {
    const html = await render(LanguageSwitch, { currentLang: 'de', pathname: '/kontakt/', lang: 'de' });
    expect(html).toContain(`aria-label="${german.switchToEn}"`);
  });

  it('renders one link per alternate', async () => {
    const html = await render(LanguageSwitch, {
      currentLang: 'de',
      pathname: '/',
      alternates: [
        { lang: 'en', href: '/en/' },
        { lang: 'fr', href: '/fr/', label: 'Français' },
      ],
    });
    const links = html.match(/<a\b[^>]*class="ew-lang-switch"[^>]*>[^<]*<\/a>/g) ?? [];
    expect(links).toHaveLength(2);
    expect(links[0]).toMatch(/href="\/en\/"/);
    expect(links[0]).toMatch(/hreflang="en"/);
    expect(links[0]).toMatch(/aria-label="Switch to en"/);
    expect(links[0]).toMatch(/>\s*EN\s*<\/a>$/);
    expect(links[1]).toMatch(/href="\/fr\/"/);
    expect(links[1]).toMatch(/hreflang="fr"/);
    // The accessible name contains the visible label (WCAG 2.5.3).
    expect(links[1]).toMatch(/aria-label="Switch to Français"/);
    expect(links[1]).toMatch(/>\s*Français\s*<\/a>$/);
  });
});
