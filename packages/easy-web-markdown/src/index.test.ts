import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import type { Root, Image } from 'mdast';
import { visit } from 'unist-util-visit';
import { VFile } from 'vfile';
import easyWebMarkdown from './index.js';

function getImageUrls(tree: Root): string[] {
  const urls: string[] = [];
  visit(tree, 'image', (node: Image) => {
    urls.push(node.url);
  });
  return urls;
}

function makeImageTree(url: string): Root {
  return {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'image', url, alt: 'test', title: null }],
      },
    ],
  };
}

describe('easyWebMarkdown remark plugin', () => {
  it('rewrites /src/assets/ URL to relative path from md file', () => {
    const tree = makeImageTree('/src/assets/images/foo.png');
    const file = new VFile({ path: '/project/src/content/pages/de/page.md' });
    const processor = unified().use(easyWebMarkdown);
    processor.runSync(tree, file);
    expect(getImageUrls(tree)).toEqual(['../../../assets/images/foo.png']);
  });

  it('passes through relative ../../ URL unchanged', () => {
    const tree = makeImageTree('../../assets/foo.png');
    const file = new VFile({ path: '/project/src/content/pages/de/page.md' });
    const processor = unified().use(easyWebMarkdown);
    processor.runSync(tree, file);
    expect(getImageUrls(tree)).toEqual(['../../assets/foo.png']);
  });

  it('passes through external URL unchanged', () => {
    const tree = makeImageTree('https://example.com/foo.png');
    const file = new VFile({ path: '/project/src/content/pages/de/page.md' });
    const processor = unified().use(easyWebMarkdown);
    processor.runSync(tree, file);
    expect(getImageUrls(tree)).toEqual(['https://example.com/foo.png']);
  });

  it('passes through /uploads/ public-folder URL unchanged', () => {
    const tree = makeImageTree('/uploads/foo.png');
    const file = new VFile({ path: '/project/src/content/pages/de/page.md' });
    const processor = unified().use(easyWebMarkdown);
    processor.runSync(tree, file);
    expect(getImageUrls(tree)).toEqual(['/uploads/foo.png']);
  });
});
