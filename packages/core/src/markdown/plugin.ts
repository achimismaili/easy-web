import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Image } from 'mdast';
import { posix as path } from 'node:path';

/**
 * Remark plugin for easy-web.
 * Rewrites markdown image URLs starting with `/src/assets/` to relative paths
 * from the markdown file's location — a format Astro's built-in image resolver accepts.
 *
 * URLs NOT starting with `/src/assets/` are passed through unchanged.
 */
const easyWebMarkdown: Plugin<[], Root> = () => {
  return (tree, file) => {
    const rawPath = (file.history?.[0] ?? file.path) as string | undefined;
    if (!rawPath) return;

    // Normalise to forward slashes (Astro always provides POSIX paths)
    const filePath = rawPath.replace(/\\/g, '/');

    visit(tree, 'image', (node: Image) => {
      if (!node.url.startsWith('/src/assets/')) return;

      // Locate the /src/ boundary in the md file's path
      const srcBoundary = filePath.lastIndexOf('/src/');
      if (srcBoundary === -1) return;

      const projectRoot = filePath.substring(0, srcBoundary);
      const fileDir = path.dirname(filePath);

      // Asset absolute path: projectRoot + /src/assets/...
      const assetAbsolute = projectRoot + node.url;

      // Compute relative path from .md directory to asset
      const relativePath = path.relative(fileDir, assetAbsolute);

      node.url = relativePath;
    });
  };
};

export default easyWebMarkdown;
