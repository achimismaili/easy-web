import { z } from 'astro/zod';
import { describe, expect, it, vi } from 'vitest';
import type { ResolvedCapabilityGraph } from '../graph.js';
import { resolveCapabilityGraph } from '../graph.js';
import { serializeCapabilityGraphMermaid } from '../mermaid.js';
import { serializeCapabilityGraphJson, toCapabilityGraphDocument } from '../serialize.js';
import type { RecipeMetadata, RecipeOutputContribution } from '../types.js';

type RecipeFixtureOptions = {
    readonly provides?: readonly string[];
    readonly requires?: readonly string[];
    readonly priority?: number;
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
        conflicts: [],
        order: { priority: options.priority ?? 0, key: id },
        optionsSchema: z.strictObject({}),
        outputContributions: options.contributions ?? [],
        validators: [],
        generate: vi.fn(() => ({ files: [] })),
    };
}

const fixtures = [
    recipe('shell', {
        priority: 10,
        contributions: [
            { kind: 'route', id: 'page.contact', target: '/contact/' },
            { kind: 'file', id: 'shell.layout', target: 'src/layouts/Base.astro' },
        ],
    }),
    recipe('article', {
        provides: ['content.article'],
        requires: ['shell'],
        contributions: [{ kind: 'content', id: 'content.article', target: 'primary' }],
    }),
    recipe('gallery', {
        provides: ['content.gallery'],
        requires: ['content.article'],
        contributions: [{ kind: 'content', id: 'content.gallery', target: 'additional' }],
    }),
    recipe('navigation', {
        contributions: [{ kind: 'binding', id: 'binding.navigation', target: 'page.contact' }],
    }),
];

function serializeRecipes(recipes: readonly RecipeMetadata[]): string {
    const graph = resolveCapabilityGraph(recipes);
    expect(graph.ok).toBe(true);
    if (!graph.ok) throw new Error(graph.error.code);
    const document = toCapabilityGraphDocument(graph.value);
    expect(document.ok).toBe(true);
    if (!document.ok) throw new Error(document.error.code);
    return serializeCapabilityGraphJson(document.value);
}

function minimalGraph(target: string): ResolvedCapabilityGraph {
    return {
        recipes: [],
        capabilities: [],
        requirements: [],
        contributions: [{
            kind: 'route', id: 'page.contact', target,
            provenance: { contributedBy: 'shell', recipeVersion: '1.5.0', inclusion: { kind: 'direct' } },
        }],
        fixedPages: [],
        contentTypes: { additional: [] },
        adaptations: [],
    };
}

describe('capability graph serialization', () => {
    it('projects a resolved graph into the versioned JSON document shape', () => {
        const parsed = JSON.parse(serializeRecipes(fixtures)) as Record<string, unknown>;

        expect(Object.keys(parsed)).toEqual([
            'schemaVersion', 'recipes', 'capabilities', 'requirements',
            'contentTypes', 'fixedPages', 'bindings', 'adaptations',
        ]);
        expect(parsed.schemaVersion).toBe(1);
    });

    it('produces byte-identical JSON for shuffled recipe inputs', () => {
        const permutations = [fixtures, [...fixtures].reverse(), [fixtures[2]!, fixtures[0]!, fixtures[3]!, fixtures[1]!]];

        const serialized = permutations.map(serializeRecipes);

        expect(serialized[1]).toBe(serialized[0]);
        expect(serialized[2]).toBe(serialized[0]);
    });

    it('serializes the document as a Mermaid flowchart', () => {
        const graph = resolveCapabilityGraph(fixtures);
        expect(graph.ok).toBe(true);
        if (!graph.ok) return;
        const document = toCapabilityGraphDocument(graph.value);
        expect(document.ok).toBe(true);
        if (!document.ok) return;

        const mermaid = serializeCapabilityGraphMermaid(document.value);

        expect(mermaid.startsWith('flowchart TD')).toBe(true);
        expect(mermaid).toContain('-->');
        for (const fixture of fixtures) expect(mermaid).toContain(fixture.id);
    });

    it('rejects a graph document containing a private value', () => {
        const result = toCapabilityGraphDocument(minimalGraph('someone@example.com'));

        expect(result).toMatchObject({ ok: false, error: { code: 'private-value-detected' } });
    });

    it('accepts an ordinary route target', () => {
        const result = toCapabilityGraphDocument(minimalGraph('/contact/'));

        expect(result.ok).toBe(true);
    });
});
