import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import { toAstroSchema } from '../astro-schema.js';
import { defineSingleton, field } from '../index.js';
import type { FieldDef } from '../types.js';

const context = { image: () => z.string() };

function schemaFor(fields: readonly FieldDef[], publicFolder = '/images') {
    const definition = defineSingleton({ name: 'fixture', label: 'Fixture', file: 'fixture.json', publicFolder, fields });
    return toAstroSchema(definition)(context);
}

function expectMissingField(fieldDefinition: FieldDef): void {
    const result = schemaFor([fieldDefinition]).safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toContain(fieldDefinition.name);
}

describe('Astro schema primitive parity', () => {
    it.each([
        ['string', field.string('value', { label: 'Value' }), 'text'],
        ['text', field.text('value', { label: 'Value' }), 'paragraph'],
        ['hidden', field.hidden('value', { default: 'fixed' }), 'fixed'],
        ['color', field.color('value', { label: 'Value' }), '#a1B2c3'],
        ['number', field.number('value', { label: 'Value', valueType: 'int', min: 1, max: 3 }), 2],
        ['date', field.date('value', { label: 'Value' }), '2026-10-08'],
        ['select', field.select('value', { label: 'Value', options: ['one', { label: 'Two', value: 'two' }] }), 'two'],
    ] as const)('parses valid %s fields and rejects a missing required field by name', (_kind, definition, value) => {
        // Given
        const schema = schemaFor([definition]);
        // When
        const parsed = schema.parse({ value });
        // Then
        expect(parsed.value).toEqual(definition.kind === 'date' ? new Date('2026-10-08') : value);
        expectMissingField(definition);
    });

    it.each([
        ['string', field.string('value', { label: 'Value', required: false })],
        ['text', field.text('value', { label: 'Value', required: false })],
        ['number', field.number('value', { label: 'Value', required: false })],
        ['date', field.date('value', { label: 'Value', required: false })],
        ['select', field.select('value', { label: 'Value', required: false, options: ['one', 'two'] })],
    ] as const)('maps Decap-cleared optional %s values to undefined', (_kind, definition) => {
        // Given
        const schema = schemaFor([definition]);
        // When / Then
        expect(schema.parse({ value: '' })).toEqual({ value: undefined });
        expect(schema.parse({ value: null })).toEqual({ value: undefined });
    });

    it('uses the exact composed Decap pattern without trimming the value', () => {
        // Given
        const schema = schemaFor([field.string('value', { label: 'Value', pattern: ['cat|dog', 'Tier erforderlich'] })]);
        // When / Then
        expect(schema.safeParse({ value: '   ' }).success).toBe(false);
        expect(schema.parse({ value: ' a cat here ' })).toEqual({ value: ' a cat here ' });
    });

    it('applies numeric integer, bounds and default constraints', () => {
        // Given
        const schema = schemaFor([field.number('value', { label: 'Value', valueType: 'int', min: 1, max: 3, default: 2 })]);
        // When / Then
        expect(schema.parse({})).toEqual({ value: 2 });
        expect(schema.safeParse({ value: 1.5 }).success).toBe(false);
        expect(schema.safeParse({ value: 4 }).success).toBe(false);
    });

    it('applies boolean defaults and maps cleared values through the default', () => {
        // Given
        const schema = schemaFor([field.boolean('enabled', { label: 'Enabled', default: true })]);
        // When / Then
        expect(schema.parse({})).toEqual({ enabled: true });
        expect(schema.parse({ enabled: '' })).toEqual({ enabled: true });
        expect(schema.parse({ enabled: null })).toEqual({ enabled: true });
    });

    it('rejects malformed colors', () => {
        // Given
        const schema = schemaFor([field.color('accent', { label: 'Accent' })]);
        // When / Then
        expect(schema.safeParse({ accent: 'red' }).success).toBe(false);
    });

    it('excludes the markdown body field', () => {
        // Given / When
        const parsed = schemaFor([field.body()]).parse({ body: '# Content' });
        // Then
        expect(parsed).toEqual({});
    });
});
