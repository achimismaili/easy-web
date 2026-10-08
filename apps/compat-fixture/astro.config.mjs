import { defineConfig } from 'astro/config';
import easyWebMarkdown from '@easy-web/markdown';
import easyWebSeo from '@easy-web/seo';

export default defineConfig({
  site: 'https://compat-fixture.example',
  output: 'static',
  integrations: [easyWebSeo({ noIndex: true })],
  markdown: { remarkPlugins: [easyWebMarkdown] },
  // External stylesheets keep the built CSS assertable as files.
  build: { inlineStylesheets: 'never' },
});
