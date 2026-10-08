# @easy-web/markdown (deprecated)

This package is a compatibility layer. The remark plugin that normalises markdown-body image URLs now lives in [`@easy-web/core`](../core/README.md). The default export keeps working and is the core plugin itself, but new code should import from `@easy-web/core/markdown`.

| Old import | New import |
| :--- | :--- |
| `import easyWebMarkdown from '@easy-web/markdown'` | `import easyWebMarkdown from '@easy-web/core/markdown'` |

On Astro 7, `markdown.remarkPlugins` runs only when `@astrojs/markdown-remark` is installed in the site.
