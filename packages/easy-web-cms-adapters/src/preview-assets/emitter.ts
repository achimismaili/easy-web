import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { AstroIntegrationLogger } from 'astro';
import type { Sharp } from 'sharp';
import {
  BROWSER_IMAGE_EXTENSIONS, MAX_INPUT_BYTES, MAX_OUTPUT_BYTES, RASTER_EXTENSIONS,
  type PreviewAssetMapping,
} from './types.js';

type SharpFactory = typeof import('sharp')['default'];
type Emission = { readonly emitted: number; readonly skipped: number; readonly warnings: readonly string[] };

class PreviewOutputPathError extends Error {
  readonly name = 'PreviewOutputPathError';

  constructor(readonly destination: string, reason: string) {
    super(`[easy-web-cms-preview-assets] unsafe preview output path ${destination}: ${reason}`);
  }
}

async function loadSharp(): Promise<SharpFactory> {
  try {
    return (await import('sharp')).default;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error('[easy-web-cms-preview-assets] Sharp is required when this integration is enabled. Install "sharp@^0.35.0" in the site.', { cause: error });
    }
    throw error;
  }
}

async function enumerate(root: string): Promise<readonly string[]> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(root, entry.name);
      if (entry.isDirectory()) return enumerate(fullPath);
      return entry.isFile() ? [fullPath] : [];
    }));
    return nested.flat().sort();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

function rasterPipeline(sharp: SharpFactory, input: Buffer, extension: string): Sharp {
  const pipeline = sharp(input).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true });
  switch (extension) {
    case '.jpg':
    case '.jpeg': return pipeline.jpeg({ quality: 80 });
    case '.png': return pipeline.png({ compressionLevel: 9 });
    case '.webp': return pipeline.webp({ quality: 80 });
    case '.avif': return pipeline.avif({ quality: 50 });
    default: throw new TypeError(`[easy-web-cms-preview-assets] unsupported raster extension ${extension}`);
  }
}

async function assertVacant(target: string): Promise<void> {
  try {
    await fs.lstat(target);
    throw new Error(`[easy-web-cms-preview-assets] output collision at ${target}`);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return;
    throw error;
  }
}

async function assertDirectory(directory: string): Promise<void> {
  const stat = await fs.lstat(directory);
  if (stat.isSymbolicLink()) throw new PreviewOutputPathError(directory, 'symlink directory is not allowed');
  if (!stat.isDirectory()) throw new PreviewOutputPathError(directory, 'path component is not a directory');
}

async function ensureSecureParent(outputRoot: string, target: string): Promise<void> {
  const relativeTarget = path.relative(outputRoot, target);
  if (relativeTarget === '' || relativeTarget === '..' || relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget)) {
    throw new PreviewOutputPathError(target, 'target escapes the Astro output root');
  }
  await assertDirectory(outputRoot);
  const parentParts = path.dirname(relativeTarget).split(path.sep).filter((part) => part.length > 0 && part !== '.');
  let current = outputRoot;
  for (const part of parentParts) {
    current = path.join(current, part);
    try {
      await assertDirectory(current);
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      try {
        await fs.mkdir(current);
      } catch (mkdirError) {
        if (!(mkdirError instanceof Error && 'code' in mkdirError && mkdirError.code === 'EEXIST')) throw mkdirError;
      }
      await assertDirectory(current);
    }
  }
}

async function atomicWrite(outputRoot: string, target: string, data: Uint8Array): Promise<void> {
  if (data.byteLength > MAX_OUTPUT_BYTES) throw new RangeError('emitted rendition exceeds 5 MiB');
  await ensureSecureParent(outputRoot, target);
  await assertVacant(target);
  await ensureSecureParent(outputRoot, target);
  const temporary = `${target}.easy-web-${process.pid}-${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, Buffer.from(data).toString('base64'), 'base64');
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
}

async function emitMapping(
  sharp: SharpFactory,
  outputRoot: string,
  mapping: PreviewAssetMapping,
): Promise<Emission> {
  try {
    const [realProjectRoot, realSourceRoot] = await Promise.all([
      fs.realpath(mapping.projectRoot), fs.realpath(mapping.sourceRoot),
    ]);
    const relativeSource = path.relative(realProjectRoot, realSourceRoot);
    if (relativeSource.startsWith(`..${path.sep}`) || relativeSource === '..' || path.isAbsolute(relativeSource)) {
      throw new Error(`[easy-web-cms-preview-assets] source folder escapes the project root: ${mapping.source}`);
    }
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  const files = await enumerate(mapping.sourceRoot);
  let emitted = 0;
  let skipped = 0;
  const warnings: string[] = [];
  for (const input of files) {
    const relative = path.relative(mapping.sourceRoot, input);
    const extension = path.extname(input).toLowerCase();
    const stat = await fs.stat(input);
    if (!BROWSER_IMAGE_EXTENSIONS.has(extension) || stat.size > MAX_INPUT_BYTES) {
      skipped += 1;
      warnings.push(`${relative}: unsupported format or input exceeds 25 MiB`);
      continue;
    }
    try {
      const original = await fs.readFile(input);
      const data = RASTER_EXTENSIONS.has(extension)
        ? await rasterPipeline(sharp, original, extension).toBuffer()
        : original;
      const target = path.join(outputRoot, ...mapping.publicPath.slice(1).split('/'), relative);
      await atomicWrite(outputRoot, target, data);
      emitted += 1;
    } catch (error) {
      if (error instanceof PreviewOutputPathError || (error instanceof Error && error.message.includes('output collision'))) throw error;
      skipped += 1;
      warnings.push(`${relative}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { emitted, skipped, warnings };
}

export async function emitPreviewAssets(
  outputRoot: string,
  mappings: readonly PreviewAssetMapping[],
  logger: AstroIntegrationLogger,
): Promise<void> {
  const sharp = await loadSharp();
  const results = await Promise.all(mappings.map((mapping) => emitMapping(sharp, outputRoot, mapping)));
  const emitted = results.reduce((sum, result) => sum + result.emitted, 0);
  const skipped = results.reduce((sum, result) => sum + result.skipped, 0);
  const warnings = results.flatMap((result) => result.warnings);
  if (warnings.length > 0) {
    const sample = warnings.slice(0, 8).join('; ');
    logger.warn(`Skipped ${skipped} preview asset(s): ${sample}${warnings.length > 8 ? `; and ${warnings.length - 8} more` : ''}`);
  }
  logger.info(`Emitted ${emitted} CMS preview asset(s); skipped ${skipped}.`);
}
