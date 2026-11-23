import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AstroConfig } from 'astro';
import { afterEach, describe, expect, it } from 'vitest';
import { synchronizeRenderedSitemapAlternates } from '../rendered-sitemap-alternates.js';

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

function html(locale: string, canonical: string, alternates: Readonly<Record<string, string>>): string {
  const links = Object.entries(alternates).map(([lang, href]) =>
    `<link rel="alternate" hreflang="${lang}" href="${href}"/>`,
  ).join('');
  return `<!doctype html><html lang="${locale}"><head><link rel="canonical" href="${canonical}"/>${links}</head><body></body></html>`;
}

async function fixture() {
  root = await mkdtemp(join(tmpdir(), 'easy-web-sitemap-locales-'));
  await mkdir(join(root, 'beitraege', 'beispiel'), { recursive: true });
  await mkdir(join(root, 'entries', 'example'), { recursive: true });
  const de = 'https://example.test/docs/beitraege/beispiel/';
  const en = 'https://example.test/docs/entries/example/';
  const alternates = { de, en, 'x-default': de };
  await writeFile(join(root, 'beitraege', 'beispiel', 'index.html'), html('de', de, alternates));
  await writeFile(join(root, 'entries', 'example', 'index.html'), html('en', en, alternates));
  await writeFile(join(root, 'sitemap-0.xml'), `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"><url><loc>${de}</loc></url><url><loc>${en}</loc></url></urlset>`);
  const config = {
    site: new URL('https://example.test'),
    base: '/docs',
    trailingSlash: 'always',
    build: { format: 'directory' },
  } as AstroConfig;
  return { config, de, en };
}

describe('rendered sitemap alternates', () => {
  it('copies reciprocal, built head alternates into the sitemap with base paths', async () => {
    const { config, de, en } = await fixture();
    await synchronizeRenderedSitemapAlternates(pathToFileURL(`${root}${sep}`), config, ['de', 'en'], 'de');
    const sitemap = await readFile(join(root, 'sitemap-0.xml'), 'utf8');
    expect(sitemap).toContain(`<xhtml:link rel="alternate" hreflang="de" href="${de}"/>`);
    expect(sitemap).toContain(`<xhtml:link rel="alternate" hreflang="en" href="${en}"/>`);
    expect(sitemap).not.toContain('hreflang="x-default"');
    expect(sitemap.match(/hreflang="de"/g)).toHaveLength(2);
    expect(sitemap.match(/hreflang="en"/g)).toHaveLength(2);
  });

  it('removes sitemap alternates that are not present in the rendered page head', async () => {
    const { config, en } = await fixture();
    const untranslated = 'https://example.test/docs/beitraege/only-in-de/';
    await mkdir(join(root, 'beitraege', 'only-in-de'), { recursive: true });
    await writeFile(join(root, 'beitraege', 'only-in-de', 'index.html'), html('de', untranslated, {}));
    const sitemapPath = join(root, 'sitemap-0.xml');
    const sitemap = await readFile(sitemapPath, 'utf8');
    const autoPaired = `<url><loc>${untranslated}</loc><xhtml:link rel="alternate" hreflang="en" href="${en}"/></url>`;
    await writeFile(sitemapPath, sitemap.replace('</urlset>', `${autoPaired}</urlset>`));

    await synchronizeRenderedSitemapAlternates(pathToFileURL(`${root}${sep}`), config, ['de', 'en'], 'de');

    const updated = await readFile(sitemapPath, 'utf8');
    const entry = updated.match(/<url>[\s\S]*?<\/url>/g)?.find((block) => block.includes(untranslated));
    expect(entry).toContain(`<loc>${untranslated}</loc>`);
    expect(entry).not.toContain('xhtml:link');
  });

  it('rejects alternates to missing built pages and non-reciprocal locale groups', async () => {
    const { config, de, en } = await fixture();
    await writeFile(join(root, 'entries', 'example', 'index.html'), html('en', en, { en }));
    await expect(synchronizeRenderedSitemapAlternates(pathToFileURL(`${root}${sep}`), config, ['de', 'en'], 'de'))
      .rejects.toThrow('not reciprocal');
    const missing = 'https://example.test/docs/missing/';
    await writeFile(join(root, 'beitraege', 'beispiel', 'index.html'), html('de', de, { de: missing, en: missing }));
    await writeFile(join(root, 'entries', 'example', 'index.html'), html('en', en, { de: missing, en: missing }));
    await expect(synchronizeRenderedSitemapAlternates(pathToFileURL(`${root}${sep}`), config, ['de', 'en'], 'de'))
      .rejects.toThrow('no built canonical page');
  });

  it('rejects URLs outside the configured site or base path', async () => {
    const { config, de, en } = await fixture();
    const outsideOrigin = 'https://outside.test/docs/beitraege/beispiel/';
    await writeFile(join(root, 'beitraege', 'beispiel', 'index.html'), html('de', de, { de, en: outsideOrigin }));
    await writeFile(join(root, 'entries', 'example', 'index.html'), html('en', en, { de, en: outsideOrigin }));
    await expect(synchronizeRenderedSitemapAlternates(pathToFileURL(`${root}${sep}`), config, ['de', 'en'], 'de'))
      .rejects.toThrow('configured site origin');
    const outsideBase = 'https://example.test/beitraege/beispiel/';
    await writeFile(join(root, 'beitraege', 'beispiel', 'index.html'), html('de', de, { de, en: outsideBase }));
    await writeFile(join(root, 'entries', 'example', 'index.html'), html('en', en, { de, en: outsideBase }));
    await expect(synchronizeRenderedSitemapAlternates(pathToFileURL(`${root}${sep}`), config, ['de', 'en'], 'de'))
      .rejects.toThrow('outside the configured base path');
  });

  it('rejects canonical URLs that do not identify their built page', async () => {
    const { config, de, en } = await fixture();
    const wrongCanonical = 'https://example.test/docs/entries/example/';
    await writeFile(join(root, 'beitraege', 'beispiel', 'index.html'), html('de', wrongCanonical, { de, en }));
    await expect(synchronizeRenderedSitemapAlternates(pathToFileURL(`${root}${sep}`), config, ['de', 'en'], 'de'))
      .rejects.toThrow('does not match built page');
  });

  it('matches file-format pages and sitemap URLs with a base path and no trailing slash', async () => {
    root = await mkdtemp(join(tmpdir(), 'easy-web-sitemap-file-locales-'));
    await mkdir(join(root, 'beitraege'), { recursive: true });
    await mkdir(join(root, 'entries'), { recursive: true });
    const de = 'https://example.test/docs/beitraege/beispiel';
    const en = 'https://example.test/docs/entries/example';
    const alternates = { de, en, 'x-default': de };
    await writeFile(join(root, 'beitraege', 'beispiel.html'), html('de', de, alternates));
    await writeFile(join(root, 'entries', 'example.html'), html('en', en, alternates));
    await writeFile(join(root, 'sitemap-0.xml'), `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"><url><loc>${de}</loc></url><url><loc>${en}</loc></url></urlset>`);
    const config = {
      site: new URL('https://example.test'),
      base: '/docs',
      trailingSlash: 'never',
      build: { format: 'file' },
    } as AstroConfig;

    await synchronizeRenderedSitemapAlternates(pathToFileURL(`${root}${sep}`), config, ['de', 'en'], 'de');
    const sitemap = await readFile(join(root, 'sitemap-0.xml'), 'utf8');
    expect(sitemap).toContain(`<xhtml:link rel="alternate" hreflang="de" href="${de}"/>`);
    expect(sitemap).toContain(`<xhtml:link rel="alternate" hreflang="en" href="${en}"/>`);
  });
});
