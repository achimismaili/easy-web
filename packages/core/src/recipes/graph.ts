import type { RecipeOutputContribution } from './schema.js';
import type { RecipeMetadata } from './types.js';

export type GraphResult<T, E> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: E };

export type RecipeInclusion =
    | { readonly kind: 'direct' }
    | { readonly kind: 'transitive'; readonly requiredBy: readonly string[] };

export type GraphProvenance = {
    readonly contributedBy: string;
    readonly recipeVersion: string;
    readonly inclusion: RecipeInclusion;
};

export type ResolvedRecipeNode = {
    readonly id: string;
    readonly version: string;
    readonly provides: readonly string[];
    readonly requires: readonly string[];
    readonly conflicts: readonly string[];
    readonly provenance: GraphProvenance;
};

export type ResolvedCapabilityNode = {
    readonly id: string;
    readonly providerRecipeId: string;
    readonly provenance: GraphProvenance;
};

export type ResolvedRequirementEdge = {
    readonly capability: string;
    readonly consumerRecipeId: string;
    readonly providerRecipeId: string;
};

export type ResolvedContributionNode = RecipeOutputContribution & {
    readonly provenance: GraphProvenance;
};

export type ResolvedAdaptationNode = ResolvedContributionNode & {
    readonly kind: 'binding';
    readonly targetContributionId: string;
};

export type ResolvedCapabilityGraph = {
    readonly recipes: readonly ResolvedRecipeNode[];
    readonly capabilities: readonly ResolvedCapabilityNode[];
    readonly requirements: readonly ResolvedRequirementEdge[];
    readonly contributions: readonly ResolvedContributionNode[];
    readonly fixedPages: readonly ResolvedContributionNode[];
    readonly contentTypes: {
        readonly primary?: ResolvedContributionNode;
        readonly additional: readonly ResolvedContributionNode[];
    };
    readonly adaptations: readonly ResolvedAdaptationNode[];
};

export type GraphResolutionError =
    | { readonly code: 'duplicate-recipe-id'; readonly recipeId: string }
    | { readonly code: 'duplicate-provider'; readonly capability: string; readonly recipeIds: readonly string[] }
    | { readonly code: 'missing-requirement'; readonly recipeId: string; readonly capability: string }
    | { readonly code: 'dependency-cycle'; readonly recipeIds: readonly string[] }
    | { readonly code: 'conflicting-capability'; readonly recipeId: string; readonly conflictingRecipeId: string; readonly capability: string }
    | { readonly code: 'duplicate-contribution-id'; readonly contributionId: string; readonly recipeIds: readonly string[] }
    | { readonly code: 'output-conflict'; readonly kind: 'file' | 'route'; readonly target: string; readonly recipeIds: readonly string[] }
    | { readonly code: 'invalid-content-role'; readonly contributionId: string; readonly target: string }
    | { readonly code: 'multiple-primary-content'; readonly contributionIds: readonly string[]; readonly recipeIds: readonly string[] };

const compareText = (left: string, right: string): number => left.localeCompare(right, 'en');
const compareRecipe = (left: RecipeMetadata, right: RecipeMetadata): number =>
    left.order.priority - right.order.priority || compareText(left.order.key, right.order.key) || compareText(left.id, right.id);
const compareContribution = (left: ResolvedContributionNode, right: ResolvedContributionNode): number =>
    compareText(left.kind, right.kind) || compareText(left.id, right.id) || compareText(left.target, right.target) ||
    compareText(left.provenance.contributedBy, right.provenance.contributedBy);
const failure = <E extends GraphResolutionError>(error: E): GraphResult<never, E> => ({ ok: false, error });

/**
 * Resolves admitted in-memory recipe metadata without executing hooks or observing a target.
 * Route contributions are fixed pages. Content targets are `primary` or `additional`.
 * Binding ids prefixed with `adaptation.` activate only when their target contribution exists.
 */
export function resolveCapabilityGraph(
    recipes: readonly RecipeMetadata[],
): GraphResult<ResolvedCapabilityGraph, GraphResolutionError> {
    const canonical = [...recipes].sort(compareRecipe);
    const recipeById = new Map<string, RecipeMetadata>();
    const providerByCapability = new Map<string, RecipeMetadata>();

    for (const recipe of canonical) {
        if (recipeById.has(recipe.id)) return failure({ code: 'duplicate-recipe-id', recipeId: recipe.id });
        recipeById.set(recipe.id, recipe);
        for (const capability of [...recipe.provides].sort(compareText)) {
            const provider = providerByCapability.get(capability);
            if (provider) {
                return failure({
                    code: 'duplicate-provider', capability,
                    recipeIds: [provider.id, recipe.id].sort(compareText),
                });
            }
            providerByCapability.set(capability, recipe);
        }
    }

    const requirements: ResolvedRequirementEdge[] = [];
    const dependencyIds = new Map<string, Set<string>>();
    const requiredBy = new Map<string, Set<string>>();
    for (const recipe of canonical) {
        const dependencies = new Set<string>();
        for (const capability of [...recipe.requires].sort(compareText)) {
            const provider = providerByCapability.get(capability);
            if (!provider) return failure({ code: 'missing-requirement', recipeId: recipe.id, capability });
            dependencies.add(provider.id);
            const consumers = requiredBy.get(provider.id) ?? new Set<string>();
            consumers.add(recipe.id);
            requiredBy.set(provider.id, consumers);
            requirements.push({ capability, consumerRecipeId: recipe.id, providerRecipeId: provider.id });
        }
        dependencyIds.set(recipe.id, dependencies);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const stack: string[] = [];
    const findCycle = (recipeId: string): readonly string[] | undefined => {
        if (visiting.has(recipeId)) {
            const start = stack.indexOf(recipeId);
            return [...stack.slice(start), recipeId];
        }
        if (visited.has(recipeId)) return undefined;
        visiting.add(recipeId);
        stack.push(recipeId);
        const dependencies = [...(dependencyIds.get(recipeId) ?? [])].sort(compareText);
        for (const dependencyId of dependencies) {
            const cycle = findCycle(dependencyId);
            if (cycle) return cycle;
        }
        stack.pop();
        visiting.delete(recipeId);
        visited.add(recipeId);
        return undefined;
    };
    for (const recipe of canonical) {
        const cycle = findCycle(recipe.id);
        if (cycle) return failure({ code: 'dependency-cycle', recipeIds: cycle });
    }

    for (const recipe of canonical) {
        for (const capability of [...recipe.conflicts].sort(compareText)) {
            const provider = providerByCapability.get(capability);
            if (provider) {
                return failure({
                    code: 'conflicting-capability', recipeId: recipe.id,
                    conflictingRecipeId: provider.id, capability,
                });
            }
        }
    }

    const contributionOwners = new Map<string, RecipeMetadata>();
    const outputOwners = new Map<string, RecipeMetadata>();
    for (const recipe of canonical) {
        for (const contribution of [...recipe.outputContributions].sort((left, right) => compareText(left.id, right.id))) {
            const idOwner = contributionOwners.get(contribution.id);
            if (idOwner) {
                return failure({
                    code: 'duplicate-contribution-id', contributionId: contribution.id,
                    recipeIds: [idOwner.id, recipe.id].sort(compareText),
                });
            }
            contributionOwners.set(contribution.id, recipe);
            if (contribution.kind === 'file' || contribution.kind === 'route') {
                const key = `${contribution.kind}:${contribution.target}`;
                const outputOwner = outputOwners.get(key);
                if (outputOwner) {
                    return failure({
                        code: 'output-conflict', kind: contribution.kind, target: contribution.target,
                        recipeIds: [outputOwner.id, recipe.id].sort(compareText),
                    });
                }
                outputOwners.set(key, recipe);
            }
            if (contribution.kind === 'content' && contribution.target !== 'primary' && contribution.target !== 'additional') {
                return failure({ code: 'invalid-content-role', contributionId: contribution.id, target: contribution.target });
            }
        }
    }

    const ordered: RecipeMetadata[] = [];
    const remainingDependencies = new Map([...dependencyIds].map(([id, values]) => [id, new Set(values)]));
    while (ordered.length < canonical.length) {
        const ready = canonical.filter((recipe) =>
            !ordered.some((item) => item.id === recipe.id) && remainingDependencies.get(recipe.id)?.size === 0);
        const next = ready.sort(compareRecipe)[0];
        if (!next) break;
        ordered.push(next);
        for (const dependencies of remainingDependencies.values()) dependencies.delete(next.id);
    }

    const provenanceFor = (recipe: RecipeMetadata): GraphProvenance => {
        const consumers = [...(requiredBy.get(recipe.id) ?? [])].sort(compareText);
        return {
            contributedBy: recipe.id,
            recipeVersion: recipe.version,
            inclusion: consumers.length === 0 ? { kind: 'direct' } : { kind: 'transitive', requiredBy: consumers },
        };
    };
    const contributions = ordered.flatMap((recipe) => recipe.outputContributions
        .filter((item) => !item.id.startsWith('adaptation.') || contributionOwners.has(item.target))
        .map((item) => ({ ...item, provenance: provenanceFor(recipe) })))
        .sort(compareContribution);
    const primary = contributions.filter((item) => item.kind === 'content' && item.target === 'primary');
    if (primary.length > 1) {
        return failure({
            code: 'multiple-primary-content',
            contributionIds: primary.map((item) => item.id).sort(compareText),
            recipeIds: primary.map((item) => item.provenance.contributedBy).sort(compareText),
        });
    }

    return { ok: true, value: {
        recipes: ordered.map((recipe) => ({
            id: recipe.id, version: recipe.version,
            provides: [...recipe.provides].sort(compareText),
            requires: [...recipe.requires].sort(compareText),
            conflicts: [...recipe.conflicts].sort(compareText),
            provenance: provenanceFor(recipe),
        })),
        capabilities: [...providerByCapability].sort(([left], [right]) => compareText(left, right))
            .map(([id, provider]) => ({ id, providerRecipeId: provider.id, provenance: provenanceFor(provider) })),
        requirements: requirements.sort((left, right) => compareText(left.consumerRecipeId, right.consumerRecipeId) || compareText(left.capability, right.capability)),
        contributions,
        fixedPages: contributions.filter((item) => item.kind === 'route'),
        contentTypes: {
            ...(primary[0] ? { primary: primary[0] } : {}),
            additional: contributions.filter((item) => item.kind === 'content' && item.target === 'additional'),
        },
        adaptations: contributions.filter((item): item is ResolvedAdaptationNode =>
            item.kind === 'binding' && item.id.startsWith('adaptation.'))
            .map((item) => ({ ...item, targetContributionId: item.target })),
    } };
}
