import { describe, expect, it, vi } from 'vitest';
import { z } from 'astro/zod';
import {
    createRecipeAdmissionSchema, recipeMetadataDescriptorSchema, recipeMetadataJsonSchema,
    recipeMetadataSchema, recipeRegistryManifestSchema,
} from '../index.js';
import type { RecipeMetadata, RecipeRegistryPin } from '../index.js';

const integrity = `sha512-${'A'.repeat(86)}==`;
const otherIntegrity = `sha512-${'B'.repeat(86)}==`;

function fixture() {
    const generate = vi.fn(() => ({ files: [] }));
    const validate = vi.fn(() => []);
    const recipe = {
        id: 'shell', version: '1.5.0', protocolVersion: 1,
        compatibleCliRange: '^0.1.0', compatibleRuntimeRange: '^1.5.0',
        provides: ['shell'], requires: [], conflicts: [],
        order: { priority: 0, key: 'shell' },
        optionsSchema: z.strictObject({ title: z.string() }),
        outputContributions: [{ kind: 'file', id: 'shell.layout', target: 'src/layouts/Base.astro' }],
        validators: [{ id: 'shell.options', phase: 'options', validate }], generate,
    } satisfies RecipeMetadata<{ title: string }>;
    const pin = {
        packageName: '@easy-web/core', version: '1.5.0', integrity, exportPath: './recipes/shell',
    } satisfies RecipeRegistryPin;
    const artifact = { recipe, receipt: { source: 'bundled', pin, verifiedIntegrity: integrity } };
    const input = { registry: { protocolVersion: 1, recipes: [pin] }, artifacts: [artifact] };
    const schema = createRecipeAdmissionSchema({
        cliVersion: '0.1.0', runtimeVersion: '1.5.0',
        // Bounded fake policy; production semver syntax/satisfaction belongs to todo 4.
        satisfies: (version, range) => range === `^${version}`,
    });
    return { generate, validate, recipe, pin, artifact, input, schema };
}

describe('recipe protocol admission', () => {
    it('admits valid capability combinations without running hooks', () => {
        // Given
        const f = fixture();
        const pin = { ...f.pin, exportPath: './recipes/navigation' };
        const input = {
            registry: { ...f.input.registry, recipes: [f.pin, pin] },
            artifacts: [f.artifact, {
                receipt: { ...f.artifact.receipt, pin },
                recipe: { ...f.recipe, id: 'navigation', provides: ['Linkable'], requires: ['shell'] },
            }],
        };
        // When
        const result = f.schema.safeParse(input);
        // Then
        expect(result.success).toBe(true);
        expect(f.generate).not.toHaveBeenCalled();
        expect(f.validate).not.toHaveBeenCalled();
    });

    it.each([
        ['duplicate-provider-id', { id: 'navigation', provides: ['shell'], requires: [] }],
        ['missing-requirement', { id: 'navigation', provides: ['Linkable'], requires: ['HasImage'] }],
        ['dependency-cycle', { id: 'navigation', provides: ['Linkable'], requires: ['shell'] }],
        ['conflicting-capability', { id: 'navigation', provides: ['Linkable'], requires: [], conflicts: ['shell'] }],
    ])('rejects %s before generation', (code, patch) => {
        // Given
        const f = fixture();
        const pin = { ...f.pin, exportPath: './recipes/navigation' };
        const input = {
            registry: { ...f.input.registry, recipes: [f.pin, pin] },
            artifacts: [{ ...f.artifact, recipe: {
                ...f.recipe, requires: code === 'dependency-cycle' ? ['Linkable'] : [],
            } }, {
                receipt: { ...f.artifact.receipt, pin }, recipe: { ...f.recipe, ...patch },
            }],
        };
        // When
        const result = f.schema.safeParse(input);
        // Then
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error.issues.map((issue) => issue.message)).toContain(code);
        expect(f.generate).not.toHaveBeenCalled();
        expect(f.validate).not.toHaveBeenCalled();
    });

    it.each([
        ['protocol version', { protocolVersion: 2 }],
        ['invalid shape', { provides: 'shell' }],
        ['invalid generation hook', { generate: 'direct' }],
        ['invalid option schema', { optionsSchema: {} }],
        ['invalid validator', { validators: [{ id: 'shell.options', phase: 'options', validate: 42 }] }],
        ['CLI compatibility range', { compatibleCliRange: '^9.0.0' }],
        ['runtime compatibility range', { compatibleRuntimeRange: '^2.0.0' }],
        ['invalid semver range', { compatibleRuntimeRange: 'not-semver' }],
        ['artifact version', { version: '1.6.0' }],
        ['self requirement', { requires: ['shell'] }],
    ])('rejects incompatible or malformed %s before generation', (_name, patch) => {
        // Given
        const f = fixture();
        const input = { ...f.input, artifacts: [{ ...f.artifact, recipe: { ...f.recipe, ...patch } }] };
        // When
        const result = f.schema.safeParse(input);
        // Then
        expect(result.success).toBe(false);
        expect(f.generate).not.toHaveBeenCalled();
        expect(f.validate).not.toHaveBeenCalled();
    });

    it.each([
        ['tampered integrity', { verifiedIntegrity: otherIntegrity }],
        ['target node_modules', { source: 'target-node-modules' }],
        ['third-party package', { pin: { packageName: '@other/recipe' } }],
        ['unregistered first-party package', { pin: { packageName: '@easy-web/unregistered' } }],
        ['non-pinned export', { pin: { exportPath: './recipes/other' } }],
        ['non-pinned version', { pin: { version: '1.6.0' } }],
        ['non-pinned integrity', { pin: { integrity: otherIntegrity }, verifiedIntegrity: otherIntegrity }],
    ])('rejects %s receipts before generation', (_name, patch) => {
        // Given
        const f = fixture();
        const receipt = { ...f.artifact.receipt, ...patch, pin: { ...f.pin, ...patch.pin } };
        // When
        const result = f.schema.safeParse({ ...f.input, artifacts: [{ ...f.artifact, receipt }] });
        // Then
        expect(result.success).toBe(false);
        expect(f.generate).not.toHaveBeenCalled();
        expect(f.validate).not.toHaveBeenCalled();
    });
});

describe('recipe descriptor and registry schemas', () => {
    it('accepts a serializable projection independently of executable metadata', () => {
        // Given
        const f = fixture();
        const descriptor = {
            ...f.recipe, generate: 'direct', optionsSchema: z.toJSONSchema(f.recipe.optionsSchema),
            validators: [{ id: 'shell.options', phase: 'options' }],
        };
        // When
        const result = recipeMetadataDescriptorSchema.safeParse(JSON.parse(JSON.stringify(descriptor)));
        // Then
        expect(result.success).toBe(true);
        expect(recipeMetadataJsonSchema.properties?.['protocolVersion']).toMatchObject({ const: 1 });
        expect(recipeMetadataJsonSchema.additionalProperties).toBe(false);
    });

    it('keeps the parsed options schema capable of rejecting invalid options', () => {
        // Given
        const f = fixture();
        // When
        const recipe = recipeMetadataSchema.parse(f.recipe);
        // Then
        expect(recipe.optionsSchema.safeParse({ title: 42 }).success).toBe(false);
        expect(recipe.optionsSchema.safeParse({ title: 'Example' }).success).toBe(true);
    });

    it.each([
        ['range instead of exact version', { version: '^1.5.0' }],
        ['malformed version', { version: '01.5.0' }],
        ['malformed integrity', { integrity: 'sha512-invalid' }],
        ['path traversal', { exportPath: './../recipe' }],
        ['absolute export', { exportPath: 'C:/target/node_modules/recipe' }],
    ])('rejects registry %s', (_name, patch) => {
        // Given
        const f = fixture();
        // When
        const result = recipeRegistryManifestSchema.safeParse({
            ...f.input.registry, recipes: [{ ...f.pin, ...patch }],
        });
        // Then
        expect(result.success).toBe(false);
    });

    it('rejects ambiguous duplicate pins', () => {
        // Given
        const f = fixture();
        // When
        const result = recipeRegistryManifestSchema.safeParse({
            ...f.input.registry, recipes: [f.pin, { ...f.pin, version: '1.6.0' }],
        });
        // Then
        expect(result.success).toBe(false);
    });
});
