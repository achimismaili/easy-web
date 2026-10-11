import type { CapabilityGraphDocument } from './serialize.js';

function sanitizeId(prefix: string, raw: string, used: Set<string>): string {
    const base = `${prefix}_${raw.replace(/[^A-Za-z0-9_]/g, '_')}`;
    let candidate = base;
    let n = 1;
    while (used.has(candidate)) candidate = `${base}_${n++}`;
    used.add(candidate);
    return candidate;
}

function escapeLabel(text: string): string {
    return text
        .replace(/&/g, '#38;')
        .replace(/"/g, '#34;')
        .replace(/</g, '#60;')
        .replace(/>/g, '#62;');
}

export function serializeCapabilityGraphMermaid(document: CapabilityGraphDocument): string {
    const used = new Set<string>();
    const lines: string[] = ['flowchart TD'];
    const recipeIds = new Map<string, string>();
    const capabilityIds = new Map<string, string>();

    for (const recipe of document.recipes) {
        const id = sanitizeId('r', recipe.id, used);
        recipeIds.set(recipe.id, id);
        lines.push(`  ${id}["${escapeLabel(recipe.id)}@${escapeLabel(recipe.version)}"]`);
    }
    for (const capability of document.capabilities) {
        const id = sanitizeId('c', capability.id, used);
        capabilityIds.set(capability.id, id);
        lines.push(`  ${id}(["${escapeLabel(capability.id)}"])`);
        const providerId = recipeIds.get(capability.providerRecipeId);
        if (providerId) lines.push(`  ${providerId} -->|provides| ${id}`);
    }
    for (const requirement of document.requirements) {
        const consumerId = recipeIds.get(requirement.consumerRecipeId);
        const capabilityId = capabilityIds.get(requirement.capability);
        if (consumerId && capabilityId) lines.push(`  ${consumerId} -.->|requires| ${capabilityId}`);
    }
    for (const page of document.fixedPages) {
        const id = sanitizeId('p', page.id, used);
        lines.push(`  ${id}["page: ${escapeLabel(page.target)}"]`);
        const ownerId = recipeIds.get(page.provenance.contributedBy);
        if (ownerId) lines.push(`  ${ownerId} -->|fixed page| ${id}`);
    }
    if (document.contentTypes.primary) {
        const content = document.contentTypes.primary;
        const id = sanitizeId('t', content.id, used);
        lines.push(`  ${id}["primary content: ${escapeLabel(content.target)}"]`);
        const ownerId = recipeIds.get(content.provenance.contributedBy);
        if (ownerId) lines.push(`  ${ownerId} -->|content| ${id}`);
    }
    for (const content of document.contentTypes.additional) {
        const id = sanitizeId('t', content.id, used);
        lines.push(`  ${id}["content: ${escapeLabel(content.target)}"]`);
        const ownerId = recipeIds.get(content.provenance.contributedBy);
        if (ownerId) lines.push(`  ${ownerId} -->|content| ${id}`);
    }
    for (const binding of document.bindings) {
        const id = sanitizeId('b', binding.id, used);
        lines.push(`  ${id}["binding: ${escapeLabel(binding.target)}"]`);
        const ownerId = recipeIds.get(binding.provenance.contributedBy);
        if (ownerId) lines.push(`  ${ownerId} -->|binds| ${id}`);
    }
    for (const adaptation of document.adaptations) {
        const id = sanitizeId('a', adaptation.id, used);
        lines.push(`  ${id}["adaptation -> ${escapeLabel(adaptation.targetContributionId)}"]`);
        const ownerId = recipeIds.get(adaptation.provenance.contributedBy);
        if (ownerId) lines.push(`  ${ownerId} -.->|adapts| ${id}`);
    }
    return `${lines.join('\n')}\n`;
}
