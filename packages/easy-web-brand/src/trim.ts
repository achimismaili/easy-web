import sharp from 'sharp';
import { readdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

export interface TrimOptions {
  paddingPct?: number;    // default 2
  minPaddingPx?: number;  // default 10
  threshold?: number;     // default 10
  minOutputDim?: number;  // default 50
}

export interface TrimResult {
  buffer: Buffer;
  changed: boolean;
  before: { w: number; h: number };
  after: { w: number; h: number };
}

/**
 * Trim solid-color / transparent borders from a logo PNG and re-pad it with a small
 * background-aware margin. Auto-detects transparent vs white background by inspecting
 * the top-left pixel of the raw input.
 *
 * Sharp API note: `.metadata()` on a chained `.trim()` pipeline returns the ORIGINAL
 * header dimensions (it does not evaluate operations). To read post-trim dimensions we
 * must materialize the buffer via `.toBuffer({ resolveWithObject: true })` and read
 * `info.width` / `info.height`.
 */
export async function trimLogos(
  input: string | Buffer,
  opts?: TrimOptions,
): Promise<TrimResult> {
  const threshold = opts?.threshold ?? 10;
  const minOutputDim = opts?.minOutputDim ?? 50;
  const paddingPct = opts?.paddingPct ?? 2;
  const minPaddingPx = opts?.minPaddingPx ?? 10;

  // Read original dimensions from the input header.
  const origMeta = await sharp(input).metadata();
  const origW = origMeta.width!;
  const origH = origMeta.height!;

  // Detect background mode from the top-left pixel of the ORIGINAL image.
  const { data: rawData, info: rawInfo } = await sharp(input)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const hasAlpha = rawInfo.channels === 4;
  const topLeftAlpha = hasAlpha ? rawData[3]! : 255;
  const mode: 'transparent' | 'white' = hasAlpha && topLeftAlpha === 0 ? 'transparent' : 'white';

  // Perform the trim and capture the ACTUAL post-trim dimensions from the resulting buffer.
  const { data: trimmedPng, info: trimInfo } = await sharp(input)
    .trim({ threshold })
    .png()
    .toBuffer({ resolveWithObject: true });
  const trimW = trimInfo.width;
  const trimH = trimInfo.height;

  // NO-OP SKIP: trim found nothing to remove — return the original bytes unchanged.
  if (trimW === origW && trimH === origH) {
    const originalBuffer = Buffer.isBuffer(input) ? input : await sharp(input).png().toBuffer();
    return {
      buffer: originalBuffer,
      changed: false,
      before: { w: origW, h: origH },
      after: { w: trimW, h: trimH },
    };
  }

  // OVER-TRIM GUARD: refuse to produce pathologically small outputs (e.g. threshold too high).
  if (trimW < minOutputDim || trimH < minOutputDim) {
    const label = typeof input === 'string' ? input : '<buffer>';
    throw new Error(
      `trim produced pathologically small output: ${trimW}x${trimH}, refusing to overwrite ${label}`,
    );
  }

  // Add background-aware padding. paddingPct is a percentage of the shorter trimmed edge;
  // minPaddingPx is a floor so tiny logos still get a comfortable margin.
  const pad = Math.max(minPaddingPx, Math.round((paddingPct / 100) * Math.min(trimW, trimH)));
  const background =
    mode === 'transparent'
      ? { r: 0, g: 0, b: 0, alpha: 0 }
      : { r: 255, g: 255, b: 255, alpha: 1 };

  const resultBuffer = await sharp(trimmedPng)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();

  const finalMeta = await sharp(resultBuffer).metadata();
  return {
    buffer: resultBuffer,
    changed: true,
    before: { w: origW, h: origH },
    after: { w: finalMeta.width!, h: finalMeta.height! },
  };
}

/**
 * Trim every `*.png` in `folderPath` in-place. Files where the trim is a no-op are left
 * on disk untouched (skipped). Files where trim shrinks the image are overwritten with
 * the padded, re-encoded PNG.
 */
export async function trimFolder(
  folderPath: string,
  opts?: TrimOptions,
): Promise<{ processed: string[]; skipped: string[] }> {
  const files = await readdir(folderPath);
  const pngs = files.filter((f) => extname(f).toLowerCase() === '.png');

  const processed: string[] = [];
  const skipped: string[] = [];

  for (const file of pngs) {
    const fullPath = join(folderPath, file);
    const result = await trimLogos(fullPath, opts);
    if (result.changed) {
      await writeFile(fullPath, result.buffer);
      processed.push(file);
    } else {
      skipped.push(file);
    }
  }

  return { processed, skipped };
}
