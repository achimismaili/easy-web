import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import { legacyFixtures, type LegacyFixture } from '../../../core/src/components/__tests__/fixtures/legacy-props';
import { normalizeHtml } from '../../../core/src/components/__tests__/normalize-html';

/**
 * Every legacy `@easy-web/content-blocks/components/X` wrapper must render
 * exactly what `@easy-web/core/components/X` renders, and exactly what the
 * pre-move baseline recorded, for every legacy fixture - including both the
 * with-slot and the without-slot variant of each header.
 */
const wrapperModules = import.meta.glob<{ default: AstroComponentFactory }>('../components/*.astro', {
  eager: true,
});

const wrappers = new Map(
  Object.entries(wrapperModules).map(([file, module]) => [
    file.slice('../components/'.length, -'.astro'.length),
    module.default,
  ]),
);

const baselineSnapshots: Record<string, string> = {};
new Function('exports', readFileSync(
  new URL('../../../core/src/components/__tests__/__snapshots__/legacy-baseline.test.ts.snap', import.meta.url),
  'utf8',
))(baselineSnapshots);

function componentName(fixture: LegacyFixture): string {
  return fixture.name.split(' ')[0] ?? fixture.name;
}

async function render(component: AstroComponentFactory, fixture: LegacyFixture): Promise<string> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(component, { props: fixture.props, slots: fixture.slots });
  return normalizeHtml(html);
}

describe('content-blocks compatibility wrappers', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('has a legacy fixture for every wrapper component', () => {
    const covered = new Set(legacyFixtures.map(componentName));
    expect([...wrappers.keys()].filter((name) => !covered.has(name))).toEqual([]);
    expect(wrappers.size).toBe(28);
  });

  it.each(legacyFixtures.map((fixture) => [fixture.name, fixture] as const))(
    '%s renders identically through the wrapper, the core component and the baseline',
    async (name, fixture) => {
      const wrapper = wrappers.get(componentName(fixture));
      if (!wrapper) throw new Error(`no wrapper for ${name}`);

      const viaWrapper = await render(wrapper, fixture);
      const viaCore = await render(fixture.component, fixture);

      expect(viaWrapper).toBe(viaCore);
      expect(`"${viaWrapper}"`).toBe(baselineSnapshots[`legacy rendering baseline > ${name} 1`]);
    },
  );
});
