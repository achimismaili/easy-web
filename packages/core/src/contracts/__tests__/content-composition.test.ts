import { describe, expect, it } from 'vitest';
import {
  composeContentTraitSchema,
  contentCompositionSchema,
  contentTypeDefinitionSchema,
  moneyTraitSchema,
  presentationBindings,
} from '../index.js';

const localization = {
  contentLocales: ['de', 'en'],
} as const;

const genericTypes = [
  {
    name: 'configured product',
    definition: {
      id: 'catalog-item',
      primary: true,
      labels: { de: 'Produkte', en: 'Products' },
      routes: { de: '/produkte/', en: '/en/products/' },
      traits: ['title', 'slug', 'summary', 'body', 'image', 'cta', 'money', 'featured'],
      bindings: ['homepage', 'list', 'detail', 'navigation', 'cms-admin'],
      currency: 'EUR',
    },
  },
  {
    name: 'scheduled event',
    definition: {
      id: 'scheduled-event',
      labels: { de: 'Termine', en: 'Events' },
      routes: { de: '/termine/', en: '/en/events/' },
      traits: ['title', 'slug', 'summary', 'body', 'schedule', 'location'],
      bindings: ['list', 'detail', 'navigation', 'cms-admin'],
    },
  },
  {
    name: 'gallery item',
    definition: {
      id: 'gallery-item',
      labels: { de: 'Galerie', en: 'Gallery' },
      routes: { de: '/galerie/', en: '/en/gallery/' },
      traits: ['title', 'slug', 'image', 'photos'],
      bindings: ['list', 'navigation', 'cms-admin'],
    },
  },
] as const;

describe('content composition contracts', () => {
  it.each(genericTypes)('accepts a valid $name', ({ definition }) => {
    // Given / When
    const result = contentCompositionSchema.safeParse({ ...localization, contentTypes: [definition] });

    // Then
    expect(result.success).toBe(true);
  });

  it('keeps the presentation binding set closed', () => {
    // Given / When
    const result = contentTypeDefinitionSchema.safeParse({
      ...genericTypes[2].definition,
      bindings: ['search'],
    });

    // Then
    expect(presentationBindings).toEqual(['homepage', 'list', 'detail', 'navigation', 'cms-admin']);
    expect(result.success).toBe(false);
  });

  it('rejects a detail binding when the body trait is missing', () => {
    // Given
    const definition = { ...genericTypes[2].definition, bindings: ['detail'] };

    // When
    const result = contentCompositionSchema.safeParse({ ...localization, contentTypes: [definition] });

    // Then
    expect(result.error?.issues[0]?.message).toContain('Binding "detail" requires trait(s): body');
  });

  it('rejects a second primary content type', () => {
    // Given
    const definitions = genericTypes.slice(0, 2).map(({ definition }) => ({ ...definition, primary: true }));

    // When
    const result = contentCompositionSchema.safeParse({ ...localization, contentTypes: definitions });

    // Then
    expect(result.error?.issues.some((issue) => issue.message.includes('Only one primary content type'))).toBe(true);
  });

  it('rejects a reserved content route', () => {
    // Given
    const definition = { ...genericTypes[2].definition, routes: { de: '/admin/', en: '/en/gallery/' } };

    // When
    const result = contentCompositionSchema.safeParse({ ...localization, contentTypes: [definition] });

    // Then
    expect(result.error?.issues.some((issue) => issue.message.includes('Route "/admin/" is reserved'))).toBe(true);
  });

  it('rejects homepage binding without the featured trait', () => {
    // Given
    const definition = { ...genericTypes[2].definition, bindings: ['homepage'] };

    // When
    const result = contentCompositionSchema.safeParse({ ...localization, contentTypes: [definition] });

    // Then
    expect(result.error?.issues.some((issue) => issue.message.includes('featured'))).toBe(true);
  });

  it.each([
    ['duplicate content type ID', { contentTypes: [genericTypes[1].definition, genericTypes[1].definition] }, 'Duplicate content type ID'],
    ['missing localized label', { contentTypes: [{ ...genericTypes[1].definition, labels: { de: 'Termine' } }] }, 'Missing configured locale(s): en'],
    ['colliding content route', {
      contentTypes: [genericTypes[1].definition, { ...genericTypes[2].definition, routes: genericTypes[1].definition.routes }],
    }, 'collides with content type'],
  ] as const)('rejects %s', (_name, input, message) => {
    // Given / When
    const result = contentCompositionSchema.safeParse({ ...localization, ...input });

    // Then
    expect(result.error?.issues.some((issue) => issue.message.includes(message))).toBe(true);
  });

  it('requires currency only on money-enabled content selections', () => {
    // Given / When
    const missingMoneyCurrency = contentTypeDefinitionSchema.safeParse({
      ...genericTypes[0].definition,
      currency: undefined,
    });
    const currencyOnNonMoney = contentTypeDefinitionSchema.safeParse({
      ...genericTypes[2].definition,
      currency: 'EUR',
    });

    // Then
    expect(missingMoneyCurrency.success).toBe(true);
    expect(currencyOnNonMoney.success).toBe(false);
  });
});

describe('content trait data schemas', () => {
  it('composes selected trait shapes without allowing unselected fields', () => {
    // Given
    const schema = composeContentTraitSchema(['title', 'slug']);

    // When
    const selected = schema.safeParse({ title: 'Example', slug: 'example' });
    const unselected = schema.safeParse({ title: 'Example', slug: 'example', currency: 'EUR' });

    // Then
    expect(selected.success).toBe(true);
    expect(unselected.success).toBe(false);
  });

  it.each([
    ['EUR', true],
    ['usd', false],
    ['ZZZ', false],
  ] as const)('validates money currency %s', (currency, expected) => {
    // Given / When
    const result = moneyTraitSchema.safeParse({ amount: 25, currency });

    // Then
    expect(result.success).toBe(expected);
  });
});
