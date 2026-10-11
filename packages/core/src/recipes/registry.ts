import { z } from 'astro/zod';
import { RECIPE_PROTOCOL_VERSION, recipeVersionSchema } from './schema.js';

/** Closed first-party owners, not an open @easy-web/* namespace trust rule. */
export const recipePackageNameSchema = z.enum([
    '@easy-web/core', '@easy-web/cms-adapters', '@easy-web/swa', '@easy-web/auth', '@easy-web/brand',
]);

export const recipeIntegritySchema = z.string().regex(/^sha512-[A-Za-z0-9+/]{86}==$/);
export const recipeExportPathSchema = z.string().regex(/^\.\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*(?:\.[a-zA-Z0-9_-]+)?$/);

/**
 * CLI-owned pins are the authority. NEVER load recipes from a generation target's
 * node_modules. Only CLI-pinned or bundled verified artifacts may be imported.
 * This manifest describes a loader contract; it performs no import or I/O.
 */
export const recipeRegistryPinSchema = z.strictObject({
    packageName: recipePackageNameSchema,
    version: recipeVersionSchema,
    integrity: recipeIntegritySchema,
    exportPath: recipeExportPathSchema,
}).readonly();

export const recipeRegistryManifestSchema = z.strictObject({
    protocolVersion: z.literal(RECIPE_PROTOCOL_VERSION),
    recipes: z.array(recipeRegistryPinSchema).readonly(),
}).superRefine((manifest, context) => {
    const sources = new Set<string>();
    for (const pin of manifest.recipes) {
        const key = `${pin.packageName}:${pin.exportPath}`;
        if (sources.has(key)) {
            context.addIssue({ code: 'custom', message: 'duplicate-registry-source', path: ['recipes'] });
        }
        sources.add(key);
    }
}).readonly();

/** Receipt supplied by the future loader AFTER hashing artifact bytes, BEFORE import. */
export const recipeArtifactReceiptSchema = z.strictObject({
    source: z.enum(['cli-pinned', 'bundled']),
    pin: recipeRegistryPinSchema,
    verifiedIntegrity: recipeIntegritySchema,
}).readonly();

export type RecipeRegistryPin = z.infer<typeof recipeRegistryPinSchema>;
export type RecipeRegistryManifest = z.infer<typeof recipeRegistryManifestSchema>;
export type RecipeArtifactReceipt = z.infer<typeof recipeArtifactReceiptSchema>;
export const recipeRegistryJsonSchema = z.toJSONSchema(recipeRegistryManifestSchema);
