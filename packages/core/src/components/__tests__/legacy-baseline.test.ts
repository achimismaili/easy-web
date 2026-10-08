import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { legacyFixtures } from './fixtures/legacy-props';
import { normalizeHtml } from './normalize-html';

/**
 * Baseline: how today's components render with today's props. A change to any
 * of these snapshots is a regression of legacy usage - do not update them.
 */
describe('legacy rendering baseline', () => {
  // Footer defaults its year to the current year; freeze the clock so the
  // snapshot does not roll over on 1 January.
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it.each(legacyFixtures.map((fixture) => [fixture.name, fixture] as const))('%s', async (_name, fixture) => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(fixture.component, {
      props: fixture.props,
      slots: fixture.slots,
    });
    expect(normalizeHtml(html)).toMatchSnapshot();
  });
});
