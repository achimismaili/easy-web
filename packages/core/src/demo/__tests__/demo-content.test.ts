import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import DemoLegalShell from '../../components/DemoLegalShell.astro';
import { parseContentComposition } from '../../contracts/index.js';
import {
  canonicalHash,
  createFixedClock,
  generateDemoContent,
  validateDemoContent,
  type DemoContent,
} from '../demo-content.js';
import { DEMO_DISCLAIMER, generateDemoLegalShells, validateDemoLegalShell } from '../legal-shells.js';

const composition = parseContentComposition({
  contentLocales: ['de', 'en'],
  contentTypes: [
    {
      id: 'catalog-item', primary: true,
      labels: { de: 'Produkte', en: 'Products' },
      routes: { de: '/produkte/', en: '/en/products/' },
      traits: ['title', 'slug', 'summary', 'body', 'image', 'photos', 'cta', 'money', 'featured', 'publication', 'schedule', 'location', 'taxonomy', 'order'],
      bindings: ['homepage', 'list', 'detail'],
      currency: 'EUR',
    },
  ],
});

const gen = () => generateDemoContent(composition, { clock: createFixedClock() });

describe('demo content', () => {
  it('is deterministic with a fixed clock', () => {
    expect(canonicalHash(gen())).toBe(canonicalHash(gen()));
    expect(JSON.stringify(gen())).toBe(JSON.stringify(gen()));
  });

  it('changes when the clock changes', () => {
    const other = generateDemoContent(composition, { clock: createFixedClock('2027-05-05T00:00:00.000Z') });
    expect(canonicalHash(other)).not.toBe(canonicalHash(gen()));
  });

  it('gives every asset alt, provenance and license', () => {
    const content = gen();
    expect(content.assets.length).toBeGreaterThan(0);
    validateDemoContent(content);
    for (const a of content.assets) {
      expect(a.alt).not.toBe('');
      expect(a.provenance).toMatch(/license/i);
      expect(a.license).toBeTruthy();
    }
  });

  it('contains no private-looking data', () => {
    const c = gen();
    // The SVG xmlns namespace URI is the one legitimate URL; it is excluded.
    expect(JSON.stringify({ items: c.items, assets: c.assets.map(({ svg: _s, ...r }) => r) })).not.toMatch(/@|https?:|www\.|\.(de|com)\b/i);
  });

  it('rejects an unlicensed image', () => {
    const c = gen();
    const bad: DemoContent = { ...c, assets: [{ ...c.assets[0]!, license: undefined as never }, ...c.assets.slice(1)] };
    expect(() => validateDemoContent(bad)).toThrow(/license/);
  });

  it('rejects missing alt text', () => {
    const c = gen();
    const bad: DemoContent = { ...c, assets: [{ ...c.assets[0]!, alt: '' }, ...c.assets.slice(1)] };
    expect(() => validateDemoContent(bad)).toThrow(/alt/);
  });

  it('rejects a private-looking id, email and domain', () => {
    for (const leak of ['9f1c2d3e-1111-4222-8333-444455556666', 'jane@example.com', 'acme.com']) {
      const c = gen();
      const item = { ...c.items[0]!, data: { ...c.items[0]!.data, title: leak } };
      expect(() => validateDemoContent({ ...c, items: [item, ...c.items.slice(1)] })).toThrow(/Private/);
    }
  });

  it('never calls the real clock in demo sources', () => {
    const dir = join(__dirname, '..');
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
      const src = readFileSync(join(dir, f), 'utf8');
      expect(src, f).not.toMatch(/Date\.now\(|new Date\(\s*\)/);
    }
  });
});

describe('demo legal shells', () => {
  it('renders the disclaimer prominently in en and de', async () => {
    const container = await AstroContainer.create();
    for (const shell of generateDemoLegalShells(['de', 'en'])) {
      validateDemoLegalShell(shell);
      const html = await container.renderToString(DemoLegalShell, { props: { shell } });
      expect(html).toContain(shell.disclaimer);
      expect(html).toContain('data-demo-disclaimer');
    }
    expect(DEMO_DISCLAIMER.en).toMatch(/SAMPLE CONTENT - INCOMPLETE/);
  });

  it('rejects a shell without disclaimer and has no private data', () => {
    const [shell] = generateDemoLegalShells(['en']);
    expect(() => validateDemoLegalShell({ ...shell!, disclaimer: '' })).toThrow(/disclaimer/);
    expect(JSON.stringify(generateDemoLegalShells(['de', 'en']))).not.toMatch(/@|https?:|www\./i);
  });
});

