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
}

function astroConfig(options: ShellRecipeOptions, configuration: ShellConfiguration): string {
    return `import { defineConfig } from 'astro/config';
import easyWebSeo from '@easy-web/core/seo';
${(configuration.imports ?? []).join('\n')}

export default defineConfig({
  site: ${JSON.stringify(PLACEHOLDER_SITE_URL)},
  ${configuration.markdownProcessor ? `markdown: { processor: ${configuration.markdownProcessor} },` : ''}
  integrations: [
    easyWebSeo({ noIndex: ${options.noIndex ? 'true' : 'false'} }),
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

function baseLayout(options: ShellRecipeOptions, navigation: readonly NavItem[]): string {
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

export function buildShellFiles(rawOptions: unknown, navigation: readonly NavItem[] = [], configuration: ShellConfiguration = {}): readonly { path: string; content: string }[] {
    const options = shellOptionsSchema.parse(rawOptions ?? {});
    return [
        { path: 'astro.config.mjs', content: astroConfig(options, configuration) },
        { path: 'package.json', content: packageJsonFragment },
        { path: 'pnpm-workspace.yaml', content: pnpmWorkspace },
        { path: 'src/layouts/Base.astro', content: baseLayout(options, navigation) },
        { path: 'src/pages/index.astro', content: homePage(options) },
        { path: 'src/pages/404.astro', content: notFoundPage(options) },
        { path: 'src/lib/localized-paths.ts', content: localizedPaths },
        { path: 'tsconfig.json', content: `${JSON.stringify({ extends: 'astro/tsconfigs/strict', include: ['.astro/types.d.ts', '**/*'], exclude: ['dist'] }, null, 2)}\n` },
        { path: '.gitignore', content: gitignore },
    ];
}

export const shellRecipe = {
    id: SHELL_RECIPE_ID,
    version: '1.5.0',
    protocolVersion: 1,
    compatibleCliRange: '^0.1.0 || ^0.2.0',
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
