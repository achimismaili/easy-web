import type { AstroIntegration, AstroConfig } from 'astro';
import sitemap from '@astrojs/sitemap';

export type Options = {
  noIndex?: boolean;
  sitemapLocales?: Record<string, string>;
  filter?: (page: string) => boolean;
};

export default function easyWebSeo(options: Options = {}): AstroIntegration {
  return {
    name: '@achimismaili/easy-web-seo',
    hooks: {
      'astro:config:setup': ({ config, updateConfig, injectRoute, logger }) => {
        // 1. Validate site URL
        if (!config.site) {
          logger.error(
            '@achimismaili/easy-web-seo: astro.config.mjs must set `site` (a full https:// URL). ' +
            'Example: site: "https://yoursite.example"'
          );
          throw new Error('@achimismaili/easy-web-seo: `site` is required in astro.config.mjs');
        }

        // 2. Build BCP-47 locale map for sitemap
        let sitemapI18n: { defaultLocale: string; locales: Record<string, string> } | undefined;
        if (config.i18n && config.i18n.locales.length > 0) {
          const localeMap: Record<string, string> = options.sitemapLocales ?? {};
          if (!options.sitemapLocales) {
            // Auto-generate BCP-47 tags: 'de' → 'de-DE', 'en' → 'en-US'
            for (const locale of config.i18n.locales) {
              const id = typeof locale === 'string' ? locale : locale.path;
              localeMap[id] = `${id}-${id.toUpperCase()}`;
            }
            logger.warn(
              '@achimismaili/easy-web-seo: auto-generated BCP-47 locale tags (' +
              Object.entries(localeMap).map(([k, v]) => `${k}→${v}`).join(', ') +
              '). Provide the `sitemapLocales` option for region-specific tags (e.g. { de: "de-DE", en: "en-US" }).'
            );
          }
          sitemapI18n = {
            defaultLocale: config.i18n.defaultLocale,
            locales: localeMap,
          };
        }

        // 3. Compose @astrojs/sitemap via updateConfig
        updateConfig({
          integrations: [
            sitemap({
              ...(sitemapI18n ? { i18n: sitemapI18n } : {}),
              ...(options.filter ? { filter: options.filter } : {}),
            }),
          ],
        });

        // 4. Pass noIndex flag to the robots.txt route handler via env
        process.env.EASY_WEB_SEO_NO_INDEX = String(options.noIndex ?? false);

        // 5. Inject dynamic robots.txt route
        injectRoute({
          pattern: '/robots.txt',
          entrypoint: new URL('./routes/robots-txt.js', import.meta.url),
          prerender: true,
        });
      },
    },
  };
}
