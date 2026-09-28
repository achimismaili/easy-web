import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Export-resolution smoke test.
 *
 * Every subpath export this package declares is resolved through Node's real
 * package-exports algorithm — not a regex, not a simulation. `createRequire()`
 * is anchored on this package's own `package.json`, so Node self-resolves the
 * `@easy-web/cms-adapters/...` specifiers against the very `exports` block
 * under test.
 *
 * Fixtures are the package's own real components, discovered on disk, so the
 * probe list grows automatically with the package.
 *
 * Regression gate for issue #17: `"./components/*"` maps onto
 * `"./src/components/*.astro"`, which appends the extension to the capture.
 * The `.astro`-suffixed specifier the README documents therefore resolved to
 * `*.astro.astro` and threw `ERR_PACKAGE_PATH_NOT_EXPORTED`. Deleting the
 * `"./components/*.astro"` key must make this file fail.
 */

const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
const packageJsonPath = path.join(packageRoot, 'package.json');

interface PackageManifest {
  name: string;
  exports: Record<string, string | Record<string, string>>;
}

const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageManifest;
const requireFromPackage = createRequire(pathToFileURL(packageJsonPath));

/** Every `exports` key except the package root, which needs a build to exist. */
const subpathEntries = Object.entries(pkg.exports).filter(([key]) => key !== '.');

interface Probe {
  /** The `exports` key this probe was expanded from. */
  key: string;
  /** A concrete specifier a consumer could write. */
  specifier: string;
  /** The absolute file the specifier must land on. */
  expectedFile: string;
}

/**
 * Expand one `exports` entry into concrete probes, substituting the `*`
 * wildcard with every real file the target pattern matches on disk.
 */
function expandProbes(key: string, target: string): Probe[] {
  if (!key.includes('*')) {
    return [
      {
        key,
        specifier: `${pkg.name}${key.slice(1)}`,
        expectedFile: path.resolve(packageRoot, target),
      },
    ];
  }

  const [keyPrefix, keySuffix] = key.split('*');
  const [targetPrefix, targetSuffix] = target.split('*');
  const targetDir = path.resolve(packageRoot, targetPrefix);

  const captures = readdirSync(targetDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(targetSuffix))
    .map((entry) => (targetSuffix ? entry.name.slice(0, -targetSuffix.length) : entry.name))
    .sort();

  return captures.map((capture) => ({
    key,
    specifier: `${pkg.name}${keyPrefix.slice(1)}${capture}${keySuffix}`,
    expectedFile: path.resolve(packageRoot, `${targetPrefix}${capture}${targetSuffix}`),
  }));
}

const probes = subpathEntries.flatMap(([key, target]) =>
  typeof target === 'string' ? expandProbes(key, target) : []
);

describe('@easy-web/cms-adapters subpath exports', () => {
  it('declares the subpath exports its README documents', () => {
    expect(Object.keys(pkg.exports)).toEqual(
      expect.arrayContaining([
        './components/*',
        './components/*.astro',
        './src/components/*.astro',
      ])
    );
  });

  it('expands every declared subpath key into at least one real probe', () => {
    for (const [key, target] of subpathEntries) {
      expect(
        typeof target,
        `export key "${key}" has a conditional target; teach expandProbes() about it`
      ).toBe('string');
      expect(
        probes.filter((probe) => probe.key === key).length,
        `export key "${key}" expanded to no probes — no fixture file matched its target`
      ).toBeGreaterThan(0);
    }
  });

  it.each(probes.map((probe) => [probe.specifier, probe.expectedFile] as const))(
    'resolves %s',
    (specifier, expectedFile) => {
      expect(requireFromPackage.resolve(specifier)).toBe(expectedFile);
    }
  );
});

describe('@easy-web/cms-adapters documented import forms (issue #17 regression gate)', () => {
  it('resolves AdminPage to one file through all three declared spellings', () => {
    const shorthand = requireFromPackage.resolve('@easy-web/cms-adapters/components/AdminPage');
    const withExtension = requireFromPackage.resolve(
      '@easy-web/cms-adapters/components/AdminPage.astro'
    );
    const fullSourcePath = requireFromPackage.resolve(
      '@easy-web/cms-adapters/src/components/AdminPage.astro'
    );

    expect(shorthand).toBe(path.resolve(packageRoot, 'src/components/AdminPage.astro'));
    expect(withExtension).toBe(shorthand);
    expect(fullSourcePath).toBe(shorthand);
  });
});
