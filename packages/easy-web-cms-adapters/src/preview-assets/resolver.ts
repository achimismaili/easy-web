import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BROWSER_IMAGE_EXTENSIONS, type CmsPreviewAssetFolder } from './types.js';

function contained(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

function decodeRelativePath(publicPath: string, requestPath: string): string | null {
  const raw = requestPath.slice(publicPath.length + 1);
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch (error) {
    if (error instanceof URIError) return null;
    throw error;
  }
  if (
    decoded.length === 0 || decoded.includes('\0') || decoded.includes('\\') ||
    /%[0-9a-f]{2}/i.test(decoded) || decoded.split('/').some((part) => part === '.' || part === '..')
  ) return null;
  return decoded;
}

export function ownsRequest(publicPath: string, requestPath: string): boolean {
  return requestPath === publicPath || requestPath.startsWith(`${publicPath}/`);
}

export async function resolvePreviewRequest(
  root: string,
  mapping: CmsPreviewAssetFolder,
  requestPath: string,
): Promise<string | null> {
  if (!ownsRequest(mapping.publicPath, requestPath)) return null;
  const relativePath = decodeRelativePath(mapping.publicPath, requestPath);
  if (relativePath === null || !BROWSER_IMAGE_EXTENSIONS.has(path.extname(relativePath).toLowerCase())) return null;
  const sourceRoot = path.resolve(root, ...mapping.source.split('/'));
  const candidate = path.resolve(sourceRoot, ...relativePath.split('/'));
  if (!contained(sourceRoot, candidate)) return null;
  try {
    const [realRoot, realCandidate, stat] = await Promise.all([
      fs.realpath(sourceRoot), fs.realpath(candidate), fs.stat(candidate),
    ]);
    if (!contained(realRoot, realCandidate) || !stat.isFile()) return null;
    return realCandidate;
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) return null;
    throw error;
  }
}
