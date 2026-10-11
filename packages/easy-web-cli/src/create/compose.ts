import { z } from 'astro/zod';
import {
    resolveCapabilityGraph, toCapabilityGraphDocument,
    serializeCapabilityGraphJson, serializeCapabilityGraphMermaid,
} from '@easy-web/core/recipes';
import type { RecipeGeneratedFile, RecipeOutputContribution } from '@easy-web/core/recipes';
import type { RecipeSelection } from './config.js';
import { invalid } from './errors.js';

export function outputPath(contribution: RecipeOutputContribution): string {
    const { target } = contribution;
    return contribution.kind === 'route' && target.startsWith('/')
        ? target === '/' ? 'src/pages/index.astro' : `src/pages${target}.astro`
        : target;
}

export function safeOutputPath(path: string): string {
    const segments = path.split('/');
    if (!path || segments.some((segment) => !segment || segment === '.' || segment === '..'
        || /^\.git$/i.test(segment) || /[\\:*?"<>|]/.test(segment)
        || [...segment].some((character) => character.charCodeAt(0) < 32)
        || /[. ]$/.test(segment) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment))) {
        invalid(`Unsafe generated path: ${path}`);
    }
    return path;
}

const packageFragmentSchema = z.object({
    dependencies: z.record(z.string(), z.string()).optional(),
    devDependencies: z.record(z.string(), z.string()).optional(),
    scripts: z.record(z.string(), z.string()).optional(),
}).catchall(z.json());

export function mergePackageFragments(fragments: readonly string[]): string {
    // Accumulator retains every top-level field and merges the three map-valued fields.
    let merged: Record<string, z.infer<ReturnType<typeof z.json>>> = {};
    for (const fragment of fragments) {
        const parsed = packageFragmentSchema.safeParse(JSON.parse(fragment));
        if (!parsed.success) invalid(`Invalid package.json fragment: ${parsed.error.message}`);
        const previous = packageFragmentSchema.parse(merged);
        merged = { ...merged, ...parsed.data };
        for (const key of ['dependencies', 'devDependencies', 'scripts'] as const) {
            if (previous[key] || parsed.data[key]) merged[key] = { ...previous[key], ...parsed.data[key] };
        }
    }
    return `${JSON.stringify(merged, null, 2)}\n`;
}

export interface ComposedSite {
    readonly files: readonly RecipeGeneratedFile[];
    readonly graphJson: string;
    readonly graphMermaid: string;
}

export async function composeRecipes(selections: readonly RecipeSelection[]): Promise<ComposedSite> {
    const resolved = resolveCapabilityGraph(selections.map(({ recipe }) => recipe));
    if (!resolved.ok) invalid(`Recipe resolution failed: ${JSON.stringify(resolved.error)}`);
    const graph = resolved.value;
    const owners = new Map<string, string>();
    for (const { recipe } of selections) {
        for (const contribution of recipe.outputContributions) {
            const path = safeOutputPath(outputPath(contribution));
            const key = path.toLowerCase();
            if (owners.has(key) && path !== 'package.json') {
                if (path === 'astro.config.mjs' && contribution.kind === 'configuration') {
                    invalid('multi-recipe astro.config.mjs merge not yet supported in Phase 1 — select recipes individually or wait for a future composer');
                }
                invalid(`Shared output is not mergeable: ${path}`);
            }
            owners.set(key, path);
        }
    }
    const files = new Map<string, RecipeGeneratedFile>();
    const fragments: string[] = [];
    for (const node of graph.recipes) {
        const selection = selections.find(({ recipe }) => recipe.id === node.id);
        if (!selection) invalid(`Missing selected recipe: ${node.id}`);
        const { recipe } = selection;
        const options = recipe.optionsSchema.parse(selection.options);
        const context = { options, capabilities: graph.capabilities.map(({ id }) => id), contributions: recipe.outputContributions };
        for (const validator of recipe.validators.filter(({ phase }) => phase === 'options')) {
            const issues = await validator.validate(context);
            if (issues.length) invalid(`Recipe validation failed: ${JSON.stringify(issues)}`);
        }
        const output = await recipe.generate(context);
        const declared = recipe.outputContributions.map(outputPath).sort();
        const generated = output.files.map(({ path }) => safeOutputPath(path)).sort();
        if (new Set(generated).size !== generated.length || JSON.stringify(declared) !== JSON.stringify(generated)) {
            invalid(`Generated files differ from declared contributions: ${recipe.id}`);
        }
        for (const file of output.files) {
            if (file.path === 'package.json') fragments.push(String(file.content));
            else files.set(file.path, file);
        }
    }
    if (fragments.length) files.set('package.json', { path: 'package.json', content: mergePackageFragments(fragments) });
    const output = { files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path, 'en')) };
    for (const { recipe, options } of selections) {
        for (const validator of recipe.validators.filter(({ phase }) => phase === 'output')) {
            const issues = await validator.validate({ options, capabilities: graph.capabilities.map(({ id }) => id), contributions: recipe.outputContributions, output });
            if (issues.length) invalid(`Recipe validation failed: ${JSON.stringify(issues)}`);
        }
    }
    const document = toCapabilityGraphDocument(graph);
    if (!document.ok) invalid(`Graph serialization failed: ${document.error.code}`);
    return { ...output, graphJson: serializeCapabilityGraphJson(document.value), graphMermaid: serializeCapabilityGraphMermaid(document.value) };
}
