import { z } from 'astro/zod';
import { posix } from 'node:path';
import { contentCompositionSchema, defaultReservedContentRoutes } from '../contracts/content-composition.js';
import type { ContentComposition, ContentTypeDefinition } from '../contracts/content-composition.js';
import { buildShellFiles, shellRecipe } from './shell-recipe.js';
import type { ShellConfiguration, ShellRecipeOptions } from './shell-recipe.js';
import type { RecipeGeneratedFile, RecipeMetadata } from './types.js';
import type { RecipeOutputContribution } from './schema.js';

const supportedTraits = new Set(['title', 'slug', 'summary', 'image', 'body']);
const supportedBindings = new Set(['list', 'detail', 'navigation', 'cms-admin']);
const contentRuntimeRange = '^1.6.0';

export interface ContentSiteOptions {
    readonly mediaFolder?: string;
    readonly shellConfiguration?: ShellConfiguration;
}

export const generatedContentCompositionSchema = contentCompositionSchema.superRefine((composition, context) => {
    if (composition.contentLocales.length !== 1) {
        context.addIssue({ code: 'custom', path: ['contentLocales'], message: 'Content generation currently requires exactly one locale' });
    }
    if (!composition.contentTypes.length) {
        context.addIssue({ code: 'custom', path: ['contentTypes'], message: 'Content generation requires at least one content type' });
    }
    const routes: string[] = [];
    composition.contentTypes.forEach((type, index) => {
        const path = ['contentTypes', index];
        for (const trait of type.traits) {
            if (!supportedTraits.has(trait)) context.addIssue({ code: 'custom', path: [...path, 'traits'], message: `Content generation does not yet support trait "${trait}"` });
        }
        for (const binding of type.bindings) {
            if (!supportedBindings.has(binding)) context.addIssue({ code: 'custom', path: [...path, 'bindings'], message: `Content generation does not yet support binding "${binding}"` });
        }
        if (!type.bindings.includes('list') || !type.bindings.includes('detail')) {
            context.addIssue({ code: 'custom', path: [...path, 'bindings'], message: 'Content generation requires both list and detail bindings' });
        }
        for (const route of Object.values(type.routes)) {
            const base = route.replace(/\/$/, '');
            if (!/^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(base)
                || defaultReservedContentRoutes.some((reserved) => reserved !== '/' && `${base}/`.startsWith(reserved))) {
                context.addIssue({ code: 'custom', path: [...path, 'routes'], message: `Unsupported generated content route "${route}"; use non-reserved lowercase path segments` });
            }
            if (routes.some((other) => base.startsWith(`${other}/`) || other.startsWith(`${base}/`))) {
                context.addIssue({ code: 'custom', path: [...path, 'routes'], message: `Generated list/detail routes overlap at "${route}"` });
            }
            routes.push(base);
        }
    });
});

function routeBase(type: ContentTypeDefinition, locale: string): string {
    return type.routes[locale]!.replace(/\/$/, '');
}

function collectionSchema(type: ContentTypeDefinition): string {
    const shapes = ['...titleTraitSchema.unwrap().shape', '...slugTraitSchema.unwrap().shape'];
    if (type.traits.includes('summary')) shapes.push('...summaryTraitSchema.unwrap().shape');
    if (type.traits.includes('image')) {
        shapes.push('image: imageTraitSchema.unwrap().shape.image.unwrap().extend({ src: image() })');
    }
    // File-based IDs keep duplicate public slugs visible to route validation.
    return `${JSON.stringify(type.id)}: defineCollection({
    loader: glob({ pattern: '**/*.md', base: ${JSON.stringify(`./src/content/${type.id}`)}, generateId: ({ entry }) => entry.replace(/\\.md$/, '') }),
    schema: ${type.traits.includes('image') ? '({ image }) => ' : ''}z.object({ ${shapes.join(', ')} }).strict(),
  })`;
}

function adapterSource(type: ContentTypeDefinition, locale: string, index: number): string {
    const contracts = ['HasTitle', 'HasSlug', ...(type.traits.includes('summary') ? ['HasSummary'] : []), ...(type.traits.includes('image') ? ['HasImage'] : [])];
    return `import type { CollectionEntry } from 'astro:content';
import { assertImplements, type Item, type Linkable, ${contracts.map((name) => `type ${name}`).join(', ')} } from '@easy-web/core/contracts';
import { composition } from '../../content/definitions';

type Entry = CollectionEntry<${JSON.stringify(type.id)}>;
assertImplements<Entry['data'], ${contracts.join(' & ')}>();

export function toItem(entry: Entry): Item & Linkable {
  const data = entry.data;
  return {
    title: data.title,
    ${type.traits.includes('summary') ? 'description: data.summary,' : ''}
    ${type.traits.includes('image') ? 'image: data.image,' : ''}
    href: composition.contentTypes[${index}].routes[${JSON.stringify(locale)}].replace(/\\/$/, '') + '/' + data.slug + '/',
  };
}
`;
}

function listSource(type: ContentTypeDefinition, locale: string): string {
    const prefix = '../'.repeat(routeBase(type, locale).split('/').length);
    return `---
import { getCollection } from 'astro:content';
import Base from '${prefix}layouts/Base.astro';
import { toItem } from '${prefix}lib/content/${type.id}';
import Card from '@easy-web/core/components/Card.astro';
import CardGrid from '@easy-web/core/components/CardGrid.astro';

const items = (await getCollection(${JSON.stringify(type.id)}))
  .map(toItem).sort((left, right) => left.href < right.href ? -1 : left.href > right.href ? 1 : 0);
---
<Base title={${JSON.stringify(type.labels[locale])}}>
  <h1>{${JSON.stringify(type.labels[locale])}}</h1>
  <CardGrid>
    {items.map((item) => <Card item={item} />)}
  </CardGrid>
</Base>
`;
}

function detailSource(type: ContentTypeDefinition, locale: string): string {
    const prefix = '../'.repeat(routeBase(type, locale).split('/').length);
    return `---
import { getCollection, render, type CollectionEntry } from 'astro:content';
import type { Rendered, Item, Linkable } from '@easy-web/core/contracts';
import Base from '${prefix}layouts/Base.astro';
import { toItem } from '${prefix}lib/content/${type.id}';
import Prose from '@easy-web/core/components/Prose.astro';
${type.traits.includes('image') ? "import Media from '@easy-web/core/components/Media.astro';" : ''}

export async function getStaticPaths() {
  const entries = await getCollection(${JSON.stringify(type.id)});
  const seen = new Set<string>();
  return entries.map((entry) => {
    if (seen.has(entry.data.slug)) throw new Error('Duplicate content slug: ' + entry.data.slug);
    seen.add(entry.data.slug);
    return { params: { slug: entry.data.slug }, props: { entry } };
  });
}

interface Props { entry: CollectionEntry<${JSON.stringify(type.id)}> }
const { entry } = Astro.props;
const rendered: Rendered<Item & Linkable> = { ...toItem(entry), ...(await render(entry)) };
const { Content } = rendered;
---
<Base title={rendered.title} description={rendered.description}${type.traits.includes('image') ? ' image={rendered.image?.src && (typeof rendered.image.src === \'string\' ? rendered.image.src : rendered.image.src.src)}' : ''}>
  <Prose>
    <h1>{rendered.title}</h1>
    {rendered.description && <p>{rendered.description}</p>}
    ${type.traits.includes('image') ? '{rendered.image && <Media image={rendered.image} />}' : ''}
    <Content />
  </Prose>
</Base>
`;
}

function contentFiles(composition: ContentComposition, options: ContentSiteOptions): readonly RecipeGeneratedFile[] {
    const locale = composition.contentLocales[0]!;
    const mediaFolder = z.string().regex(/^src\/assets(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/)
        .parse(options.mediaFolder ?? 'src/assets');
    const exampleImage = `${mediaFolder}/content-example.svg`;
    const files: RecipeGeneratedFile[] = [
        { path: 'src/content/definitions.ts', content: `import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { titleTraitSchema, slugTraitSchema${composition.contentTypes.some((type) => type.traits.includes('summary')) ? ', summaryTraitSchema' : ''}${composition.contentTypes.some((type) => type.traits.includes('image')) ? ', imageTraitSchema' : ''} } from '@easy-web/core/contracts';

export const composition = ${JSON.stringify(composition, null, 2)} as const;

export const collections = {
  ${composition.contentTypes.map(collectionSchema).join(',\n  ')},
};
` },
        { path: 'src/content.config.ts', content: "export { collections } from './content/definitions';\n" },
        { path: 'package.json', content: `${JSON.stringify({ dependencies: {
            '@easy-web/core': contentRuntimeRange,
            ...(composition.contentTypes.some((type) => type.traits.includes('image')) ? { sharp: '^0.35.0' } : {}),
        } }, null, 2)}\n` },
    ];
    if (composition.contentTypes.some((type) => type.traits.includes('image'))) {
        files.push({ path: exampleImage, content: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#334155"/><circle cx="320" cy="180" r="90" fill="#94a3b8"/></svg>\n' });
    }
    for (const [index, type] of composition.contentTypes.entries()) {
        const data = {
            title: `${type.labels[locale]} - ${locale === 'de' ? 'Beispiel' : 'Example'}`,
            slug: 'example',
            ...(type.traits.includes('summary') ? { summary: locale === 'de' ? 'Generierter Beispielinhalt.' : 'Generated example content.' } : {}),
            ...(type.traits.includes('image') ? { image: { src: posix.relative(`src/content/${type.id}`, exampleImage), alt: locale === 'de' ? 'Kreis auf dunklem Hintergrund' : 'Circle on a dark background' } } : {}),
        };
        const base = routeBase(type, locale).slice(1);
        files.push(
            { path: `src/content/${type.id}/example.md`, content: `---\n${JSON.stringify(data, null, 2)}\n---\n\n${locale === 'de' ? 'Ersetze diesen Beispielinhalt vor der Veroeffentlichung.' : 'Replace this example content before production.'}\n` },
            { path: `src/lib/content/${type.id}.ts`, content: adapterSource(type, locale, index) },
            { path: `src/pages/${base}/index.astro`, content: listSource(type, locale) },
            { path: `src/pages/${base}/[slug].astro`, content: detailSource(type, locale) },
        );
    }
    return files;
}

/** Bind package-owned content generation to a validated composition, independently of a CMS. */
export function createContentSiteRecipes(rawComposition: unknown, options: ContentSiteOptions = {}): {
    readonly shell: RecipeMetadata<ShellRecipeOptions>;
    readonly content: RecipeMetadata;
} {
    const composition = generatedContentCompositionSchema.parse(rawComposition);
    const locale = composition.contentLocales[0]!;
    const files = contentFiles(composition, options);
    const contributions: RecipeOutputContribution[] = files
        .filter(({ path }) => !path.startsWith('src/pages/'))
        .map(({ path }, index) => ({ kind: path === 'package.json' ? 'dependency' : 'file', id: `content.file.${index}`, target: path }));
    for (const type of composition.contentTypes) {
        contributions.push(
            { kind: 'content', id: `content.type.${type.id}`, target: type.primary ? 'primary' : 'additional' },
            { kind: 'route', id: `content.list.${type.id}`, target: `${routeBase(type, locale)}/` },
            { kind: 'route', id: `content.detail.${type.id}`, target: `${routeBase(type, locale)}/[slug]` },
            ...type.bindings.map((binding) => ({ kind: 'binding' as const, id: `content.binding.${type.id}.${binding}`, target: `content.type.${type.id}` })),
        );
    }
    const navigation = composition.contentTypes.filter((type) => type.bindings.includes('navigation'))
        .map((type) => ({ label: type.labels[locale]!, href: `${routeBase(type, locale)}/` }));
    return {
        shell: {
            ...shellRecipe,
            validators: [{
                id: 'shell.content-locale', phase: 'options',
                validate: ({ options }) => options.defaultLocale === locale ? [] : [{ code: 'CONTENT_LOCALE_MISMATCH', message: 'shell.defaultLocale must match the content composition locale' }],
            }],
            generate: ({ options: shellOptions }) => ({ files: buildShellFiles(shellOptions, navigation, options.shellConfiguration) }),
        },
        content: {
            id: 'content.pages', version: '1.7.1', protocolVersion: 1,
            compatibleCliRange: '^0.1.0 || ^0.2.0', compatibleRuntimeRange: contentRuntimeRange,
            provides: ['content.pages', 'content.typed-definitions'], requires: ['site.shell'], conflicts: [],
            order: { priority: 10, key: 'content' }, optionsSchema: z.strictObject({}),
            outputContributions: contributions, validators: [],
            generate: () => ({ files }),
        },
    };
}
