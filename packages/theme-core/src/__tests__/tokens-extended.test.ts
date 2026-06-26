import { describe, it, expect } from 'vitest';
import { tokens } from '../tokens.js';
import { breakpoints } from '../breakpoints.js';
import { subscribeToSystem } from '../helper.js';

describe('tokens – semantic color variants', () => {
  it('color.onSurface', () => {
    expect(tokens.color.onSurface).toBe('var(--ew-on-surface)');
  });
  it('color.surfaceMuted', () => {
    expect(tokens.color.surfaceMuted).toBe('var(--ew-surface-muted)');
  });
  it('color.onPrimary', () => {
    expect(tokens.color.onPrimary).toBe('var(--ew-on-primary)');
  });
  it('color.border', () => {
    expect(tokens.color.border).toBe('var(--ew-border)');
  });
  it('color.muted', () => {
    expect(tokens.color.muted).toBe('var(--ew-muted)');
  });
  it('color.onDanger', () => {
    expect(tokens.color.onDanger).toBe('var(--ew-on-danger)');
  });
  it('color.accent', () => {
    expect(tokens.color.accent).toBe('var(--ew-accent)');
  });
});

describe('tokens – neutral ramp', () => {
  it('neutral.50', () => expect(tokens.color.neutral[50]).toBe('var(--ew-neutral-50)'));
  it('neutral.500', () => expect(tokens.color.neutral[500]).toBe('var(--ew-neutral-500)'));
  it('neutral.950', () => expect(tokens.color.neutral[950]).toBe('var(--ew-neutral-950)'));
  it('all ramp entries are CSS var strings', () => {
    for (const val of Object.values(tokens.color.neutral)) {
      expect(val).toMatch(/^var\(--ew-neutral-\d+\)$/);
    }
  });
});

describe('tokens – primaryRamp', () => {
  it('primaryRamp.50', () => expect(tokens.color.primaryRamp[50]).toBe('var(--ew-primary-50)'));
  it('primaryRamp.900', () => expect(tokens.color.primaryRamp[900]).toBe('var(--ew-primary-900)'));
  it('all ramp entries are CSS var strings', () => {
    for (const val of Object.values(tokens.color.primaryRamp)) {
      expect(val).toMatch(/^var\(--ew-primary-\d+\)$/);
    }
  });
});

describe('tokens – typography', () => {
  it('font.mono', () => expect(tokens.font.mono).toBe('var(--ew-font-mono)'));
  it('text.xs', () => expect(tokens.text.xs).toBe('var(--ew-text-xs)'));
  it('text.sm', () => expect(tokens.text.sm).toBe('var(--ew-text-sm)'));
  it('text.lg', () => expect(tokens.text.lg).toBe('var(--ew-text-lg)'));
  it('text.xl', () => expect(tokens.text.xl).toBe('var(--ew-text-xl)'));
  it('text.3xl', () => expect(tokens.text['3xl']).toBe('var(--ew-text-3xl)'));
  it('leading.tight', () => expect(tokens.leading.tight).toBe('var(--ew-leading-tight)'));
  it('leading.loose', () => expect(tokens.leading.loose).toBe('var(--ew-leading-loose)'));
});

describe('tokens – space scale', () => {
  const expectedSpaces: Array<[number, string]> = [
    [0, 'var(--ew-space-0)'],
    [1, 'var(--ew-space-1)'],
    [2, 'var(--ew-space-2)'],
    [3, 'var(--ew-space-3)'],
    [5, 'var(--ew-space-5)'],
    [6, 'var(--ew-space-6)'],
    [7, 'var(--ew-space-7)'],
    [8, 'var(--ew-space-8)'],
    [9, 'var(--ew-space-9)'],
    [10, 'var(--ew-space-10)'],
    [11, 'var(--ew-space-11)'],
    [12, 'var(--ew-space-12)'],
  ];
  for (const [step, expected] of expectedSpaces) {
    it(`space.${step}`, () => expect(tokens.space[step as keyof typeof tokens.space]).toBe(expected));
  }
});

describe('tokens – radius scale', () => {
  it('radius.none', () => expect(tokens.radius.none).toBe('var(--ew-radius-none)'));
  it('radius.sm', () => expect(tokens.radius.sm).toBe('var(--ew-radius-sm)'));
  it('radius.lg', () => expect(tokens.radius.lg).toBe('var(--ew-radius-lg)'));
  it('radius.xl', () => expect(tokens.radius.xl).toBe('var(--ew-radius-xl)'));
  it('radius.full', () => expect(tokens.radius.full).toBe('var(--ew-radius-full)'));
});

describe('tokens – shadow scale', () => {
  it('shadow.xs', () => expect(tokens.shadow.xs).toBe('var(--ew-shadow-xs)'));
  it('shadow.sm', () => expect(tokens.shadow.sm).toBe('var(--ew-shadow-sm)'));
  it('shadow.lg', () => expect(tokens.shadow.lg).toBe('var(--ew-shadow-lg)'));
  it('shadow.xl', () => expect(tokens.shadow.xl).toBe('var(--ew-shadow-xl)'));
  it('shadow.2xl', () => expect(tokens.shadow['2xl']).toBe('var(--ew-shadow-2xl)'));
});

describe('tokens – motion durations (remaining)', () => {
  it('duration.instant', () => expect(tokens.motion.duration.instant).toBe('var(--ew-duration-instant)'));
  it('duration.normal', () => expect(tokens.motion.duration.normal).toBe('var(--ew-duration-normal)'));
  it('duration.moderate', () => expect(tokens.motion.duration.moderate).toBe('var(--ew-duration-moderate)'));
  it('duration.slow', () => expect(tokens.motion.duration.slow).toBe('var(--ew-duration-slow)'));
  it('duration.slower', () => expect(tokens.motion.duration.slower).toBe('var(--ew-duration-slower)'));
});

describe('tokens – motion easings (remaining)', () => {
  it('ease.default', () => expect(tokens.motion.ease.default).toBe('var(--ew-ease-default)'));
  it('ease.in', () => expect(tokens.motion.ease.in).toBe('var(--ew-ease-in)'));
  it('ease.out', () => expect(tokens.motion.ease.out).toBe('var(--ew-ease-out)'));
  it('ease.inOut', () => expect(tokens.motion.ease.inOut).toBe('var(--ew-ease-in-out)'));
});

describe('tokens – zIndex scale (remaining)', () => {
  it('zIndex.hide', () => expect(tokens.zIndex.hide).toBe('var(--ew-z-hide)'));
  it('zIndex.base', () => expect(tokens.zIndex.base).toBe('var(--ew-z-base)'));
  it('zIndex.raised', () => expect(tokens.zIndex.raised).toBe('var(--ew-z-raised)'));
  it('zIndex.dropdown', () => expect(tokens.zIndex.dropdown).toBe('var(--ew-z-dropdown)'));
  it('zIndex.sticky', () => expect(tokens.zIndex.sticky).toBe('var(--ew-z-sticky)'));
  it('zIndex.overlay', () => expect(tokens.zIndex.overlay).toBe('var(--ew-z-overlay)'));
  it('zIndex.popover', () => expect(tokens.zIndex.popover).toBe('var(--ew-z-popover)'));
});

describe('breakpoints – additional values', () => {
  it('breakpoints.md is 768', () => expect(breakpoints.md).toBe(768));
  it('breakpoints.xl is 1280', () => expect(breakpoints.xl).toBe(1280));
  it('all breakpoint values are positive integers', () => {
    for (const val of Object.values(breakpoints)) {
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThan(0);
    }
  });
  it('breakpoints are strictly ascending', () => {
    const vals = [breakpoints.sm, breakpoints.md, breakpoints.lg, breakpoints.xl, breakpoints['2xl']];
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThan(vals[i - 1]!);
    }
  });
});

describe('subscribeToSystem – SSR (no window)', () => {
  it('returns a no-op cleanup function in Node/SSR', () => {
    const cleanup = subscribeToSystem(() => {});
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });
});
