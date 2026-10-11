import { z } from 'astro/zod';
import {
    recipeMetadataFields,
    recipeValidatorDescriptorSchema,
} from './schema.js';
import type { RecipeOutputContribution } from './schema.js';

export interface RecipeGeneratedFile {
    readonly path: string;
    readonly content: string | Uint8Array;
}

/** Hooks return output data; they receive no filesystem/process/target-node_modules access. */
export interface RecipeGenerationContext<Options = unknown> {
    readonly options: Options;
    readonly capabilities: readonly string[];
    readonly contributions: readonly RecipeOutputContribution[];
}

export interface RecipeGenerationOutput {
    readonly files: readonly RecipeGeneratedFile[];
}

export type RecipeGenerateHook<Options = unknown> = (
    context: RecipeGenerationContext<Options>,
) => RecipeGenerationOutput | Promise<RecipeGenerationOutput>;

export interface RecipeValidationContext<Options = unknown> extends RecipeGenerationContext<Options> {
    readonly output?: RecipeGenerationOutput;
}

export interface RecipeValidationIssue {
    readonly code: string;
    readonly message: string;
    readonly path?: string;
}

export type RecipeValidateHook<Options = unknown> = (
    context: RecipeValidationContext<Options>,
) => readonly RecipeValidationIssue[] | Promise<readonly RecipeValidationIssue[]>;

const validatorSchema = recipeValidatorDescriptorSchema.unwrap().extend({
    validate: z.custom<RecipeValidateHook>((value) => typeof value === 'function'),
}).readonly();

/** Shape admission never calls options parsing, validators or generation hooks. */
export const recipeMetadataSchema = z.strictObject({
    ...recipeMetadataFields,
    optionsSchema: z.instanceof(z.ZodType),
    validators: z.array(validatorSchema).readonly(),
    generate: z.custom<RecipeGenerateHook>((value) => typeof value === 'function'),
}).readonly();

/** Typed recipe implementations can use their own inferred Zod options. */
export type RecipeMetadata<Options = unknown> = Omit<
    z.infer<typeof recipeMetadataSchema>, 'optionsSchema' | 'generate' | 'validators'
> & {
    readonly optionsSchema: z.ZodType<Options>;
    readonly generate: RecipeGenerateHook<Options>;
    readonly validators: readonly (z.infer<typeof recipeValidatorDescriptorSchema> & {
        readonly validate: RecipeValidateHook<Options>;
    })[];
};
