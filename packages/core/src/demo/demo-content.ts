import {
  composeContentTraitSchema,
  type ContentComposition,
  type ContentTrait,
  type ContentTypeDefinition,
} from '../contracts/index.js';

/** Injected time source. The generator never reads the real clock. */
export interface DemoClock {
  now(): Date;
}

export const DEMO_FIXED_INSTANT = '2026-01-01T00:00:00.000Z';

export function createFixedClock(iso: string = DEMO_FIXED_INSTANT): DemoClock {
  const fixed = new Date(iso);
  if (Number.isNaN(fixed.getTime())) throw new Error(`Invalid fixed clock instant: ${iso}`);
  return { now: () => new Date(fixed.getTime()) };
}

export const DEMO_LICENSES = ['CC0-1.0', 'internal-placeholder-not-for-production'] as const;
export type DemoLicense = (typeof DEMO_LICENSES)[number];

export interface DemoAsset {
  readonly src: string;
  readonly alt: string;
  readonly provenance: string;
  readonly license: DemoLicense;
  readonly svg: string;
}

export interface DemoContentItem {
  readonly contentTypeId: string;
  readonly locale: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface DemoContent {
  readonly generatedAt: string;
  readonly items: readonly DemoContentItem[];
  readonly assets: readonly DemoAsset[];
}

export interface GenerateDemoContentOptions {
  readonly clock: DemoClock;
  readonly itemsPerType?: number;
}

const COPY = {
  de: { name: 'Beispiel', body: 'Platzhaltertext fuer Beispielinhalte. Nicht fuer den Produktivbetrieb.', location: 'Beispielort', cta: 'Mehr erfahren', tag: 'Beispiel', alt: 'Neutraler Platzhalter, graue Flaeche', provenance: 'Platzhalter, automatisch erzeugt' },
  en: { name: 'Sample', body: 'Placeholder text for sample content. Not for production use.', location: 'Sample Location', cta: 'Learn more', tag: 'Sample', alt: 'Neutral placeholder, grey rectangle', provenance: 'Placeholder, generated automatically' },
} as const;

function copyFor(locale: string) {
  return locale.toLowerCase().startsWith('de') ? COPY.de : COPY.en;
}

function placeholderSvg(index: number): string {
  const shade = 200 + ((index * 7) % 40);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="rgb(${shade},${shade},${shade})"/></svg>`;
}

function makeAsset(locale: string, typeId: string, index: number): DemoAsset {
  const copy = copyFor(locale);
  return {
    src: `/demo/${typeId}-${locale}-${index + 1}.svg`,
    alt: `${copy.alt} ${index + 1}`,
    provenance: `${copy.provenance}; license: CC0-1.0`,
    license: 'CC0-1.0',
    svg: placeholderSvg(index),
  };
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

function buildItem(
  type: ContentTypeDefinition,
  locale: string,
  index: number,
  base: Date,
  assets: DemoAsset[],
): Record<string, unknown> {
  const copy = copyFor(locale);
  const n = index + 1;
  const traits = new Set<ContentTrait>(type.traits);
  const data: Record<string, unknown> = {};
  const nextAsset = (): DemoAsset => {
    const asset = makeAsset(locale, type.id, assets.length);
    assets.push(asset);
    return asset;
  };
  if (traits.has('title')) data.title = `${copy.name} ${n}`;
  if (traits.has('slug')) data.slug = `sample-${n}`;
  if (traits.has('summary')) data.summary = `${copy.name} ${n}`;
  if (traits.has('body')) data.body = copy.body;
  if (traits.has('image')) {
    const a = nextAsset();
    data.image = { src: a.src, alt: a.alt };
  }
  if (traits.has('photos')) {
    data.photos = [0, 1].map(() => {
      const a = nextAsset();
      return { src: a.src, alt: a.alt };
    });
  }
  if (traits.has('order')) data.order = n;
  if (traits.has('taxonomy')) data.taxonomy = [copy.tag];
  if (traits.has('publication')) data.publishDate = addDays(base, -n);
  if (traits.has('schedule')) data.startDate = addDays(base, n * 7);
  if (traits.has('location')) data.location = copy.location;
  if (traits.has('cta')) data.cta = { label: copy.cta, href: '/' };
  if (traits.has('money') && 'currency' in type) {
    data.amount = n * 10;
    data.currency = type.currency ?? 'EUR';
  }
  if (traits.has('featured')) data.featured = index === 0;
  return data;
}

export function generateDemoContent(
  composition: ContentComposition,
  options: GenerateDemoContentOptions,
): DemoContent {
  const base = options.clock.now();
  const count = options.itemsPerType ?? 3;
  const items: DemoContentItem[] = [];
  const assets: DemoAsset[] = [];
  for (const type of composition.contentTypes) {
    const schema = composeContentTraitSchema(type.traits);
    for (const locale of composition.contentLocales) {
      for (let i = 0; i < count; i++) {
        const data = schema.parse(buildItem(type, locale, i, base, assets));
        items.push({ contentTypeId: type.id, locale, data });
      }
    }
  }
  return { generatedAt: base.toISOString(), items, assets };
}

// -- Canonical serialisation and hash --

export function canonicalize(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** FNV-1a 64-bit over the canonical form. Not cryptographic; a determinism fingerprint. */
export function canonicalHash(value: unknown): string {
  let hash = 0xcbf29ce484222325n;
  for (const char of canonicalize(value)) {
    hash ^= BigInt(char.codePointAt(0) ?? 0);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

// -- Validation --

/** Emails, URLs, bare domains, GUID-like tenant ids. */
const PRIVATE_PATTERNS: readonly RegExp[] = [
  /[^\s@]+@[^\s@]+/,
  /https?:\/\//i,
  /\bwww\./i,
  /\b[a-z0-9-]+\.(?:de|com|org|net|io|eu|dev|onmicrosoft)\b/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
];

export function findPrivateData(value: unknown): string[] {
  const text = canonicalize(value);
  return PRIVATE_PATTERNS.filter((p) => p.test(text)).map((p) => p.source);
}

export function validateDemoContent(content: DemoContent): void {
  const problems: string[] = [];
  const known = new Set<string>();
  for (const asset of content.assets) {
    known.add(asset.src);
    if (!asset.alt.trim()) problems.push(`Asset ${asset.src}: missing alt text`);
    if (!asset.provenance.trim()) problems.push(`Asset ${asset.src}: missing provenance`);
    if (!(DEMO_LICENSES as readonly string[]).includes(asset.license ?? '')) {
      problems.push(`Asset ${asset.src}: missing or unknown license`);
    }
  }
  const refs: string[] = [];
  const collect = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object' && !(v instanceof Date)) {
      const rec = v as Record<string, unknown>;
      if (typeof rec.src === 'string') {
        refs.push(rec.src);
        if (typeof rec.alt !== 'string' || !rec.alt.trim()) problems.push(`Image ${rec.src}: missing alt text`);
      }
      Object.values(rec).forEach(collect);
    }
  };
  content.items.forEach((item) => collect(item.data));
  for (const ref of refs) if (!known.has(ref)) problems.push(`Image ${ref}: no provenance/license entry`);
  const leaks = findPrivateData({ items: content.items, assets: content.assets.map(({ svg: _svg, ...rest }) => rest) });
  if (leaks.length > 0) problems.push(`Private-looking data matched: ${leaks.join(', ')}`);
  if (problems.length > 0) throw new Error(`Demo content invalid:\n- ${problems.join('\n- ')}`);
}
