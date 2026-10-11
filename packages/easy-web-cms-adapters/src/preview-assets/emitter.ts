import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { AstroIntegrationLogger } from 'astro';
import type { Sharp } from 'sharp';
import {
  BROWSER_IMAGE_EXTENSIONS,
  MAX_AGGREGATE_INPUT_BYTES,
  MAX_INPUT_BYTES,
  MAX_PREVIEW_FILES,
  PREVIEW_MANIFEST,
  RASTER_EXTENSIONS,
  type PreviewAssetMapping,
} from './types.js';

type SharpFactory = typeof import('sharp')['default'];
type Candidate = { readonly input: string; readonly relative: string; readonly output: string; readonly size: number };
type Manifest = { readonly version: 1; readonly files: readonly string[] };

export class CmsPreviewAssetSafetyError extends Error {
  readonly name = 'CmsPreviewAssetSafetyError';
}

function unsafe(message: string): never {
  throw new CmsPreviewAssetSafetyError(`[easy-web-cms-preview-assets] ${message}`);
}

async function loadSharp(): Promise<SharpFactory> {
  try {
    return (await import('sharp')).default;
  } catch (error) {
    throw new Error('[easy-web-cms-preview-assets] Sharp is required when this integration is enabled. Install "sharp@^0.35.0" in the site.', { cause: error });
  }
}

function contained(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function assertPlainDirectory(directory: string): Promise<void> {
  const stat = await fs.lstat(directory);
  if (stat.isSymbolicLink()) unsafe(`directory is a symlink or reparse point: ${directory}`);
  if (!stat.isDirectory()) unsafe(`path component is not a directory: ${directory}`);
}

async function enumerate(sourceRoot: string, outputRoot: string, publicPath: string): Promise<readonly Candidate[]> {
  try {
    await assertPlainDirectory(sourceRoot);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
  const candidates: Candidate[] = [];
  const walk = async (directory: string): Promise<void> => {
    await assertPlainDirectory(directory);
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const input = path.join(directory, entry.name);
      const stat = await fs.lstat(input);
      if (entry.isSymbolicLink() || stat.isSymbolicLink()) unsafe(`source contains a symlink or reparse point: ${input}`);
      if (entry.isDirectory()) {
        await walk(input);
        continue;
      }
      if (!entry.isFile() || !stat.isFile()) unsafe(`source contains a non-regular file or reparse point: ${input}`);
      const relative = path.relative(sourceRoot, input);
      if (!contained(sourceRoot, input)) unsafe(`source file escapes configured root: ${input}`);
      const extension = path.extname(relative).toLowerCase();
      if (!BROWSER_IMAGE_EXTENSIONS.has(extension)) unsafe(`unsupported preview extension: ${relative}`);
      if (stat.size > MAX_INPUT_BYTES) unsafe(`preview file exceeds 10 MiB: ${relative}`);
      const output = path.join(outputRoot, ...publicPath.slice(1).split('/'), relative);
      if (!contained(outputRoot, output)) unsafe(`preview output escapes build root: ${relative}`);
      candidates.push({ input, relative, output, size: stat.size });
    }
  };
  await walk(sourceRoot);
  return candidates;
}

function validateBounds(candidates: readonly Candidate[]): void {
  if (candidates.length > MAX_PREVIEW_FILES) unsafe(`preview file count exceeds ${MAX_PREVIEW_FILES}`);
  const aggregate = candidates.reduce((sum, file) => sum + file.size, 0);
  if (aggregate > MAX_AGGREGATE_INPUT_BYTES) unsafe('preview files exceed 100 MiB aggregate');
  const folded = new Map<string, string>();
  for (const candidate of candidates) {
    const key = candidate.output.toLocaleLowerCase('en-US');
    const previous = folded.get(key);
    if (previous && previous !== candidate.output) unsafe(`case-collision between ${previous} and ${candidate.output}`);
    folded.set(key, candidate.output);
  }
}

async function readManifest(outputRoot: string): Promise<ReadonlySet<string>> {
  const manifestPath = path.join(outputRoot, PREVIEW_MANIFEST);
  try {
    const parsed = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as Partial<Manifest>;
    if (parsed.version !== 1 || !Array.isArray(parsed.files) || parsed.files.some((file) => typeof file !== 'string')) {
      unsafe(`invalid preview manifest: ${manifestPath}`);
    }
    for (const file of parsed.files) {
      const target = path.resolve(outputRoot, ...file.split('/'));
      if (!contained(outputRoot, target)) unsafe(`manifest path escapes build root: ${file}`);
    }
    return new Set(parsed.files);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return new Set();
    throw error;
  }
}

async function secureParent(outputRoot: string, target: string): Promise<void> {
  if (!contained(outputRoot, target)) unsafe(`output escapes build root: ${target}`);
  await assertPlainDirectory(outputRoot);
  const parts = path.dirname(path.relative(outputRoot, target)).split(path.sep).filter((part) => part && part !== '.');
  let current = outputRoot;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      await assertPlainDirectory(current);
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      await fs.mkdir(current);
      await assertPlainDirectory(current);
    }
  }
}

async function exists(target: string): Promise<boolean> {
  try { await fs.lstat(target); return true; } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
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
    default: throw new TypeError(`unsupported raster extension ${extension}`);
  }
}

export async function emitPreviewAssets(
  outputRoot: string,
  mappings: readonly PreviewAssetMapping[],
  logger: AstroIntegrationLogger,
): Promise<void> {
  await assertPlainDirectory(outputRoot);
  const nested = await Promise.all(mappings.map((mapping) => enumerate(mapping.sourceRoot, outputRoot, mapping.publicPath)));
  const candidates = nested.flat();
  validateBounds(candidates);
  const previous = await readManifest(outputRoot);
  const next = new Set(candidates.map((candidate) => path.relative(outputRoot, candidate.output).split(path.sep).join('/')));
  for (const stale of previous) {
    if (!next.has(stale)) await fs.rm(path.resolve(outputRoot, ...stale.split('/')), { force: true });
  }
  const sharp = candidates.some((candidate) => RASTER_EXTENSIONS.has(path.extname(candidate.relative).toLowerCase()))
    ? await loadSharp() : undefined;
  for (const candidate of candidates) {
    const relativeOutput = path.relative(outputRoot, candidate.output).split(path.sep).join('/');
    await secureParent(outputRoot, candidate.output);
    if (await exists(candidate.output) && !previous.has(relativeOutput)) unsafe(`output collision with unowned file: ${relativeOutput}`);
    const original = await fs.readFile(candidate.input);
    const extension = path.extname(candidate.relative).toLowerCase();
    const data = RASTER_EXTENSIONS.has(extension) ? await rasterPipeline(sharp!, original, extension).toBuffer() : original;
    const temporary = `${candidate.output}.easy-web-${process.pid}-${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, data);
    if (previous.has(relativeOutput)) await fs.rm(candidate.output, { force: true });
    await fs.rename(temporary, candidate.output);
  }
  const manifest: Manifest = { version: 1, files: [...next].sort() };
  await fs.writeFile(path.join(outputRoot, PREVIEW_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  logger.info(`Emitted ${candidates.length} bounded CMS preview asset(s).`);
}
