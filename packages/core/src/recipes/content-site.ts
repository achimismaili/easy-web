import { z } from 'astro/zod';
import { posix } from 'node:path';
import { contentCompositionSchema, defaultReservedContentRoutes } from '../contracts/content-composition.js';
import type { ContentComposition, ContentTypeDefinition } from '../contracts/content-composition.js';
import { buildShellFiles, shellRecipe } from './shell-recipe.js';
import type { ShellConfiguration, ShellRecipeOptions } from './shell-recipe.js';
import type { RecipeGeneratedFile, RecipeMetadata } from './types.js';
import type { RecipeOutputContribution } from './schema.js';

const supportedTraits = new Set(['title', 'slug', 'summary', 'image', 'body', 'order']);
const supportedBindings = new Set(['list', 'detail', 'navigation', 'cms-admin']);
const contentRuntimeRange = '^1.6.0';
const orderedContentRuntimeRange = '^1.10.0';

function contentRuntimeFor(composition: ContentComposition): string {
    return composition.contentLocales.length > 1 || composition.contentTypes.some((type) => type.traits.includes('order'))
        ? orderedContentRuntimeRange : contentRuntimeRange;
}

export interface ContentSiteOptions {
    readonly mediaFolder?: string;
    readonly shellConfiguration?: ShellConfiguration;
}

export const generatedContentCompositionSchema = contentCompositionSchema.superRefine((composition, context) => {
    const locales = composition.contentLocales;
    const localeIds: readonly string[] = locales;
    if (locales.length > 1 && (locales.length !== 2 || !localeIds.includes('de') || !localeIds.includes('en'))) {
        context.addIssue({ code: 'custom', path: ['contentLocales'], message: 'Content generation supports one locale or the bilingual DE/EN pair' });
    }
    if (!composition.contentTypes.length) {
        context.addIssue({ code: 'custom', path: ['contentTypes'], message: 'Content generation requires at least one content type' });
    }
    const routes: string[] = [];
    const localeRoots = new Set(locales.slice(1).map((locale) => `/${locale}`));
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
            if (localeRoots.has(base)) {
                context.addIssue({ code: 'custom', path: [...path, 'routes'], message: `Generated content route "${route}" conflicts with the localized home page` });
            }
            if (routes.some((other) => base === other || base.startsWith(`${other}/`) || other.startsWith(`${base}/`))) {
                context.addIssue({ code: 'custom', path: [...path, 'routes'], message: `Generated list/detail routes overlap at "${route}"` });
            }
            routes.push(base);
        }
    });
});

function routeBase(type: ContentTypeDefinition, locale: string): string {
    return type.routes[locale]!.replace(/\/$/, '');
}

function collectionSchema(type: ContentTypeDefinition, locales: readonly string[]): string {
    const shapes = ['...titleTraitSchema.unwrap().shape', '...slugTraitSchema.unwrap().shape'];
    if (type.traits.includes('summary')) shapes.push('...summaryTraitSchema.unwrap().shape');
    if (type.traits.includes('image')) {
        shapes.push('image: imageTraitSchema.unwrap().shape.image.unwrap().extend({ src: image() })');
    }
    if (locales.length > 1) {
        shapes.push(`locale: z.enum(${JSON.stringify(locales)})`);
        shapes.push("translationKey: z.string().min(1).regex(/\\S/, 'Darf nicht nur aus Leerzeichen bestehen.')");
    }
    if (type.traits.includes('order')) shapes.push('...optionalOrderTraitSchema.unwrap().shape');
    // File-based IDs keep duplicate public slugs visible to route validation.
    return `${JSON.stringify(type.id)}: defineCollection({
    loader: glob({ pattern: '**/*.md', base: ${JSON.stringify(`./src/content/${type.id}`)}, generateId: ({ entry }) => entry.replace(/\\.md$/, '') }),
    schema: ${type.traits.includes('image') ? '({ image }) => ' : ''}z.object({ ${shapes.join(', ')} }).strict(),
  })`;
}

function adapterSource(type: ContentTypeDefinition, index: number, locales: readonly string[]): string {
    const contracts = [
        'HasTitle',
        'HasSlug',
        ...(type.traits.includes('summary') ? ['HasSummary'] : []),
        ...(type.traits.includes('image') ? ['HasImage'] : []),
        ...(type.traits.includes('order') ? ['HasOptionalOrder'] : []),
    ];
    const localeType = locales.map((locale) => JSON.stringify(locale)).join(' | ');
    const defaultLocale = locales[0]!;
    const localized = locales.length > 1;
    return `import type { CollectionEntry } from 'astro:content';
import { assertImplements, type Item, type Linkable, ${contracts.map((name) => `type ${name}`).join(', ')} } from '@easy-web/core/contracts';
import { composition } from '../../content/definitions';

type Entry = CollectionEntry<${JSON.stringify(type.id)}>;
assertImplements<Entry['data'], ${contracts.join(' & ')}>();
${localized ? `type ContentLocale = ${localeType};\n` : ''}
export function toItem(entry: Entry${localized ? `, locale: ContentLocale = ${JSON.stringify(defaultLocale)}, basePath = import.meta.env.BASE_URL.replace(/\\/$/, '')` : ''}): Item & Linkable {
  const data = entry.data;
  return {
    title: data.title,
    ${type.traits.includes('summary') ? 'description: data.summary,' : ''}
    ${type.traits.includes('image') ? 'image: data.image,' : ''}
    href: ${localized ? `basePath + ` : `import.meta.env.BASE_URL.replace(/\\/$/, '') + `}composition.contentTypes[${index}].routes[${localized ? 'locale' : JSON.stringify(defaultLocale)}].replace(/\\/$/, '') + '/' + data.slug + '/',
  };
}
`;
}

function listSource(type: ContentTypeDefinition, locale: string, composition: ContentComposition): string {
    const prefix = '../'.repeat(routeBase(type, locale).split('/').length);
    const localized = composition.contentLocales.length > 1;
    const localeFilter = localized ? `, ({ data }) => data.locale === ${JSON.stringify(locale)}` : '';
    const localizedPaths = JSON.stringify([Object.fromEntries(composition.contentLocales.map((itemLocale) => [itemLocale, `${routeBase(type, itemLocale)}/`]))]);
    const localizedBaseSetup = localized ? `
const routePath = ${JSON.stringify(`${routeBase(type, locale)}/`)};
const pagePath = Astro.url.pathname.replace(/\\/+$/, '') || '/';
const routeWithoutSlash = routePath.replace(/\\/+$/, '') || '/';
const sitePrefix = routeWithoutSlash === '/' ? (pagePath === '/' ? '' : pagePath)
  : pagePath.endsWith(routeWithoutSlash) ? pagePath.slice(0, -routeWithoutSlash.length) : '';
` : '';
    const alternateSetup = localized ? `
const localizedPathGroups = ${localizedPaths};
const alternates = getAlternateLinks({
  path: routePath, locales: ${JSON.stringify(composition.contentLocales)},
  defaultLocale: ${JSON.stringify(composition.contentLocales[0])},
  baseUrl: new URL(sitePrefix ? sitePrefix + '/' : '/', Astro.site?.toString() ?? 'https://replace-with-your-domain.example').toString(),
  localizedPaths: localizedPathGroups,
  trailingSlash: ambientTrailingSlash(),
});
const alternateHref = alternates.find(({ hreflang }) => hreflang !== ${JSON.stringify(locale)} && hreflang !== 'x-default')?.href;
` : '';
    const localeArgument = localized ? `, ${JSON.stringify(locale)}, sitePrefix` : '';
    const itemMapping = type.traits.includes('order')
        ? `.sort((left, right) => compareContentOrder(
    { order: left.data.order, slug: left.data.slug, id: left.id },
    { order: right.data.order, slug: right.data.slug, id: right.id },
    ${JSON.stringify(locale)},
  ))
  ${localized ? `.map((entry) => toItem(entry${localeArgument}))` : '.map(toItem)'}`
        : localized
        ? `.sort((left, right) => left.data.slug < right.data.slug ? -1 : left.data.slug > right.data.slug ? 1 : left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
  .map((entry) => toItem(entry${localeArgument}))`
        : `.map(toItem).sort((left, right) => left.href < right.href ? -1 : left.href > right.href ? 1 : 0)`;
    return `---
import { getCollection } from 'astro:content';
import Base from '${prefix}layouts/Base.astro';
import { toItem } from '${prefix}lib/content/${type.id}';
${type.traits.includes('order') ? "import { compareContentOrder } from '@easy-web/core/contracts';" : ''}
import Card from '@easy-web/core/components/Card.astro';
import CardGrid from '@easy-web/core/components/CardGrid.astro';
${localized ? "import { getAlternateLinks, ambientTrailingSlash } from '@easy-web/core/i18n';" : ''}

${localizedBaseSetup}
const items = (await getCollection(${JSON.stringify(type.id)}${localeFilter}))
  ${itemMapping};
${alternateSetup}
---
<Base title={${JSON.stringify(type.labels[locale])}}${localized ? ` locale={${JSON.stringify(locale)}} basePath={sitePrefix} alternates={alternates} alternateHref={alternateHref}` : ''}>
  <h1>{${JSON.stringify(type.labels[locale])}}</h1>
  <CardGrid>
    {items.map((item) => <Card item={item} />)}
  </CardGrid>
</Base>
`;
}

function detailSource(type: ContentTypeDefinition, locale: string, composition: ContentComposition): string {
    const prefix = '../'.repeat(routeBase(type, locale).split('/').length);
    const localized = composition.contentLocales.length > 1;
    const currentRoute = JSON.stringify(`${routeBase(type, locale)}/`);
    const alternateListRoute = localized
        ? JSON.stringify(`${routeBase(type, composition.contentLocales.find((itemLocale) => itemLocale !== locale)! )}/`)
        : "''";
    const localizedSetup = localized ? `
  const routeBases = ${JSON.stringify(Object.fromEntries(composition.contentLocales.map((itemLocale) => [
        itemLocale, routeBase(type, itemLocale),
  ])))};
` : '';
    const localizedMap = localized ? `
  const translations = allEntries.filter((candidate) => candidate.data.translationKey === entry.data.translationKey);
  const translatedLocales = new Set<string>();
  for (const candidate of translations) {
    if (translatedLocales.has(candidate.data.locale)) {
      throw new Error('Duplicate translationKey in locale: ' + candidate.data.translationKey + ' (' + candidate.data.locale + ')');
    }
    translatedLocales.add(candidate.data.locale);
  }
  const localizedPaths = translations.length > 1
    ? Object.fromEntries(translations.map((candidate) => [
      candidate.data.locale, routeBases[candidate.data.locale] + '/' + candidate.data.slug + '/',
    ]))
    : undefined;
  return { params: { slug: entry.data.slug }, props: { entry, localizedPaths } };
` : `
  return { params: { slug: entry.data.slug }, props: { entry } };
`;
    const localeArgument = localized ? `, ${JSON.stringify(locale)}` : '';
    return `---
import { getCollection, render, type CollectionEntry } from 'astro:content';
import type { Rendered, Item, Linkable } from '@easy-web/core/contracts';
import Base from '${prefix}layouts/Base.astro';
import { toItem } from '${prefix}lib/content/${type.id}';
import Prose from '@easy-web/core/components/Prose.astro';
${localized ? "import { getAlternateLinks, ambientTrailingSlash } from '@easy-web/core/i18n';" : ''}
${type.traits.includes('image') ? "import Media from '@easy-web/core/components/Media.astro';" : ''}
interface Props { entry: CollectionEntry<${JSON.stringify(type.id)}>${localized ? '; localizedPaths?: Record<string, string>' : ''} }
type StaticPath = { params: { slug: string }; props: Props };

export async function getStaticPaths(): Promise<StaticPath[]> {
  const allEntries = await getCollection(${JSON.stringify(type.id)});
  const entries = ${localized ? `allEntries.filter((entry) => entry.data.locale === ${JSON.stringify(locale)})` : 'allEntries'};
  const seen = new Set<string>();
${localizedSetup}
  return entries.map((entry) => {
    if (seen.has(entry.data.slug)) throw new Error('Duplicate content slug: ' + entry.data.slug);
    seen.add(entry.data.slug);
${localizedMap}  });
}

const { entry${localized ? ', localizedPaths' : ''} } = Astro.props;
${localized ? `
const localizedPathGroups = localizedPaths
  ? [localizedPaths]
  : undefined;
const routePath = ${currentRoute} + entry.data.slug + '/';
const pagePath = Astro.url.pathname.replace(/\\/+$/, '') || '/';
const routeWithoutSlash = routePath.replace(/\\/+$/, '') || '/';
const sitePrefix = routeWithoutSlash === '/' ? (pagePath === '/' ? '' : pagePath)
  : pagePath.endsWith(routeWithoutSlash) ? pagePath.slice(0, -routeWithoutSlash.length) : '';
const alternates = localizedPathGroups ? getAlternateLinks({
  path: routePath,
  locales: ${JSON.stringify(composition.contentLocales)},
  defaultLocale: ${JSON.stringify(composition.contentLocales[0])},
  baseUrl: new URL(sitePrefix ? sitePrefix + '/' : '/', Astro.site?.toString() ?? 'https://replace-with-your-domain.example').toString(),
  localizedPaths: localizedPathGroups,
  trailingSlash: ambientTrailingSlash(),
}) : [];
const alternateHref = alternates.find(({ hreflang }) => hreflang !== ${JSON.stringify(locale)} && hreflang !== 'x-default')?.href
  ?? sitePrefix + ${alternateListRoute};
` : ''}
const rendered: Rendered<Item & Linkable> = { ...toItem(entry${localeArgument}), ...(await render(entry)) };
const { Content } = rendered;
---
<Base title={rendered.title} description={rendered.description}${localized ? ` locale={${JSON.stringify(locale)}} basePath={sitePrefix} alternates={alternates} alternateHref={alternateHref}` : ''}${type.traits.includes('image') ? ' image={rendered.image?.src && (typeof rendered.image.src === \'string\' ? rendered.image.src : rendered.image.src.src)}' : ''}>
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
    const locales = composition.contentLocales;
    const localized = locales.length > 1;
    const runtimeRange = contentRuntimeFor(composition);
    const mediaFolder = z.string().regex(/^src\/assets(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/)
        .parse(options.mediaFolder ?? 'src/assets');
    const exampleImage = `${mediaFolder}/content-example.svg`;
    const files: RecipeGeneratedFile[] = [
        { path: 'src/content/definitions.ts', content: `import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { titleTraitSchema, slugTraitSchema${composition.contentTypes.some((type) => type.traits.includes('summary')) ? ', summaryTraitSchema' : ''}${composition.contentTypes.some((type) => type.traits.includes('image')) ? ', imageTraitSchema' : ''}${composition.contentTypes.some((type) => type.traits.includes('order')) ? ', optionalOrderTraitSchema' : ''} } from '@easy-web/core/contracts';

export const composition = ${JSON.stringify(composition, null, 2)} as const;

export const collections = {
  ${composition.contentTypes.map((type) => collectionSchema(type, locales)).join(',\n  ')},
};
` },
        { path: 'src/content.config.ts', content: "export { collections } from './content/definitions';\n" },
        { path: 'package.json', content: `${JSON.stringify({ dependencies: {
            '@easy-web/core': runtimeRange,
            ...(composition.contentTypes.some((type) => type.traits.includes('image')) ? { sharp: '^0.35.0' } : {}),
        } }, null, 2)}\n` },
    ];
    if (composition.contentTypes.some((type) => type.traits.includes('image'))) {
        files.push({ path: exampleImage, content: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#334155"/><circle cx="320" cy="180" r="90" fill="#94a3b8"/></svg>\n' });
    }
    for (const [index, type] of composition.contentTypes.entries()) {
        files.push({ path: `src/lib/content/${type.id}.ts`, content: adapterSource(type, index, locales) });
        for (const locale of locales) {
            const isGerman = locale === 'de';
            const data = {
                title: `${type.labels[locale]} - ${isGerman ? 'Beispiel' : 'Example'}`,
                slug: 'example',
                ...(localized ? { locale, translationKey: 'example' } : {}),
                ...(type.traits.includes('summary') ? { summary: isGerman ? 'Generierter Beispielinhalt.' : 'Generated example content.' } : {}),
                ...(type.traits.includes('image') ? {
                    image: {
                        src: posix.relative(`src/content/${type.id}${localized ? `/${locale}` : ''}`, exampleImage),
                        alt: isGerman ? 'Kreis auf dunklem Hintergrund' : 'Circle on a dark background',
                    },
                } : {}),
            };
            const contentFolder = `src/content/${type.id}${localized ? `/${locale}` : ''}`;
            const body = isGerman ? 'Ersetze diesen Beispielinhalt vor der Veroeffentlichung.' : 'Replace this example content before production.';
            files.push({
                path: `${contentFolder}/example.md`,
                content: `---\n${JSON.stringify(data, null, 2)}\n---\n\n${body}\n`,
            });
        }
        for (const locale of locales) {
            const route = routeBase(type, locale).slice(1);
            files.push(
                { path: `src/pages/${route}/index.astro`, content: listSource(type, locale, composition) },
                { path: `src/pages/${route}/[slug].astro`, content: detailSource(type, locale, composition) },
            );
        }
    }
    return files;
}

/** Bind package-owned content generation to a validated composition, independently of a CMS. */
export function createContentSiteRecipes(rawComposition: unknown, options: ContentSiteOptions = {}): {
    readonly shell: RecipeMetadata<ShellRecipeOptions>;
    readonly content: RecipeMetadata;
} {
    const composition = generatedContentCompositionSchema.parse(rawComposition);
    const locales = composition.contentLocales;
    const locale = locales[0]!;
    const runtimeRange = contentRuntimeFor(composition);
    const navigationByLocale = Object.fromEntries(locales.map((contentLocale) => [
        contentLocale,
        composition.contentTypes.filter((type) => type.bindings.includes('navigation'))
            .map((type) => ({ label: type.labels[contentLocale]!, href: `${routeBase(type, contentLocale)}/` })),
    ]));
    const localizedPaths = locales.length > 1
        ? [
            Object.fromEntries(locales.map((contentLocale) => [
                contentLocale, contentLocale === locale ? '/' : `/${contentLocale}/`,
            ])),
            ...composition.contentTypes.map((type) => Object.fromEntries(locales.map((contentLocale) => [
                contentLocale, `${routeBase(type, contentLocale)}/`,
            ]))),
        ]
        : [];
    const files = contentFiles(composition, options);
    const contributions: RecipeOutputContribution[] = files
        .filter(({ path }) => !path.startsWith('src/pages/'))
        .map(({ path }, index) => ({ kind: path === 'package.json' ? 'dependency' : 'file', id: `content.file.${index}`, target: path }));
    for (const type of composition.contentTypes) {
        contributions.push(
            { kind: 'content', id: `content.type.${type.id}`, target: type.primary ? 'primary' : 'additional' },
            ...locales.flatMap((contentLocale) => [
                { kind: 'route' as const, id: `content.list.${type.id}.${contentLocale}`, target: `${routeBase(type, contentLocale)}/` },
                { kind: 'route' as const, id: `content.detail.${type.id}.${contentLocale}`, target: `${routeBase(type, contentLocale)}/[slug]` },
            ]),
            ...type.bindings.map((binding) => ({ kind: 'binding' as const, id: `content.binding.${type.id}.${binding}`, target: `content.type.${type.id}` })),
        );
    }
    const shellOutputContributions = locales.length > 1
        ? [
            ...shellRecipe.outputContributions,
            ...locales.slice(1).map((contentLocale) => ({
                kind: 'route' as const, id: `shell.home.${contentLocale}`, target: `/${contentLocale}/`,
            })),
        ]
        : shellRecipe.outputContributions;
    return {
        shell: {
            ...shellRecipe,
            outputContributions: shellOutputContributions,
            validators: [{
                id: 'shell.content-locale', phase: 'options',
                validate: ({ options: shellOptions }) => shellOptions.defaultLocale === locale ? [] : [{ code: 'CONTENT_LOCALE_MISMATCH', message: 'shell.defaultLocale must match the content composition locale' }],
            }],
            generate: ({ options: shellOptions }) => ({
                files: buildShellFiles(shellOptions, navigationByLocale[locale]!, {
                    ...options.shellConfiguration,
                    ...(locales.length > 1 ? { contentLocales: locales, navigationByLocale, localizedPaths } : {}),
                }),
            }),
        },
        content: {
            id: 'content.pages', version: '1.7.1', protocolVersion: 1,
            compatibleCliRange: '^0.1.0 || ^0.2.0', compatibleRuntimeRange: runtimeRange,
            provides: ['content.pages', 'content.typed-definitions'], requires: ['site.shell'], conflicts: [],
            order: { priority: 10, key: 'content' }, optionsSchema: z.strictObject({}),
            outputContributions: contributions, validators: [],
            generate: () => ({ files }),
        },
    };
}
