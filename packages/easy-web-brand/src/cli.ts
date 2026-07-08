import mri from 'mri';
import { trimFolder } from './trim.js';
import { generateFaviconsForFolder } from './favicons.js';

const USAGE = `
easy-web-brand — logo trimming and favicon generation for the easy-web ecosystem

Usage:
  easy-web-brand trim <folder> [options]
  easy-web-brand favicons <folder> --out=<outDir> [options]
  easy-web-brand --help

Commands:
  trim      Trim blank canvas from all *.png files in <folder> in-place.
  favicons  Generate multi-res ICO + PNG favicon sets from transparent logos in <folder>.

Options:
  --out=<dir>       Output directory for favicon generation (required for favicons command)
  --padding=<pct>   Padding percentage after trim (default: 2)
  --min-pad=<px>    Minimum padding in pixels (default: 10)
  --threshold=<n>   Trim threshold: color similarity 0-100 (default: 10)
  -h, --help        Show this help message
`.trim();

async function main(): Promise<void> {
  const argv = mri(process.argv.slice(2), {
    boolean: ['help', 'h'],
    string: ['out'],
    alias: { h: 'help' },
  });

  if (argv.help || argv._.length === 0) {
    process.stdout.write(USAGE + '\n');
    process.exit(0);
  }

  const [command, folder] = argv._;

  if (command !== 'trim' && command !== 'favicons') {
    process.stderr.write(`Unknown command: "${command}"\n\n${USAGE}\n`);
    process.exit(1);
  }

  if (!folder) {
    process.stderr.write(`Error: <folder> argument is required.\n\n${USAGE}\n`);
    process.exit(1);
  }

  if (command === 'trim') {
    const opts = {
      paddingPct: argv['padding'] !== undefined ? Number(argv['padding']) : undefined,
      minPaddingPx: argv['min-pad'] !== undefined ? Number(argv['min-pad']) : undefined,
      threshold: argv['threshold'] !== undefined ? Number(argv['threshold']) : undefined,
    };
    try {
      const result = await trimFolder(folder, opts);
      process.stdout.write(
        `Trim complete: ${result.processed.length} processed, ${result.skipped.length} skipped.\n`,
      );
      for (const f of result.processed) process.stdout.write(`  trimmed: ${f}\n`);
      for (const f of result.skipped) process.stdout.write(`  skipped: ${f}\n`);
    } catch (err) {
      process.stderr.write(
        `Error during trim: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      process.exit(2);
    }
  } else if (command === 'favicons') {
    const outDir = argv['out'];
    if (!outDir) {
      process.stderr.write(`Error: --out=<dir> is required for the favicons command.\n\n${USAGE}\n`);
      process.exit(1);
    }
    try {
      const results = await generateFaviconsForFolder(folder, outDir);
      process.stdout.write(`Favicons complete: ${results.length} sets generated.\n`);
      for (const r of results) {
        process.stdout.write(`  ${r.base}: ico, 32, 180, 512\n`);
      }
    } catch (err) {
      process.stderr.write(
        `Error during favicons: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      process.exit(2);
    }
  }
}

main();
