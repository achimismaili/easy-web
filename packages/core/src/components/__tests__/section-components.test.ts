import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import ContactSection from '../ContactSection.astro';
import CtaSection from '../CtaSection.astro';
import DraftBanner from '../DraftBanner.astro';
import Hero from '../Hero.astro';
import LanguageNotice from '../LanguageNotice.astro';
import LegalLayout from '../LegalLayout.astro';
import Prose from '../Prose.astro';
import Section from '../Section.astro';
import ScopeHost from './fixtures/ScopeHost.astro';
import { normalizeHtml } from './normalize-html';

interface SectionCase {
  readonly name: string;
  readonly component: AstroComponentFactory;
  readonly props: Record<string, unknown>;
  readonly slots?: Record<string, string>;
  readonly rootClass: string;
}

const cases: readonly SectionCase[] = [
  { name: 'Hero', component: Hero, props: { title: 'Welcome' }, rootClass: 'ew-hero ew-hero--centered' },
  { name: 'Section', component: Section, props: { title: 'Section title' }, slots: { default: '<p>Body</p>' }, rootClass: 'ew-section' },
  {
    name: 'CtaSection',
    component: CtaSection,
    props: { heading: 'Join us', buttonLabel: 'Go', buttonHref: '/go/' },
    rootClass: 'ew-cta ew-cta--default',
  },
  {
    name: 'ContactSection',
    component: ContactSection,
    props: { heading: 'Contact', email: 'info@example.com', buttonLabel: 'Mail us' },
    rootClass: 'ew-contact',
  },
  { name: 'DraftBanner', component: DraftBanner, props: { message: 'Draft content' }, rootClass: 'ew-draft-banner' },
  { name: 'LanguageNotice', component: LanguageNotice, props: { message: 'Only the German text is binding.' }, rootClass: 'ew-language-notice' },
  { name: 'LegalLayout', component: LegalLayout, props: { title: 'Impressum' }, slots: { default: '<p>Legal text</p>' }, rootClass: 'ew-legal' },
  { name: 'Prose', component: Prose, props: {}, slots: { default: '<p>Text</p>' }, rootClass: 'ew-prose' },
];

async function render(
  component: AstroComponentFactory,
  props: Record<string, unknown>,
  slots?: Record<string, string>,
): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(component, { props, slots });
}

function rootClassOf(html: string): string | undefined {
  return normalizeHtml(html).match(/^<\w+\b[^>]*?\sclass="([^"]*)"/)?.[1];
}

async function renderInScopedHost(testCase: SectionCase, props: Record<string, unknown>) {
  const html = await render(ScopeHost, { component: testCase.component, props }, undefined);
  const host = html.match(/^<div class="scope-host"[^>]*>/)?.[0] ?? '';
  const hostScope = host.match(/\s(data-astro-cid-[a-z0-9]+)/)?.[1];
  const componentRoot = html.slice(host.length).match(/^\s*(<\w+\b[^>]*>)/)?.[1] ?? '';
  return { hostScope, componentRoot };
}

function hasAttribute(tag: string, name: string): boolean {
  return new RegExp(`\\s${name}(?=[\\s=>/])`).test(tag);
}

describe('section components: class passthrough', () => {
  it.each(cases)('$name keeps its own root classes when no class is passed', async ({ component, props, slots, rootClass }) => {
    expect(rootClassOf(await render(component, props, slots))).toBe(rootClass);
  });

  it.each(cases)('$name appends a caller class to its root classes', async ({ component, props, slots, rootClass }) => {
    expect(rootClassOf(await render(component, { ...props, class: 'band' }, slots))).toBe(`${rootClass} band`);
  });

  it.each(cases)(
    '$name carries the caller scope with a caller class, so a scoped rule for that class matches',
    async (testCase) => {
      const { hostScope, componentRoot } = await renderInScopedHost(testCase, { ...testCase.props, class: 'band' });
      expect(hostScope).toBeDefined();
      expect(componentRoot).toContain('band');
      expect(hasAttribute(componentRoot, hostScope ?? '')).toBe(true);
    },
  );

  it.each(cases)('$name does not take on the caller scope without a caller class', async (testCase) => {
    const { hostScope, componentRoot } = await renderInScopedHost(testCase, testCase.props);
    expect(hostScope).toBeDefined();
    expect(componentRoot).not.toBe('');
    expect(hasAttribute(componentRoot, hostScope ?? '')).toBe(false);
  });
});
