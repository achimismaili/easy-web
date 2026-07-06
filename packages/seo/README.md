# @achimismaili/easy-web-seo

Shared SEO primitives for the `@achimismaili/easy-web-*` ecosystem.

## Usage

```ts
// astro.config.mjs
import easyWebSeo from '@achimismaili/easy-web-seo';

export default defineConfig({
  site: 'https://yoursite.example',
  integrations: [
    easyWebSeo({
      sitemapLocales: { de: 'de-DE', en: 'en-US' },
      // noIndex: true  // set on staging/dev sites
    }),
  ],
});
```

```astro
// In your Base layout:
import SeoHead from '@achimismaili/easy-web-seo/components/SeoHead.astro';

<SeoHead
  title={title}
  description={description}
  pathname={pathname}
  locale={locale}
  siteName="My Site"
/>
```

Full implementation: see package source.
