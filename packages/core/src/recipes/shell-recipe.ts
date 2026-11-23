import { z } from 'astro/zod';
import type { RecipeMetadata } from './types.js';
import type { NavItem } from '../contracts/types.js';

export const SHELL_RECIPE_ID = 'site.shell';

const shellOptionsSchema = z.strictObject({
    siteName: z.string().min(1).default('Example Site'),
    defaultLocale: z.string().default('en'),
    noIndex: z.boolean().default(false),
});

export type ShellRecipeOptions = z.infer<typeof shellOptionsSchema>;

const PLACEHOLDER_SITE_URL = 'https://replace-with-your-domain.example';

/** Source expressions supplied by first-party recipes, never by CLI configuration. */
export interface ShellConfiguration {
    readonly imports?: readonly string[];
    readonly integrations?: readonly string[];
    readonly markdownProcessor?: string;
    readonly contentLocales?: readonly string[];
    readonly navigationByLocale?: Readonly<Record<string, readonly NavItem[]>>;
    readonly localizedPaths?: readonly Readonly<Record<string, string>>[];
}

function astroConfig(options: ShellRecipeOptions, configuration: ShellConfiguration): string {
    const locales = configuration.contentLocales;
    const multilingual = !!locales && locales.length > 1;
    const seoOptions = {
        noIndex: options.noIndex,
        ...(multilingual ? {
            sitemapLocales: Object.fromEntries(locales!.map((locale) => [locale, locale])),
            localizedPaths: configuration.localizedPaths,
            synchronizeRenderedAlternates: true,
        } : {}),
    };
    const seoConfig = multilingual
        ? `easyWebSeo(${JSON.stringify(seoOptions)})`
        : `easyWebSeo({ noIndex: ${options.noIndex ? 'true' : 'false'} })`;
    return `import { defineConfig } from 'astro/config';
import easyWebSeo from '@easy-web/core/seo';
${(configuration.imports ?? []).join('\n')}

export default defineConfig({
  site: ${JSON.stringify(PLACEHOLDER_SITE_URL)},
  ${configuration.markdownProcessor ? `markdown: { processor: ${configuration.markdownProcessor} },` : ''}
  ${multilingual ? `i18n: { defaultLocale: ${JSON.stringify(options.defaultLocale)}, locales: ${JSON.stringify(locales)} },` : ''}
  integrations: [
    ${seoConfig},
    ${(configuration.integrations ?? []).map((integration) => `${integration},`).join('\n    ')}
  ],
});
`;
}

const packageJsonFragment = `${JSON.stringify({
    type: 'module',
    scripts: { dev: 'astro dev', typecheck: 'astro check', build: 'astro build', preview: 'astro preview' },
    dependencies: { '@easy-web/core': '^1.5.0', astro: '^7.3.5' },
    devDependencies: { '@astrojs/check': '^0.9.4', typescript: '^5.5.0' },
}, null, 2)}\n`;

const pnpmWorkspace = `allowBuilds:
  esbuild: true
  sharp: true
`;

function baseLayout(options: ShellRecipeOptions, navigation: readonly NavItem[], configuration: ShellConfiguration): string {
    const locales = configuration.contentLocales;
    if (locales && locales.length > 1) {
        return `---
import PageShell from '@easy-web/core/components/PageShell.astro';
import Header from '@easy-web/core/components/Header.astro';
import Footer from '@easy-web/core/components/Footer.astro';
import SeoHead from '@easy-web/core/components/SeoHead.astro';
import '@easy-web/core/styles/tokens.css';

interface Props {
  title: string;
  description?: string;
  image?: string;
  locale?: string;
  basePath?: string;
  alternates?: { hreflang: string; href: string }[];
  alternateHref?: string;
}
const { title, description, image, locale = ${JSON.stringify(options.defaultLocale)}, basePath: configuredBasePath, alternates = [], alternateHref } = Astro.props;
const siteName = ${JSON.stringify(options.siteName)};
const currentLang = locale;
const locales = ${JSON.stringify(locales)};
const navigationByLocale: Record<string, { label: string; href: string }[]> = ${JSON.stringify(configuration.navigationByLocale ?? { [options.defaultLocale]: navigation })};
const basePath = configuredBasePath ?? import.meta.env.BASE_URL.replace(/\\/$/, '');
const navItems = (navigationByLocale[currentLang] ?? []).map((item) => ({ ...item, href: basePath + item.href }));
const languageHref = alternateHref
  ? new URL(alternateHref, Astro.site ?? new URL(${JSON.stringify(PLACEHOLDER_SITE_URL)})).pathname
  : undefined;
---
<!doctype html>
<html lang={currentLang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <SeoHead title={title} description={description} ogImage={image}
      pathname={Astro.url.pathname} locale={currentLang} siteName={siteName} alternates={alternates} />
  </head>
  <body>
    <PageShell lang={currentLang}>
      <Header
        slot="header"
        lang={currentLang}
        siteName={siteName}
        navItems={navItems}
        currentLang={currentLang}
        pathname={Astro.url.pathname}
        brandHref={basePath + (currentLang === ${JSON.stringify(options.defaultLocale)} ? '/' : '/' + currentLang + '/')}
        alternateHref={languageHref}
        locales={locales}
      />
      <slot />
      <Footer slot="footer" lang={currentLang} siteName={siteName} legalLinks={[
        { label: currentLang === 'de' ? 'Impressum (Beispiel)' : 'Imprint (sample)', href: basePath + '/imprint' },
        { label: currentLang === 'de' ? 'Datenschutz (Beispiel)' : 'Privacy (sample)', href: basePath + '/privacy' },
      ]} />
    </PageShell>
  </body>
</html>
`;
    }
    return `---
import PageShell from '@easy-web/core/components/PageShell.astro';
import Header from '@easy-web/core/components/Header.astro';
import Footer from '@easy-web/core/components/Footer.astro';
import SeoHead from '@easy-web/core/components/SeoHead.astro';
import '@easy-web/core/styles/tokens.css';

interface Props {
  title: string;
  description?: string;
  image?: string;
}
const { title, description, image } = Astro.props;
const siteName = ${JSON.stringify(options.siteName)};
const currentLang = ${JSON.stringify(options.defaultLocale)};
const navItems = ${JSON.stringify([{ label: options.defaultLocale === 'de' ? 'Startseite' : 'Home', href: '/' }, ...navigation])};
---
<!doctype html>
<html lang=${JSON.stringify(options.defaultLocale)}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <SeoHead title={title} description={description} ogImage={image}
      pathname={Astro.url.pathname} locale={currentLang} siteName={siteName} />
  </head>
  <body>
    <PageShell lang={currentLang}>
      <Header
        slot="header"
        lang={currentLang}
        siteName={siteName}
        navItems={navItems}
        currentLang={currentLang}
        pathname={Astro.url.pathname}
        brandHref="/"
        locales={[currentLang]}
      />
      <slot />
      <Footer slot="footer" lang={currentLang} siteName={siteName} legalLinks={[
        { label: 'Imprint (sample)', href: '/imprint' },
        { label: 'Privacy (sample)', href: '/privacy' },
      ]} />
    </PageShell>
  </body>
</html>
`;
}

function homePage(options: ShellRecipeOptions): string {
    return `---
import Base from '../layouts/Base.astro';
---
<Base title=${JSON.stringify(options.siteName)}>
  <h1>Welcome</h1>
  <p>This is a generated placeholder home page. Replace this content before production.</p>
</Base>
`;
}

function notFoundPage(options: ShellRecipeOptions): string {
    return `---
import Base from '../layouts/Base.astro';
import NotFound from '@easy-web/core/components/NotFound.astro';
---
<Base title="Page not found">
  <NotFound currentLang=${JSON.stringify(options.defaultLocale)} defaultLocale=${JSON.stringify(options.defaultLocale)} />
</Base>
`;
}

const localizedPaths = `import type { LocalizedPathGroup } from '@easy-web/core/i18n';

export const localizedPaths: readonly LocalizedPathGroup[] = [];
`;

const gitignore = `node_modules
dist
.astro
`;

function localizedHomePage(options: ShellRecipeOptions, locale: string, locales: readonly string[]): string {
    return `---
import Base from '${locale === options.defaultLocale ? '../layouts/Base.astro' : '../../layouts/Base.astro'}';
import { getAlternateLinks, ambientTrailingSlash } from '@easy-web/core/i18n';

const localizedPaths = [Object.fromEntries(${JSON.stringify(locales)}.map((itemLocale) => [
  itemLocale, itemLocale === ${JSON.stringify(options.defaultLocale)} ? '/' : '/' + itemLocale + '/',
]))];
const routePath = ${JSON.stringify(locale === options.defaultLocale ? '/' : `/${locale}/`)};
const pagePath = Astro.url.pathname.replace(/\\/+$/, '') || '/';
const routeWithoutSlash = routePath.replace(/\\/+$/, '') || '/';
const sitePrefix = routeWithoutSlash === '/' ? (pagePath === '/' ? '' : pagePath)
  : pagePath.endsWith(routeWithoutSlash) ? pagePath.slice(0, -routeWithoutSlash.length) : '';
const alternates = getAlternateLinks({
  path: routePath, locales: ${JSON.stringify(locales)},
  defaultLocale: ${JSON.stringify(options.defaultLocale)},
  baseUrl: new URL(sitePrefix ? sitePrefix + '/' : '/', Astro.site?.toString() ?? ${JSON.stringify(PLACEHOLDER_SITE_URL)}).toString(),
  localizedPaths,
  trailingSlash: ambientTrailingSlash(),
});
const alternateHref = alternates.find(({ hreflang }) => hreflang !== ${JSON.stringify(locale)} && hreflang !== 'x-default')?.href;
---
<Base title={${JSON.stringify(options.siteName)}} locale={${JSON.stringify(locale)}} basePath={sitePrefix} alternates={alternates} alternateHref={alternateHref}>
  <h1>${locale === 'de' ? 'Willkommen' : 'Welcome'}</h1>
  <p>${locale === 'de' ? 'Dies ist eine generierte Platzhalter-Startseite. Ersetze diesen Inhalt vor der Veröffentlichung.' : 'This is a generated placeholder home page. Replace this content before production.'}</p>
</Base>
`;
}

export function buildShellFiles(rawOptions: unknown, navigation: readonly NavItem[] = [], configuration: ShellConfiguration = {}): readonly { path: string; content: string }[] {
    const options = shellOptionsSchema.parse(rawOptions ?? {});
    const locales = configuration.contentLocales;
    const multilingual = !!locales && locales.length > 1;
    return [
        { path: 'astro.config.mjs', content: astroConfig(options, configuration) },
        { path: 'package.json', content: packageJsonFragment },
        { path: 'pnpm-workspace.yaml', content: pnpmWorkspace },
        { path: 'src/layouts/Base.astro', content: baseLayout(options, navigation, configuration) },
        { path: 'src/pages/index.astro', content: multilingual ? localizedHomePage(options, options.defaultLocale, locales!) : homePage(options) },
        ...(multilingual ? locales!.slice(1).map((locale) => ({
            path: `src/pages/${locale}/index.astro`,
            content: localizedHomePage(options, locale, locales!),
        })) : []),
        { path: 'src/pages/404.astro', content: notFoundPage(options) },
        { path: 'src/lib/localized-paths.ts', content: multilingual
            ? `import type { LocalizedPathGroup } from '@easy-web/core/i18n';\n\nexport const localizedPaths: readonly LocalizedPathGroup[] = ${JSON.stringify(configuration.localizedPaths ?? [], null, 2)};\n`
            : localizedPaths },
        { path: 'tsconfig.json', content: `${JSON.stringify({ extends: 'astro/tsconfigs/strict', include: ['.astro/types.d.ts', '**/*'], exclude: ['dist'] }, null, 2)}\n` },
        { path: '.gitignore', content: gitignore },
    ];
}

export const shellRecipe = {
    id: SHELL_RECIPE_ID,
    version: '1.5.0',
    protocolVersion: 1,
    compatibleCliRange: '^0.1.0 || ^0.2.0 || ^0.3.0',
    compatibleRuntimeRange: '^1.5.0',
    provides: [SHELL_RECIPE_ID],
    requires: [],
    conflicts: [],
    order: { priority: 0, key: 'shell' },
    optionsSchema: shellOptionsSchema,
    outputContributions: [
        { kind: 'configuration', id: 'shell.astro-config', target: 'astro.config.mjs' },
        { kind: 'dependency', id: 'shell.dependencies', target: 'package.json' },
        { kind: 'configuration', id: 'shell.pnpm-workspace', target: 'pnpm-workspace.yaml' },
        { kind: 'file', id: 'shell.base-layout', target: 'src/layouts/Base.astro' },
        { kind: 'route', id: 'shell.home', target: '/' },
        { kind: 'route', id: 'shell.404', target: '/404' },
        { kind: 'file', id: 'shell.localized-paths', target: 'src/lib/localized-paths.ts' },
        { kind: 'configuration', id: 'shell.tsconfig', target: 'tsconfig.json' },
        { kind: 'file', id: 'shell.gitignore', target: '.gitignore' },
    ],
    validators: [],
    generate: (context: { options?: unknown }) => ({ files: buildShellFiles(context.options) }),
} satisfies RecipeMetadata<ShellRecipeOptions>;

export default shellRecipe;
