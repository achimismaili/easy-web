import { z } from 'astro/zod';
import { recipeArtifactReceiptSchema, recipeRegistryManifestSchema } from './registry.js';
import { recipeMetadataSchema } from './types.js';

export interface RecipeCompatibilityPolicy {
    readonly cliVersion: string;
    readonly runtimeVersion: string;
    /** Return false for invalid semver ranges as well as out-of-range versions. */
    readonly satisfies: (version: string, range: string) => boolean;
}

export const recipeAdmissionInputSchema = z.strictObject({
    registry: recipeRegistryManifestSchema,
    artifacts: z.array(z.strictObject({
        receipt: recipeArtifactReceiptSchema,
        recipe: recipeMetadataSchema,
    }).readonly()).readonly(),
}).readonly();

/**
 * Pure admission only: checks an explicitly selected set, never selects dependencies,
 * sorts recipes, emits a capability graph, imports sources or invokes any hook.
 * Receipts cannot prove byte integrity: the trusted loader must hash BEFORE import.
 */
export function createRecipeAdmissionSchema(policy: RecipeCompatibilityPolicy) {
    return recipeAdmissionInputSchema.superRefine(({ registry, artifacts }, context) => {
        const fail = (message: string, index: number) => context.addIssue({
            code: 'custom', message, path: ['artifacts', index],
        });
        const providers = new Map<string, number>();
        const ids = new Set<string>();
        for (const [index, { recipe, receipt }] of artifacts.entries()) {
            const pinned = registry.recipes.some((pin) =>
                pin.packageName === receipt.pin.packageName && pin.version === receipt.pin.version &&
                pin.integrity === receipt.pin.integrity && pin.exportPath === receipt.pin.exportPath);
            if (!pinned) fail('source-outside-pinned-set', index);
            if (receipt.verifiedIntegrity !== receipt.pin.integrity) fail('artifact-integrity-mismatch', index);
            if (recipe.version !== receipt.pin.version) fail('recipe-version-mismatch', index);
            if (!policy.satisfies(policy.cliVersion, recipe.compatibleCliRange)) fail('incompatible-cli-range', index);
            if (!policy.satisfies(policy.runtimeVersion, recipe.compatibleRuntimeRange)) fail('incompatible-runtime-range', index);
            if (ids.has(recipe.id)) fail('duplicate-recipe-id', index);
            ids.add(recipe.id);
            for (const capability of recipe.provides) {
                if (providers.has(capability)) fail('duplicate-provider-id', index);
                providers.set(capability, index);
            }
            for (const field of ['requires', 'conflicts'] as const) {
                if (new Set(recipe[field]).size !== recipe[field].length) fail(`duplicate-${field}`, index);
            }
        }
        for (const [index, { recipe }] of artifacts.entries()) {
            for (const requirement of recipe.requires) {
                if (!providers.has(requirement)) fail('missing-requirement', index);
            }
            for (const conflict of recipe.conflicts) {
                if (providers.has(conflict)) fail('conflicting-capability', index);
            }
        }
        // Reachability validation, not topological ordering or a graph resolver.
        const complete = new Set<number>();
        const active = new Set<number>();
        const visit = (index: number): void => {
            if (active.has(index)) { fail('dependency-cycle', index); return; }
            if (complete.has(index)) return;
            const artifact = artifacts[index];
            if (!artifact) return;
            active.add(index);
            for (const requirement of artifact.recipe.requires) {
                const provider = providers.get(requirement);
                if (provider !== undefined) visit(provider);
            }
            active.delete(index);
            complete.add(index);
        };
        for (const index of artifacts.keys()) visit(index);
    });
}
