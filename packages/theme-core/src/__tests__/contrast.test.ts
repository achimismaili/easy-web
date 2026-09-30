import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WCAG_AA_NORMAL_TEXT = 4.5;

const css = readFileSync(
  fileURLToPath(new URL('../../styles/tokens.css', import.meta.url)),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

type Scope = Record<string, string>;

function declarationsFor(selector: string): Scope {
  const selectorAt = css.indexOf(selector);
  if (selectorAt === -1) throw new Error(`Selector missing from tokens.css: ${selector}`);

  const open = css.indexOf('{', selectorAt);
  const close = css.indexOf('}', open);
  if (open === -1 || close === -1) throw new Error(`Malformed block for: ${selector}`);

  const scope: Scope = {};
  for (const declaration of css.slice(open + 1, close).split(';')) {
    const separator = declaration.indexOf(':');
    if (separator === -1) continue;
    const property = declaration.slice(0, separator).trim();
    if (property.startsWith('--')) scope[property] = declaration.slice(separator + 1).trim();
  }
  return scope;
}

function resolve(property: string, scopes: Scope[]): string {
  const visited = new Set<string>();
  let current = property;

  for (;;) {
    if (visited.has(current)) throw new Error(`Circular custom property: ${current}`);
    visited.add(current);

    const value = scopes.find((scope) => current in scope)?.[current];
    if (value === undefined) throw new Error(`Unresolved custom property: ${current}`);

    const indirection = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value);
    if (!indirection) return value;
    current = indirection[1];
  }
}

// WCAG 2.1 relative luminance and contrast ratio, per w3.org/TR/WCAG21/#dfn-relative-luminance
function channelLuminance(byte: number): number {
  const channel = byte / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const parsed = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!parsed) throw new Error(`Expected a 6-digit hex colour, got: ${hex}`);
  const rgb = parseInt(parsed[1], 16);
  return (
    0.2126 * channelLuminance((rgb >> 16) & 0xff) +
    0.7152 * channelLuminance((rgb >> 8) & 0xff) +
    0.0722 * channelLuminance(rgb & 0xff)
  );
}

function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [lighter, darker] = a >= b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

const root = declarationsFor(':root');

const themes = [
  { name: 'light', scopes: [root] },
  { name: 'dark (explicit toggle)', scopes: [declarationsFor('[data-theme="dark"]'), root] },
  {
    name: 'dark (OS preference)',
    scopes: [declarationsFor(':root:not([data-theme="light"])'), root],
  },
] satisfies { name: string; scopes: Scope[] }[];

describe('WCAG contrast of default theme tokens', () => {
  it.each(themes)('$name: --ew-link on --ew-surface meets AA', ({ scopes }) => {
    const ratio = contrastRatio(resolve('--ew-link', scopes), resolve('--ew-surface', scopes));
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });

  it.each(themes)('$name: --ew-on-surface on --ew-surface meets AA', ({ scopes }) => {
    const ratio = contrastRatio(resolve('--ew-on-surface', scopes), resolve('--ew-surface', scopes));
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });
});

describe('--ew-link token contract', () => {
  it('is declared once, in :root, as an alias of --ew-primary', () => {
    expect(root['--ew-link']).toBe('var(--ew-primary)');
    expect(declarationsFor('[data-theme="dark"]')['--ew-link']).toBeUndefined();
    expect(declarationsFor(':root:not([data-theme="light"])')['--ew-link']).toBeUndefined();
  });

  it.each(themes)('$name: tracks --ew-primary by default', ({ scopes }) => {
    expect(resolve('--ew-link', scopes)).toBe(resolve('--ew-primary', scopes));
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('is 1:1 for a colour against itself', () => {
    expect(contrastRatio('#2563eb', '#2563eb')).toBeCloseTo(1, 5);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#2563eb', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#2563eb'),
      5,
    );
  });

  it('rejects malformed colours', () => {
    expect(() => contrastRatio('var(--nope)', '#ffffff')).toThrow(/6-digit hex/);
  });
});
