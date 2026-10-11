import { z } from 'astro/zod';

/** Increment only for a breaking recipe protocol change, independently of package semver. */
export const RECIPE_PROTOCOL_VERSION = 1 as const;

export const recipeIdSchema = z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*(?:[./:-][a-zA-Z0-9]+)*$/);
export const recipeVersionSchema = z.string().regex(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/,
);
/** Semver range syntax and satisfaction are checked by the resolver's semver policy. */
export const recipeCompatibilityRangeSchema = z.string().trim().min(1);

export const recipeOutputContributionSchema = z.strictObject({
    kind: z.enum(['file', 'dependency', 'route', 'content', 'binding', 'configuration']),
    id: recipeIdSchema,
    /** Logical destination; filesystem path safety belongs to the generation boundary. */
    target: z.string().min(1),
}).readonly();

export const recipeValidatorDescriptorSchema = z.strictObject({
    id: recipeIdSchema,
    phase: z.enum(['options', 'output']),
}).readonly();

export const recipeMetadataFields = {
    id: recipeIdSchema,
    version: recipeVersionSchema,
    protocolVersion: z.literal(RECIPE_PROTOCOL_VERSION),
    compatibleCliRange: recipeCompatibilityRangeSchema,
    compatibleRuntimeRange: recipeCompatibilityRangeSchema,
    // Like HasImage/Linkable, capabilities express traits, not customer/domain identities.
    provides: z.array(recipeIdSchema).min(1).readonly(),
    requires: z.array(recipeIdSchema).readonly(),
    conflicts: z.array(recipeIdSchema).readonly(),
    /** Lower priority first, then key, then recipe id; dependencies precede consumers. */
    order: z.strictObject({ priority: z.number().int(), key: recipeIdSchema }).readonly(),
    outputContributions: z.array(recipeOutputContributionSchema).readonly(),
};

/** Serializable projection: executable hooks and Zod instances are deliberately excluded. */
export const recipeMetadataDescriptorSchema = z.strictObject({
    ...recipeMetadataFields,
    optionsSchema: z.record(z.string(), z.json()),
    validators: z.array(recipeValidatorDescriptorSchema).readonly(),
    generate: z.literal('direct'),
}).readonly();

export type RecipeMetadataDescriptor = z.infer<typeof recipeMetadataDescriptorSchema>;
export type RecipeOutputContribution = z.infer<typeof recipeOutputContributionSchema>;
export type RecipeValidatorDescriptor = z.infer<typeof recipeValidatorDescriptorSchema>;

/** Import from @easy-web/core/recipes/schema without evaluating the core barrel. */
export const recipeMetadataJsonSchema = z.toJSONSchema(recipeMetadataDescriptorSchema);
