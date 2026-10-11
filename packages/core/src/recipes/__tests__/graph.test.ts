import { z } from 'astro/zod';
import { describe, expect, it, vi } from 'vitest';
import { resolveCapabilityGraph } from '../graph.js';
import type { RecipeMetadata, RecipeOutputContribution } from '../index.js';

type RecipeFixtureOptions = {
    readonly provides?: readonly string[];
    readonly requires?: readonly string[];
    readonly conflicts?: readonly string[];
    readonly priority?: number;
    readonly key?: string;
    readonly contributions?: readonly RecipeOutputContribution[];
};

function recipe(id: string, options: RecipeFixtureOptions = {}): RecipeMetadata {
    return {
        id,
        version: '1.5.0',
        protocolVersion: 1,
        compatibleCliRange: '^0.1.0',
        compatibleRuntimeRange: '^1.5.0',
        provides: options.provides ?? [id],
        requires: options.requires ?? [],
        conflicts: options.conflicts ?? [],
        order: { priority: options.priority ?? 0, key: options.key ?? id },
        optionsSchema: z.strictObject({}),
        outputContributions: options.contributions ?? [],
        validators: [],
        generate: vi.fn(() => ({ files: [] })),
    };
}

describe('capability graph resolution', () => {
    it('resolves requirements, content roles, fixed pages, adaptations and provenance', () => {
        // Given
        const shell = recipe('shell', {
            priority: 10,
            contributions: [
                { kind: 'route', id: 'page.privacy', target: '/privacy/' },
                { kind: 'file', id: 'shell.layout', target: 'src/layouts/Base.astro' },
            ],
        });
        const article = recipe('article', {
            provides: ['content.article'], requires: ['shell'], priority: 5,
            contributions: [{ kind: 'content', id: 'content.article', target: 'primary' }],
        });
        const gallery = recipe('gallery', {
            provides: ['content.gallery'], requires: ['content.article'],
            contributions: [{ kind: 'content', id: 'content.gallery', target: 'additional' }],
        });
        const theme = recipe('theme', {
            priority: 30,
            contributions: [
                { kind: 'binding', id: 'adaptation.shell-theme', target: 'shell.layout' },
                { kind: 'binding', id: 'adaptation.missing-auth', target: 'auth.shell' },
            ],
        });

        // When
        const result = resolveCapabilityGraph([gallery, theme, shell, article]);

        // Then
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.recipes.map((node) => node.id)).toEqual(['shell', 'article', 'gallery', 'theme']);
        expect(result.value.recipes.map((node) => node.provenance.inclusion)).toEqual([
            { kind: 'transitive', requiredBy: ['article'] },
            { kind: 'transitive', requiredBy: ['gallery'] },
            { kind: 'direct' },
            { kind: 'direct' },
        ]);
        expect(result.value.fixedPages.map((page) => page.target)).toEqual(['/privacy/']);
        expect(result.value.contentTypes.primary?.id).toBe('content.article');
        expect(result.value.contentTypes.additional.map((node) => node.id)).toEqual(['content.gallery']);
        expect(result.value.adaptations.map((node) => node.id)).toEqual(['adaptation.shell-theme']);
        expect(result.value.adaptations[0]?.targetContributionId).toBe('shell.layout');
        expect([shell, article, gallery, theme].every((item) => vi.mocked(item.generate).mock.calls.length === 0)).toBe(true);
    });

    it('produces byte-identical output for every permutation of the same recipes', () => {
        // Given
        const shell = recipe('shell', { priority: 20 });
        const content = recipe('content', { requires: ['shell'], priority: 10 });
        const cms = recipe('cms', { requires: ['content'], priority: 0 });
        const permutations = [
            [shell, content, cms], [shell, cms, content], [content, shell, cms],
            [content, cms, shell], [cms, shell, content], [cms, content, shell],
        ];

        // When
        const serialized = permutations.map((items) => JSON.stringify(resolveCapabilityGraph(items)));

        // Then
        expect(new Set(serialized)).toHaveLength(1);
    });

    it.each([
        ['dependency-cycle', [
            recipe('alpha', { requires: ['beta'] }),
            recipe('beta', { requires: ['alpha'] }),
        ]],
        ['output-conflict', [
            recipe('privacy', { contributions: [{ kind: 'route', id: 'page.privacy', target: '/privacy/' }] }),
            recipe('legal', { contributions: [{ kind: 'route', id: 'page.legal', target: '/privacy/' }] }),
        ]],
        ['conflicting-capability', [
            recipe('analytics', { conflicts: ['consent'] }),
            recipe('consent'),
        ]],
        ['multiple-primary-content', [
            recipe('article', { contributions: [{ kind: 'content', id: 'content.article', target: 'primary' }] }),
            recipe('event', { contributions: [{ kind: 'content', id: 'content.event', target: 'primary' }] }),
        ]],
    ] as const)('returns a typed %s failure without a partial graph', (code, recipes) => {
        // When
        const result = resolveCapabilityGraph(recipes);

        // Then
        expect(result).toMatchObject({ ok: false, error: { code } });
        expect('value' in result).toBe(false);
    });

    it('reports a missing transitive requirement with the consumer and capability', () => {
        // Given
        const recipes = [
            recipe('site', { requires: ['cms'] }),
            recipe('cms', { requires: ['content'] }),
        ];

        // When
        const result = resolveCapabilityGraph(recipes);

        // Then
        expect(result).toEqual({
            ok: false,
            error: { code: 'missing-requirement', recipeId: 'cms', capability: 'content' },
        });
    });
});
