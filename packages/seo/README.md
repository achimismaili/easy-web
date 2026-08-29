# @easy-web/seo

Shared SEO primitives for the `@easy-web/*` ecosystem.

## Usage

```ts
// astro.config.mjs
import easyWebSeo from '@easy-web/seo';

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
import SeoHead from '@easy-web/seo/components/SeoHead.astro';

<SeoHead
  title={title}
  description={description}
  pathname={pathname}
  locale={locale}
  siteName="My Site"
/>
```

Full implementation: see package source.
