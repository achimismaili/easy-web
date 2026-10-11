import { readFile } from 'node:fs/promises';
import { z } from 'astro/zod';
import { shellRecipe } from '@easy-web/core/recipes';
import { authRecipe } from '@easy-web/auth/recipe';
import { cmsMediaRecipe } from '@easy-web/cms-adapters';
import type { RecipeMetadata } from '@easy-web/core/recipes';
import { CreateError, invalid } from './errors.js';

const configSchema = z.strictObject({
    target: z.string().trim().min(1),
    recipes: z.strictObject({
        shell: shellRecipe.optionsSchema.default(() => shellRecipe.optionsSchema.parse({})),
        auth: authRecipe.optionsSchema.optional(),
        cms: cmsMediaRecipe.optionsSchema.optional(),
    }).default(() => ({ shell: shellRecipe.optionsSchema.parse({}) })),
}).readonly();

export type CreateConfig = z.infer<typeof configSchema>;

export interface RecipeSelection {
    readonly recipe: RecipeMetadata;
    readonly options: unknown;
}

// Capture each recipe's typed options at admission; the composer sees one uniform hook type.
function select<Options>(recipe: RecipeMetadata<Options>, options: Options): RecipeSelection {
    return {
        options,
        recipe: {
            ...recipe,
            generate: (context) => recipe.generate({ ...context, options }),
            validators: recipe.validators.map((validator) => ({
                ...validator,
                validate: (context) => validator.validate({ ...context, options }),
            })),
        },
    };
}

export function selectionsFor(config: CreateConfig): readonly RecipeSelection[] {
    return [
        select(shellRecipe, config.recipes.shell),
        ...(config.recipes.cms ? [select(cmsMediaRecipe, config.recipes.cms)] : []),
        ...(config.recipes.auth ? [select(authRecipe, config.recipes.auth)] : []),
    ];
}

export function parseCreateConfig(value: unknown): CreateConfig {
    const parsed = configSchema.safeParse(value);
    if (!parsed.success) invalid(`Invalid create config: ${parsed.error.message}`);
    return parsed.data;
}

export async function readCreateConfig(path: string): Promise<CreateConfig> {
    try {
        return parseCreateConfig(JSON.parse(await readFile(path, 'utf8')));
    } catch (error) {
        if (error instanceof CreateError) throw error;
        throw new CreateError('INVALID_INPUT', `Cannot read create config: ${path}`, { cause: error });
    }
}
