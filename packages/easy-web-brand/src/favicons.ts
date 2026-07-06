import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, extname, basename, resolve } from 'node:path';

export interface FaviconOutputs {
  ico: string;
  png32: string;
  png180: string;
  png512: string;
}

/**
 * Generate a multi-resolution ICO (16/32/48 px frames) and three PNG sizes
 * (32×32, 180×180, 512×512) from a single transparent-background source PNG.
 *
 * All outputs are written to `outDir` with the given `baseName`:
 *   <baseName>.ico, <baseName>-32.png, <baseName>-180.png, <baseName>-512.png
 *
 * Kernel choice: 16px uses `nearest` for pixel-crisp tiny icons; 32/48/180/512 use
 * `lanczos3` for high-quality downscaling. Background is always transparent so the
 * source PNG's alpha channel is preserved through the resize pipeline.
 */
export async function generateFavicons(
  input: string | Buffer,
  outDir: string,
  baseName: string,
): Promise<FaviconOutputs> {
  await mkdir(outDir, { recursive: true });

  // Resize to all required sizes in parallel.
  const [buf16, buf32, buf48, buf180, buf512] = await Promise.all([
    // 16px: nearest-neighbor for pixel-crisp tiny icon
    sharp(input)
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.nearest,
      })
      .png()
      .toBuffer(),
    // 32px and above: lanczos3 for quality
    sharp(input)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer(),
    sharp(input)
      .resize(48, 48, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer(),
    sharp(input)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer(),
    sharp(input)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer(),
  ]);

  // Build multi-res ICO from 16/32/48 frames. png-to-ico takes an array of PNG buffers
  // and returns a single ICO buffer whose frame count equals the input array length.
  const icoBuffer = await pngToIco([buf16, buf32, buf48]);

  const icoPath = resolve(outDir, `${baseName}.ico`);
  const png32Path = resolve(outDir, `${baseName}-32.png`);
  const png180Path = resolve(outDir, `${baseName}-180.png`);
  const png512Path = resolve(outDir, `${baseName}-512.png`);

  await Promise.all([
    writeFile(icoPath, icoBuffer),
    writeFile(png32Path, buf32),
    writeFile(png180Path, buf180),
    writeFile(png512Path, buf512),
  ]);

  return { ico: icoPath, png32: png32Path, png180: png180Path, png512: png512Path };
}

/**
 * Generate favicon sets for every transparent-background logo in `folderPath`.
 * Files ending with `-white` are skipped (white-background logos produce ugly favicons).
 * Outputs land in `outDir` named after each source base name.
 */
export async function generateFaviconsForFolder(
  folderPath: string,
  outDir: string,
): Promise<Array<{ base: string; outputs: FaviconOutputs }>> {
  const files = await readdir(folderPath);
  const sources = files.filter(
    (f) => extname(f).toLowerCase() === '.png' && !basename(f, '.png').endsWith('-white'),
  );

  const results: Array<{ base: string; outputs: FaviconOutputs }> = [];
  for (const file of sources) {
    const base = basename(file, '.png');
    const outputs = await generateFavicons(join(folderPath, file), outDir, base);
    results.push({ base, outputs });
  }
  return results;
}
