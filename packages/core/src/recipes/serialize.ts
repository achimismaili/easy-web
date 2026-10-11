import type { GraphResult, ResolvedCapabilityGraph, ResolvedContributionNode } from './graph.js';

export const CAPABILITY_GRAPH_SCHEMA_VERSION = 1 as const;

export interface CapabilityGraphDocument {
    readonly schemaVersion: 1;
    readonly recipes: ResolvedCapabilityGraph['recipes'];
    readonly capabilities: ResolvedCapabilityGraph['capabilities'];
    readonly requirements: ResolvedCapabilityGraph['requirements'];
    readonly contentTypes: ResolvedCapabilityGraph['contentTypes'];
    readonly fixedPages: readonly ResolvedContributionNode[];
    readonly bindings: readonly ResolvedContributionNode[];
    readonly adaptations: ResolvedCapabilityGraph['adaptations'];
}

export type GraphSerializationError = { readonly code: 'private-value-detected'; readonly path: string };

const PRIVATE_PATTERNS: readonly RegExp[] = [
    /[^\s@]+@[^\s@]+\.[^\s@]+/,
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/,
    /[a-zA-Z][a-zA-Z0-9+.-]*:\/\//,
    /[A-Za-z0-9]{40,}/,
];

function scanForPrivateValues(value: unknown, path: string): string | undefined {
    if (typeof value === 'string') {
        for (const pattern of PRIVATE_PATTERNS) if (pattern.test(value)) return path;
        return undefined;
    }
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            const hit = scanForPrivateValues(value[i], `${path}[${i}]`);
            if (hit) return hit;
        }
        return undefined;
    }
    if (value && typeof value === 'object') {
        for (const [key, val] of Object.entries(value)) {
            const hit = scanForPrivateValues(val, path ? `${path}.${key}` : key);
            if (hit) return hit;
        }
    }
    return undefined;
}

/** Pure projection of a resolved graph into a stable, inspectable document. Excludes file/dependency/configuration contributions. */
export function toCapabilityGraphDocument(
    graph: ResolvedCapabilityGraph,
): GraphResult<CapabilityGraphDocument, GraphSerializationError> {
    const isAdaptationTarget = new Set(graph.adaptations.map((adaptation) => adaptation.id));
    const nonFileContributions = graph.contributions.filter(
        (contribution) => contribution.kind !== 'file' && contribution.kind !== 'dependency' && contribution.kind !== 'configuration',
    );
    const fixedPages = nonFileContributions.filter((contribution) => contribution.kind === 'route');
    const bindings = nonFileContributions.filter(
        (contribution) => contribution.kind === 'binding' && !isAdaptationTarget.has(contribution.id),
    );

    const document: CapabilityGraphDocument = {
        schemaVersion: CAPABILITY_GRAPH_SCHEMA_VERSION,
        recipes: graph.recipes,
        capabilities: graph.capabilities,
        requirements: graph.requirements,
        contentTypes: graph.contentTypes,
        fixedPages,
        bindings,
        adaptations: graph.adaptations,
    };

    const hitPath = scanForPrivateValues(document, '');
    if (hitPath) return { ok: false, error: { code: 'private-value-detected', path: hitPath } };
    return { ok: true, value: document };
}

export function serializeCapabilityGraphJson(document: CapabilityGraphDocument): string {
    return JSON.stringify(document, null, 2);
}
