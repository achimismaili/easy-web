// @achimismaili/easy-web-seo
// Implementation in progress — see T6 for the full AstroIntegration factory

export type Options = {
  noIndex?: boolean;
  sitemapLocales?: Record<string, string>;
  filter?: (page: string) => boolean;
};

export default function easyWebSeo(_options?: Options) {
  return {
    name: '@achimismaili/easy-web-seo',
    hooks: {},
  };
}
