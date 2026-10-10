import * as path from 'node:path';
import type { CmsPreviewAssetFolder, PreviewAssetMapping } from './types.js';

const SOURCE_PREFIX = 'src/assets/';
const PUBLIC_PREFIX = '/src/assets/';

export class CmsPreviewAssetConfigError extends TypeError {
  readonly name = 'CmsPreviewAssetConfigError';
}

function invalid(label: string, reason: string): never {
  throw new CmsPreviewAssetConfigError(`[easy-web-cms-preview-assets] ${label} ${reason}`);
}

function validateComponents(value: string, label: string): void {
  if (value.includes('\0')) invalid(label, 'must not contain NUL');
  if (value.includes('\\')) invalid(label, 'must use forward slashes');
  if (value.split('/').some((part) => part === '.' || part === '..')) {
    invalid(label, 'must not contain dot path components');
  }
}

function normalizeSource(source: string): string {
  if (!source.startsWith(SOURCE_PREFIX)) invalid('source', `must start with "${SOURCE_PREFIX}"`);
  if (path.isAbsolute(source) || /^[A-Za-z]:/.test(source)) invalid('source', 'must be repo-relative');
  validateComponents(source, 'source');
  return source.replace(/\/+$/, '');
}

function normalizePublicPath(publicPath: string): string {
  if (!publicPath.startsWith(PUBLIC_PREFIX)) invalid('publicPath', `must start with "${PUBLIC_PREFIX}"`);
  if (publicPath.includes('?') || publicPath.includes('#')) invalid('publicPath', 'must not contain a query or hash');
  validateComponents(publicPath, 'publicPath');
  return publicPath.replace(/\/+$/, '');
}

export function validateMappings(
  root: string,
  folders: readonly CmsPreviewAssetFolder[],
): readonly PreviewAssetMapping[] {
  const mappings = folders.map((folder) => {
    const source = normalizeSource(folder.source);
    const publicPath = normalizePublicPath(folder.publicPath);
    if (source.slice(SOURCE_PREFIX.length) !== publicPath.slice(PUBLIC_PREFIX.length)) {
      invalid('mapping', 'source and publicPath suffixes must match');
    }
    return { source, publicPath, projectRoot: root, sourceRoot: path.resolve(root, ...source.split('/')) };
  });

  for (const [index, mapping] of mappings.entries()) {
    for (const previous of mappings.slice(0, index)) {
      if (mapping.publicPath === previous.publicPath) invalid('mapping', `has duplicate public prefix "${mapping.publicPath}"`);
      if (mapping.publicPath.startsWith(`${previous.publicPath}/`) || previous.publicPath.startsWith(`${mapping.publicPath}/`)) {
        invalid('mapping', `has overlapping public prefix "${mapping.publicPath}"`);
      }
    }
  }
  return mappings;
}
