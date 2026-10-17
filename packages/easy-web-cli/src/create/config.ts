import { readFile } from 'node:fs/promises';
import { z } from 'astro/zod';
import { shellRecipe, createContentSiteRecipes, generatedContentCompositionSchema } from '@easy-web/core/recipes';
import { authRecipe } from '@easy-web/auth/recipe';
import { cmsMediaRecipe, cmsSiteOptionsSchema, createCmsContentSiteRecipes } from '@easy-web/cms-adapters';
import type { RecipeMetadata } from '@easy-web/core/recipes';
import { CreateError, invalid } from './errors.js';

const configSchema = z.strictObject({
    target: z.string().trim().min(1),
    composition: generatedContentCompositionSchema.optional(),
    recipes: z.strictObject({
        shell: shellRecipe.optionsSchema.default(() => shellRecipe.optionsSchema.parse({})),
        auth: authRecipe.optionsSchema.optional(),
        cms: z.union([cmsSiteOptionsSchema, cmsMediaRecipe.optionsSchema]).optional(),
    }).default(() => ({ shell: shellRecipe.optionsSchema.parse({}) })),
}).superRefine((config, context) => {
    const cms = config.recipes.cms;
    if (config.composition && cms && 'composition' in cms) {
        context.addIssue({ code: 'custom', path: ['recipes', 'cms', 'composition'], message: 'Declare composition only once, at the top level, when generating content pages with CMS' });
    }
    if (!config.composition && cms && !('composition' in cms)) {
        context.addIssue({ code: 'custom', path: ['composition'], message: 'CMS editor generation requires a top-level content composition' });
    }
    if (config.composition) {
        const hasCmsBindings = config.composition.contentTypes.some((type) => type.bindings.includes('cms-admin'));
        if (hasCmsBindings && !cms) context.addIssue({ code: 'custom', path: ['recipes', 'cms'], message: 'cms-admin bindings require the CMS recipe' });
        if (cms && !hasCmsBindings) context.addIssue({ code: 'custom', path: ['composition'], message: 'CMS generation requires at least one cms-admin content binding' });
    }
    if (config.composition && config.recipes.auth) {
        context.addIssue({ code: 'custom', path: ['recipes', 'auth'], message: 'Content composition with application auth is not yet supported' });
    }
    if (config.composition && config.recipes.shell.defaultLocale !== config.composition.contentLocales[0]) {
        context.addIssue({ code: 'custom', path: ['recipes', 'shell', 'defaultLocale'], message: 'shell.defaultLocale must match the content composition locale' });
    }
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
    const cmsOptions = config.recipes.cms;
    const cmsSite = config.composition && cmsOptions && !('composition' in cmsOptions)
        ? createCmsContentSiteRecipes(config.composition, cmsOptions) : undefined;
    const contentRecipes = cmsSite ?? (config.composition ? createContentSiteRecipes(config.composition) : undefined);
    return [
        select(contentRecipes?.shell ?? shellRecipe, config.recipes.shell),
        ...(contentRecipes ? [select(contentRecipes.content, {})] : []),
        ...(cmsSite ? [select(cmsSite.cms, {})] : []),
        ...(cmsOptions && 'composition' in cmsOptions ? [select(cmsMediaRecipe, cmsOptions)] : []),
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
