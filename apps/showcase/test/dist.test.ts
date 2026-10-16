import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

// Assertions over the built site. Build first: `pnpm --filter showcase build`.
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const base = '/easy-web/';

const read = (file: string): string => readFileSync(file, 'utf8');
const page = (route: string): string => read(join(dist, route, 'index.html'));
const label = (file: string): string => relative(dist, file);

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

const imgTags = (html: string): string[] => html.match(/<img\b[^>]*>/g) ?? [];
const attribute = (tag: string, name: string): string | undefined =>
  tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const hasAttribute = (tag: string, name: string): boolean => new RegExp(`\\s${name}(?:=|[\\s>])`).test(tag);
/** astro:assets serves processed ImageMetadata sources from `_astro/`. */
const isAsset = (tag: string): boolean => (attribute(tag, 'src') ?? '').startsWith(`${base}_astro/`);
const isPublicImage = (tag: string): boolean => (attribute(tag, 'src') ?? '').startsWith(`${base}images/`);
/** The dist/ file behind a URL the site serves. */
const fileFor = (url: string): string => join(dist, decodeURI(url.slice(base.length)));

/** Each lightbox: its root section plus the inline controller script right after it. */
function lightboxes(html: string): string[] {
  return [...html.matchAll(/<section\b[^>]*\sdata-lightbox-root[\s>]/g)].map((match) => {
    const sectionEnd = html.indexOf('</section>', match.index) + '</section>'.length;
    const scriptEnd = html.indexOf('</script>', sectionEnd) + '</script>'.length;
    expect(html.slice(sectionEnd, scriptEnd).trimStart().startsWith('<script')).toBe(true);
    return html.slice(match.index, scriptEnd);
  });
}

/** Thumbnails of a lightbox, without its (empty) modal image. */
const thumbnails = (markup: string): string[] => imgTags(markup).filter((tag) => !tag.includes('ew-lightbox__img'));

// Literal strings, not resolveLabels(): a changed dictionary entry must fail here.
// [German, English], each rendered as an attribute value.
const builtInLabels: readonly (readonly [string, string])[] = [
  ['Hauptnavigation', 'Main navigation'],
  ['Navigationsmenü umschalten', 'Toggle navigation menu'],
  ['Farbschema wechseln (Darkmode)', 'Toggle color theme (Darkmode)'],
  ['Wechseln zu en', 'Switch to de'],
  ['Rechtliches', 'Legal'],
  ['Karussell', 'carousel'],
  ['Folie', 'slide'],
  ['Bilderkarussell', 'Image carousel'],
  ['Hero-Slider', 'Hero slider'],
  ['Vorherige Folie', 'Previous slide'],
  ['Nächste Folie', 'Next slide'],
  ['Foliennavigation', 'Slide navigation'],
  ['Zu Folie 1', 'Go to slide 1'],
  ['Bildansicht', 'Image lightbox'],
  ['Bildansicht schließen', 'Close lightbox'],
  ['Vorheriges Bild', 'Previous image'],
  ['Nächstes Bild', 'Next image'],
];

describe('showcase dist', () => {
  beforeAll(() => {
    if (!existsSync(join(dist, 'components', 'index.html'))) {
      throw new Error('dist/ has no components page: run `pnpm --filter showcase build` before this test.');
    }
  });

  it('demonstrates both media kinds on /components', () => {
    // Given the built component gallery
    const tags = imgTags(page('components'));

    // Then it renders local assets and public paths
    expect(tags.filter(isAsset).length).toBeGreaterThan(0);
    expect(tags.filter(isPublicImage).length).toBeGreaterThan(0);
  });

  it('gives every ImageMetadata image a srcset and sizes whose files exist', () => {
    for (const file of htmlFiles(dist)) {
      for (const tag of imgTags(read(file)).filter(isAsset)) {
        const srcset = attribute(tag, 'srcset');
        expect(srcset, `${label(file)}: ${tag}`).toBeTruthy();
        expect(attribute(tag, 'sizes'), `${label(file)}: ${tag}`).toBeTruthy();
        for (const candidate of (srcset ?? '').split(',')) {
          const url = candidate.trim().split(/\s+/)[0] ?? '';
          expect(existsSync(fileFor(url)), `${label(file)}: ${url}`).toBe(true);
        }
      }
    }
  });

  it('renders every string image as a plain img without srcset', () => {
    for (const file of htmlFiles(dist)) {
      for (const tag of imgTags(read(file)).filter((tag) => !isAsset(tag))) {
        expect(hasAttribute(tag, 'srcset'), `${label(file)}: ${tag}`).toBe(false);
      }
    }
  });

  it('serves every public image path the pages reference', () => {
    for (const file of htmlFiles(dist)) {
      for (const tag of imgTags(read(file)).filter(isPublicImage)) {
        const src = attribute(tag, 'src') ?? '';
        expect(existsSync(fileFor(src)), `${label(file)}: ${src}`).toBe(true);
      }
    }
  });

  it('never prints [object Object]', () => {
    for (const file of htmlFiles(dist)) {
      expect(read(file), label(file)).not.toContain('[object Object]');
    }
  });

  it('ships the lightboxes without a JSON payload', () => {
    // Given the lightboxes on /components
    const markups = lightboxes(page('components'));

    // Then there is one lightbox of local assets and one of public paths
    expect(markups.some((markup) => thumbnails(markup).length > 0 && thumbnails(markup).every(isAsset))).toBe(true);
    expect(markups.some((markup) => thumbnails(markup).length > 0 && thumbnails(markup).every(isPublicImage))).toBe(true);

    // And none of them serializes its items: the controller reads the live thumbnail
    for (const markup of markups) {
      expect(markup).not.toContain('application/json');
      expect(markup).not.toContain('data-lightbox-items');
      expect(markup).not.toMatch(/JSON\.(?:parse|stringify)/);
      expect(markup).not.toMatch(/"(?:src|alt|title|description|caption)"\s*:/);
      expect(markup).toContain('thumbnail.currentSrc || thumbnail.src');
    }
  });

  it('renders the German built-in labels on /de/components', () => {
    // Given the German component gallery
    const html = page('de/components');

    // Then every component that takes lang="de" speaks German, and none falls back to English
    expect(html).toContain('>Zum Hauptinhalt springen<');
    expect(html).toMatch(/aria-label="[^"]+ öffnen"/);
    for (const [german, english] of builtInLabels) {
      expect(html, german).toContain(`="${german}"`);
      expect(html, english).not.toContain(`="${english}"`);
    }
    expect(html).not.toContain('>Skip to main content<');
    expect(html).not.toMatch(/aria-label="Open [^"]+"/);
  });

  it('keeps the English built-in labels on /components', () => {
    const html = page('components');

    expect(html).toContain('>Skip to main content<');
    expect(html).toMatch(/aria-label="Open [^"]+"/);
    for (const [german, english] of builtInLabels) {
      expect(html, english).toContain(`="${english}"`);
      expect(html, german).not.toContain(`="${german}"`);
    }
  });

  const homeAndGuidePages = ['', 'guide', 'de', 'de/guide'] as const;
  const html404 = (): string => read(join(dist, '404.html'));
  const internalLinks = (html: string): string[] => [...html.matchAll(/\shref="(\/[^"]*)"/g)].map((match) => match[1] ?? '');

  it('carries no stale prerequisite or component-count copy', () => {
    for (const route of homeAndGuidePages) {
      const html = page(route);

      expect(html, `${route}: Node.js 18`).not.toContain('Node.js 18');
      expect(html, `${route}: component count`).not.toMatch(/16\+|über 16/);
    }
  });

  it('publishes minimal human-readable build information without an indexable JSON file', () => {
    const html = page('version');
    const sitemap = read(join(dist, 'sitemap-0.xml'));
    const robots = read(join(dist, 'robots.txt'));

    expect(html).toContain('<meta name="robots" content="noindex,nofollow"');
    expect(html).toContain('easy-web showcase');
    expect(html).toMatch(/<dd\b[^>]*>\d+\.\d+\.\d+/);
    expect(html).toContain('@easy-web/core');
    expect(html).toContain('Individual UI components are not independently versioned.');
    expect(html).not.toContain('Machine-readable build information (JSON)');
    expect(existsSync(join(dist, 'version.json'))).toBe(false);
    expect(sitemap).not.toMatch(/\/version(?:[/.<])/);
    expect(robots).not.toMatch(/Disallow: \/version/);
  });

  it('recommends Node.js 24 with Astro 7 and links the Node.js 22 with Astro 6 floor on both guides', () => {
    for (const route of ['guide', 'de/guide']) {
      const html = page(route);

      expect(html, route).toContain('Node.js 24');
      expect(html, route).toMatch(/Astro[ -]7/);
      expect(html, route).toContain('Node.js 22');
      expect(html, route).toContain('Astro 6');
      expect(html, route).toContain(`href="${base}docs/architecture/technology-map/"`);
    }
  });

  it('renders the long-form guides with the core Prose component', () => {
    for (const route of ['guide', 'de/guide']) {
      expect(page(route), route).toContain('class="ew-prose');
    }
  });

  it('renders the 404 page through the core NotFound component', () => {
    // Given the built 404 page
    const html = html404();

    // Then its body is the shared NotFound block, with a way home and into the other language
    expect(html).toContain('data-testid="not-found"');
    expect(html).toContain('<h1 class="ew-not-found__heading"');
    expect(html).toContain(`<a href="${base}" class="ew-not-found__link"`);
    expect(html).toContain(`<a href="${base}de/" class="ew-not-found__alt-link"`);

    // And the bespoke markup it replaced is gone
    expect(html).not.toContain('class="not-found"');
  });

  it('links every internal href through the site base', () => {
    const rendered: [string, string][] = [...homeAndGuidePages.map((route): [string, string] => [route || 'home', page(route)]), ['404', html404()]];

    for (const [route, html] of rendered) {
      expect(
        internalLinks(html).filter((url) => !url.startsWith(base)),
        route,
      ).toEqual([]);
    }
  });

  it('keeps each language on its own pages where a translation exists', () => {
    // Given the English home page: its gallery and guide links stay English
    const english = page('');
    expect(english).toContain(`href="${base}components/"`);
    expect(english).toContain(`href="${base}guide/"`);
    expect(english).not.toContain(`href="${base}de/components/"`);
    expect(english).not.toContain(`href="${base}de/guide/"`);

    // And the German home page links the German gallery and guide
    const germanHome = page('de');
    expect(germanHome).toContain(`href="${base}de/components/"`);
    expect(germanHome).toContain(`href="${base}de/guide/"`);
    expect(germanHome).not.toContain(`href="${base}components/"`);
    expect(germanHome).not.toContain(`href="${base}guide/"`);

    // And the German guide sends its next-step card to the German gallery
    const germanGuide = page('de/guide');
    expect(germanGuide).toContain(`href="${base}de/components/"`);
    expect(germanGuide).not.toContain(`href="${base}components/"`);
  });
});
