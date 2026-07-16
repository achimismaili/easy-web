# @achimismaili/easy-web-markdown

Remark plugin for the easy-web ecosystem. Normalises `/src/assets/...` image URLs in markdown body to relative paths Astro's built-in markdown image resolver accepts.

## Installation

```sh
pnpm add @achimismaili/easy-web-markdown
```

## Usage (Astro 6)

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import easyWebMarkdown from '@achimismaili/easy-web-markdown';

export default defineConfig({
  markdown: {
    remarkPlugins: [easyWebMarkdown],
  },
});
```

## Usage (Astro 7 — opt-in required)

Astro 7 replaced the default markdown pipeline with Sätteri. To keep using remark plugins, install `@astrojs/markdown-remark` and configure:

```ts
import { unified } from '@astrojs/markdown-remark';
import easyWebMarkdown from '@achimismaili/easy-web-markdown';

export default defineConfig({
  markdown: {
    processor: unified({
      remarkPlugins: [easyWebMarkdown],
    }),
  },
});
```
