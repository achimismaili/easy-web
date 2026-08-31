import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import easyWebNotFound from '../index.js';

type EmittedConfig = {
  readonly responseOverrides?: Record<string, unknown>;
  readonly routes?: readonly unknown[];
  readonly [key: string]: unknown;
};

type ManagedSidecar = {
  readonly keys: readonly string[];
  readonly version: string;
  readonly docs: string;
};

type RunOpts = {
  readonly existingConfig?: unknown;
  readonly existingSidecar?: unknown;
  readonly i18n?: {
    readonly defaultLocale: string;
    readonly locales: readonly (string | { readonly path: string })[];
  };
  readonly output?: string;
  readonly build?: { readonly format?: string };
  readonly trailingSlash?: string;
  readonly integrationOptions?: {
    readonly defaultLocale?: string;
    readonly locales?: readonly string[];
  };
};

const tempDirectories: string[] = [];
const MANAGED_404 = { rewrite: '/404.html', statusCode: 404 };
const DOCS_URL =
  'https://dev.azure.com/it-ci/websites/_git/websites?path=/docs/decisions/0013-shared-not-found-primitives.md';
const LEGAL_ROOT_KEYS: readonly string[] = [
  '$schema',
  'routes',
  'navigationFallback',
  'responseOverrides',
  'mimeTypes',
  'globalHeaders',
  'auth',
  'networking',
  'forwardingGateway',
  'platform',
  'trailingSlash',
];
const INVALID_SIDECARS: ReadonlyArray<{
  readonly label: string;
  readonly value: unknown;
}> = [
  {
    label: 'keys is not an array',
    value: { keys: 'responseOverrides.404', version: '0.2.0', docs: DOCS_URL },
  },
  {
    label: 'keys holds a non-string entry',
    value: {
      keys: ['responseOverrides.404', 404],
      version: '0.2.0',
      docs: DOCS_URL,
    },
  },
  {
    label: 'version is missing',
    value: { keys: ['responseOverrides.404'], docs: DOCS_URL },
  },
  {
    label: 'version is not a string',
    value: { keys: ['responseOverrides.404'], version: 2, docs: DOCS_URL },
  },
  {
    label: 'docs is missing',
    value: { keys: ['responseOverrides.404'], version: '0.2.0' },
  },
];

afterEach(() => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();
    if (directory && fs.existsSync(directory)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
  vi.restoreAllMocks();
});

type TempPaths = {
  readonly tmpDir: string;
  readonly configPath: string;
  readonly sidecarPath: string;
};

function createTempConfigDir(): TempPaths {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'easy-web-swa-test-'));
  tempDirectories.push(tmpDir);
  const configPath = path.join(tmpDir, 'staticwebapp.config.json');
  return { tmpDir, configPath, sidecarPath: `${configPath}.easy-web-managed.json` };
}

// Split out of runIntegration so failure-path cases can assert the rejection
// without the helper first reading files the failed build never wrote.
async function invokeHooks(tmpDir: string, opts: RunOpts = {}): Promise<void> {
  const integration = easyWebNotFound(opts.integrationOptions ?? {});
  const hooks: unknown = integration.hooks;
  if (!isRecord(hooks)) {
    throw new TypeError('Expected Astro integration hooks');
  }
  const setupHook = hooks['astro:config:setup'];
  if (typeof setupHook === 'function') {
    await setupHook({
      config: {
        i18n: opts.i18n,
        output: opts.output ?? 'static',
        build: opts.build ?? { format: 'directory' },
        trailingSlash: opts.trailingSlash ?? 'ignore',
      },
    });
  }
  const doneHook = hooks['astro:build:done'];
  if (typeof doneHook === 'function') {
    await doneHook({ dir: pathToFileURL(`${tmpDir}${path.sep}`) });
  }
}

async function runIntegration(opts: RunOpts): Promise<{
  readonly tmpDir: string;
  readonly configPath: string;
  readonly sidecarPath: string;
  readonly emittedRaw: string;
  readonly emitted: EmittedConfig;
  readonly sidecarRaw: string;
  readonly sidecar: ManagedSidecar;
}> {
  const { tmpDir, configPath, sidecarPath } = createTempConfigDir();

  if (opts.existingConfig !== undefined) {
    writeJson(configPath, opts.existingConfig);
  }
  if (opts.existingSidecar !== undefined) {
    writeJson(sidecarPath, opts.existingSidecar);
  }

  await invokeHooks(tmpDir, opts);

  const emittedRaw = fs.readFileSync(configPath, 'utf-8');
  const sidecarRaw = fs.readFileSync(sidecarPath, 'utf-8');
  return {
    tmpDir,
    configPath,
    sidecarPath,
    emittedRaw,
    emitted: JSON.parse(emittedRaw),
    sidecarRaw,
    sidecar: JSON.parse(sidecarRaw),
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the integration to throw, but it resolved');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

describe('easyWebNotFound merge algorithm', () => {
  it('derives trailingSlash "always" from build.format directory', async () => {
    const { emitted, sidecar } = await runIntegration({
      build: { format: 'directory' },
    });

    expect(emitted.trailingSlash).toBe('always');
    expect(sidecar.keys).toContain('trailingSlash');
  });

  it('derives trailingSlash "never" from build.format file', async () => {
    const { emitted } = await runIntegration({ build: { format: 'file' } });

    expect(emitted.trailingSlash).toBe('never');
  });

  it('lets an explicit astro trailingSlash outrank the output shape', async () => {
    const never = await runIntegration({
      build: { format: 'directory' },
      trailingSlash: 'never',
    });
    const always = await runIntegration({
      build: { format: 'file' },
      trailingSlash: 'always',
    });

    expect(never.emitted.trailingSlash).toBe('never');
    expect(always.emitted.trailingSlash).toBe('always');
  });

  it('leaves trailingSlash unmanaged for build.format preserve, which emits both shapes', async () => {
    const { emitted, sidecar } = await runIntegration({
      build: { format: 'preserve' },
    });

    expect(emitted.trailingSlash).toBeUndefined();
    expect(sidecar.keys).not.toContain('trailingSlash');
    expect(sidecar.keys).toContain('responseOverrides.404');
  });

  it('yields to a user-defined trailingSlash and stops managing it', async () => {
    const { emitted, sidecar } = await runIntegration({
      existingConfig: { trailingSlash: 'never' },
      build: { format: 'directory' },
    });

    expect(emitted.trailingSlash).toBe('never');
    expect(sidecar.keys).not.toContain('trailingSlash');
  });

  it('drops a previously managed trailingSlash once it is no longer derivable', async () => {
    const build1 = await runIntegration({ build: { format: 'directory' } });
    expect(build1.emitted.trailingSlash).toBe('always');

    const build2 = await runIntegration({
      existingConfig: build1.emitted,
      existingSidecar: build1.sidecar,
      build: { format: 'preserve' },
    });

    expect(build2.emitted.trailingSlash).toBeUndefined();
    expect(build2.sidecar.keys).not.toContain('trailingSlash');
  });

  it('rewrites its own managed trailingSlash when the astro config changes', async () => {
    const build1 = await runIntegration({ build: { format: 'directory' } });
    const build2 = await runIntegration({
      existingConfig: build1.emitted,
      existingSidecar: build1.sidecar,
      build: { format: 'file' },
    });

    expect(build2.emitted.trailingSlash).toBe('never');
    expect(build2.sidecar.keys).toContain('trailingSlash');
  });
  it('case 1: no existing file emits a global 404 override and sidecar only', async () => {
    const result = await runIntegration({
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });

    expect(result.emitted).toEqual({
      responseOverrides: { '404': MANAGED_404 },
      trailingSlash: 'always',
    });
    expect(result.emitted.routes).toBeUndefined();
    expect(result.sidecar).toEqual({
      keys: ['responseOverrides.404', 'trailingSlash'],
      version: '1.2.0',
      docs: DOCS_URL,
    });
  });

  it('case 2: existing user routes are unchanged and no locale route is added', async () => {
    const userRoutes = [
      { route: '/api/*', allowedRoles: ['authenticated'] },
      { route: '/admin/*', allowedRoles: ['admin'] },
    ];
    const { emitted, sidecar } = await runIntegration({
      existingConfig: { routes: userRoutes },
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });

    expect(emitted.routes).toEqual(userRoutes);
    expect(emitted.responseOverrides?.['404']).toEqual(MANAGED_404);
    expect(sidecar.keys).toEqual(['responseOverrides.404', 'trailingSlash']);
  });

  it('case 3: claimed 404 is refreshed while unrelated config is preserved', async () => {
    const userAuth = {
      identityProviders: {
        azureActiveDirectory: {
          registration: {
            openIdIssuer: 'https://login.microsoftonline.com/tenant-id/v2.0',
          },
        },
      },
    };
    const userGlobalHeaders = {
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'",
    };
    const userNavigationFallback = {
      rewrite: '/index.html',
      exclude: ['/images/*.{png,jpg,gif}', '/api/*'],
    };
    const userRoutes = [{ route: '/api/*', allowedRoles: ['authenticated'] }];
    const { emitted, sidecar } = await runIntegration({
      existingConfig: {
        auth: userAuth,
        globalHeaders: userGlobalHeaders,
        navigationFallback: userNavigationFallback,
        responseOverrides: {
          '404': { rewrite: '/stale-managed-404.html', statusCode: 404 },
          '500': { rewrite: '/500.html', statusCode: 500 },
        },
        routes: userRoutes,
      },
      existingSidecar: {
        keys: ['responseOverrides.404'],
        version: '0.1.0',
        docs: DOCS_URL,
      },
      i18n: { defaultLocale: 'de', locales: ['de', 'en', 'fr'] },
    });

    expect(emitted.auth).toEqual(userAuth);
    expect(emitted.globalHeaders).toEqual(userGlobalHeaders);
    expect(emitted.navigationFallback).toEqual(userNavigationFallback);
    expect(emitted.routes).toEqual(userRoutes);
    expect(emitted.responseOverrides?.['500']).toEqual({
      rewrite: '/500.html',
      statusCode: 500,
    });
    expect(emitted.responseOverrides?.['404']).toEqual(MANAGED_404);
    expect(sidecar.keys).toEqual(['responseOverrides.404', 'trailingSlash']);
  });

  it('case 4: unclaimed user 404 wins and remains unclaimed', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const userOverride = { rewrite: '/custom-404.html', statusCode: 404 };
    const { emitted, sidecar } = await runIntegration({
      existingConfig: { responseOverrides: { '404': userOverride } },
      existingSidecar: { keys: [], version: '0.2.0', docs: DOCS_URL },
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('user override wins'),
    );
    expect(emitted.responseOverrides?.['404']).toEqual(userOverride);
    expect(sidecar.keys).toEqual(['trailingSlash']);
  });

  it('case 5: no i18n config uses the same global-only model', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { emitted, sidecar } = await runIntegration({});

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('single-locale mode'),
    );
    expect(emitted.responseOverrides?.['404']).toEqual(MANAGED_404);
    expect(emitted.routes).toBeUndefined();
    expect(sidecar.keys).toEqual(['responseOverrides.404', 'trailingSlash']);
  });

  it('case 6: config and sidecar use two-space JSON with one trailing newline', async () => {
    const { emittedRaw, sidecarRaw } = await runIntegration({
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });
    const expectedConfig =
      '{\n' +
      '  "responseOverrides": {\n' +
      '    "404": {\n' +
      '      "rewrite": "/404.html",\n' +
      '      "statusCode": 404\n' +
      '    }\n' +
      '  },\n' +
      '  "trailingSlash": "always"\n' +
      '}\n';
    const expectedSidecar =
      '{\n' +
      '  "keys": [\n' +
      '    "responseOverrides.404",\n' +
      '    "trailingSlash"\n' +
      '  ],\n' +
      '  "version": "1.2.0",\n' +
      `  "docs": "${DOCS_URL}"\n` +
      '}\n';

    expect(emittedRaw).toBe(expectedConfig);
    expect(sidecarRaw).toBe(expectedSidecar);
    expect(emittedRaw.endsWith('\n\n')).toBe(false);
    expect(sidecarRaw.endsWith('\n\n')).toBe(false);
  });

  it('case 7: a user locale route remains untouched without conflict handling', async () => {
    const userRoute = {
      route: '/en/*',
      rewrite: '/legacy-en/404.html',
      statusCode: 404,
    };
    const { emitted, sidecar } = await runIntegration({
      existingConfig: { routes: [userRoute] },
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });

    expect(emitted.routes).toEqual([userRoute]);
    expect(sidecar.keys).toEqual(['responseOverrides.404', 'trailingSlash']);
  });

  it('case 8: changing locales is a no-op for the locale-agnostic managed slice', async () => {
    const build1 = await runIntegration({
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });
    const build2 = await runIntegration({
      existingConfig: build1.emitted,
      existingSidecar: build1.sidecar,
      i18n: { defaultLocale: 'en', locales: ['de', 'en', 'fr'] },
    });

    expect(build2.emitted).toEqual(build1.emitted);
    expect(build2.sidecar).toEqual(build1.sidecar);
    expect(build2.emitted.routes).toBeUndefined();
  });

  it('defect A: emitted config contains only schema-legal root keys', async () => {
    const { emitted } = await runIntegration({
      existingConfig: { $easyWebManaged: { legacy: true } },
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });

    expect(Object.keys(emitted).every((key) => LEGAL_ROOT_KEYS.includes(key))).toBe(
      true,
    );
    expect(emitted['$easyWebManaged']).toBeUndefined();
  });

  it('defect B: build writes keys, version, and docs to a sidecar file', async () => {
    const { sidecarPath, sidecar } = await runIntegration({
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });

    expect(fs.existsSync(sidecarPath)).toBe(true);
    expect(sidecar).toEqual({
      keys: ['responseOverrides.404', 'trailingSlash'],
      version: '1.2.0',
      docs: DOCS_URL,
    });
  });

  it('consecutive-build defect: user-owned responseOverrides.404 survives build 2', async () => {
    const userOverride = { rewrite: '/custom-404.html', statusCode: 404 };
    const build1 = await runIntegration({
      existingConfig: { responseOverrides: { '404': userOverride } },
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });
    const build2 = await runIntegration({
      existingConfig: build1.emitted,
      existingSidecar: build1.sidecar,
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });

    expect(build1.sidecar.keys).toEqual(['trailingSlash']);
    expect(build2.emitted.responseOverrides?.['404']).toEqual(userOverride);
    expect(build2.sidecar.keys).toEqual(['trailingSlash']);
  });

  it('case 9: malformed JSON in the config throws a SyntaxError naming the config path', async () => {
    const { tmpDir, configPath, sidecarPath } = createTempConfigDir();
    fs.writeFileSync(configPath, '{ broken', 'utf-8');

    const error = await captureError(
      invokeHooks(tmpDir, {
        i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
      }),
    );

    expect(error).toBeInstanceOf(SyntaxError);
    expect(errorMessage(error)).toContain(configPath);
    expect(errorMessage(error)).toContain('failed to parse JSON');
    expect(fs.readFileSync(configPath, 'utf-8')).toBe('{ broken');
    expect(fs.existsSync(sidecarPath)).toBe(false);
  });

  it('case 10: malformed JSON in the sidecar throws a SyntaxError naming the sidecar path', async () => {
    const { tmpDir, configPath, sidecarPath } = createTempConfigDir();
    writeJson(configPath, { responseOverrides: { '404': MANAGED_404 } });
    fs.writeFileSync(sidecarPath, '{ "keys": [', 'utf-8');

    const error = await captureError(
      invokeHooks(tmpDir, {
        i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
      }),
    );

    expect(error).toBeInstanceOf(SyntaxError);
    expect(errorMessage(error)).toContain(sidecarPath);
    expect(errorMessage(error)).toContain('failed to parse JSON');
    expect(fs.readFileSync(sidecarPath, 'utf-8')).toBe('{ "keys": [');
  });

  it('case 11: a non-object config document throws a TypeError naming the config path', async () => {
    const { tmpDir, configPath } = createTempConfigDir();
    writeJson(configPath, [{ route: '/api/*' }]);

    const error = await captureError(
      invokeHooks(tmpDir, {
        i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
      }),
    );

    expect(error).toBeInstanceOf(TypeError);
    expect(errorMessage(error)).toContain(configPath);
    expect(errorMessage(error)).toContain('expected a JSON object');
  });

  it('case 12: a non-object sidecar document throws a TypeError naming the sidecar path', async () => {
    const { tmpDir, configPath, sidecarPath } = createTempConfigDir();
    writeJson(configPath, { responseOverrides: { '404': MANAGED_404 } });
    writeJson(sidecarPath, 'responseOverrides.404');

    const error = await captureError(
      invokeHooks(tmpDir, {
        i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
      }),
    );

    expect(error).toBeInstanceOf(TypeError);
    expect(errorMessage(error)).toContain(sidecarPath);
    expect(errorMessage(error)).toContain('expected a JSON object');
  });

  for (const { label, value } of INVALID_SIDECARS) {
    it(`case 13 (${label}): an invalid sidecar shape throws a TypeError naming the sidecar path`, async () => {
      const { tmpDir, configPath, sidecarPath } = createTempConfigDir();
      writeJson(configPath, { responseOverrides: { '404': MANAGED_404 } });
      writeJson(sidecarPath, value);

      const error = await captureError(
        invokeHooks(tmpDir, {
          i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
        }),
      );

      expect(error).toBeInstanceOf(TypeError);
      expect(errorMessage(error)).toContain(sidecarPath);
      expect(errorMessage(error)).toContain('invalid managed metadata');
    });
  }

  it('case 14: a legacy 0.1.x root sentinel without a sidecar migrates to the sidecar layout', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const legacyManaged404 = { rewrite: '/404.html', statusCode: 404 };
    const legacyLocaleRoute = {
      route: '/en/*',
      rewrite: '/en/404.html',
      statusCode: 404,
    };
    const build1 = await runIntegration({
      existingConfig: {
        $easyWebManaged: {
          keys: ['responseOverrides.404', 'routes[0]'],
          routeIndices: [0],
          version: '0.1.0',
          docs: DOCS_URL,
        },
        globalHeaders: { 'X-Frame-Options': 'DENY' },
        responseOverrides: { '404': legacyManaged404 },
        routes: [legacyLocaleRoute],
      },
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'omitting non-schema-legal root key "$easyWebManaged"',
      ),
    );
    expect(build1.emitted['$easyWebManaged']).toBeUndefined();
    expect(
      Object.keys(build1.emitted).every((key) => LEGAL_ROOT_KEYS.includes(key)),
    ).toBe(true);
    expect(fs.existsSync(build1.sidecarPath)).toBe(true);
    expect(build1.sidecar.version).toBe('1.2.0');
    expect(build1.sidecar.keys).toEqual(['trailingSlash']);
    expect(build1.emitted.responseOverrides?.['404']).toEqual(legacyManaged404);
    expect(build1.emitted.routes).toEqual([legacyLocaleRoute]);
    expect(build1.emitted.globalHeaders).toEqual({ 'X-Frame-Options': 'DENY' });

    const build2 = await runIntegration({
      existingConfig: build1.emitted,
      existingSidecar: build1.sidecar,
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });

    expect(build2.emitted['$easyWebManaged']).toBeUndefined();
    expect(build2.emittedRaw).toBe(build1.emittedRaw);
    expect(build2.sidecarRaw).toBe(build1.sidecarRaw);
  });

  it('case 15: a legacy root sentinel with no responseOverrides is claimed fresh', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { emitted, sidecar, sidecarPath } = await runIntegration({
      existingConfig: {
        $easyWebManaged: {
          keys: ['routes[0]'],
          routeIndices: [0],
          version: '0.1.0',
          docs: DOCS_URL,
        },
        navigationFallback: { rewrite: '/index.html', exclude: ['/api/*'] },
      },
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'omitting non-schema-legal root key "$easyWebManaged"',
      ),
    );
    expect(emitted['$easyWebManaged']).toBeUndefined();
    expect(emitted.responseOverrides?.['404']).toEqual(MANAGED_404);
    expect(emitted.navigationFallback).toEqual({
      rewrite: '/index.html',
      exclude: ['/api/*'],
    });
    expect(fs.existsSync(sidecarPath)).toBe(true);
    expect(sidecar.keys).toEqual(['responseOverrides.404', 'trailingSlash']);
  });

  it('case 16: stale route claims in the sidecar are ignored and dropped', async () => {
    const userRoutes = [{ route: '/api/*', allowedRoles: ['authenticated'] }];
    const { emitted, sidecar } = await runIntegration({
      existingConfig: {
        responseOverrides: {
          '404': { rewrite: '/stale-managed-404.html', statusCode: 404 },
        },
        routes: userRoutes,
      },
      existingSidecar: {
        keys: ['responseOverrides.404', 'routes[7]', 'routes[9]'],
        version: '0.1.0',
        docs: DOCS_URL,
      },
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });

    expect(emitted.routes).toEqual(userRoutes);
    expect(emitted.responseOverrides?.['404']).toEqual(MANAGED_404);
    expect(sidecar.keys).toEqual(['responseOverrides.404', 'trailingSlash']);
  });

  it('case 17: a sidecar claiming only stale route keys leaves an existing 404 user-owned', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const userOverride = { rewrite: '/custom-404.html', statusCode: 404 };
    const { emitted, sidecar } = await runIntegration({
      existingConfig: { responseOverrides: { '404': userOverride } },
      existingSidecar: {
        keys: ['routes[0]'],
        version: '0.1.0',
        docs: DOCS_URL,
      },
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('user override wins'),
    );
    expect(emitted.responseOverrides?.['404']).toEqual(userOverride);
    expect(sidecar.keys).toEqual(['trailingSlash']);
  });

  it('case 18: auth, globalHeaders and navigationFallback are value-preserved (formatting normalises)', async () => {
    const userAuth = {
      identityProviders: {
        azureActiveDirectory: {
          registration: {
            openIdIssuer: 'https://login.microsoftonline.com/tenant-id/v2.0',
            clientIdSettingName: 'AZURE_CLIENT_ID',
            clientSecretSettingName: 'AZURE_CLIENT_SECRET',
          },
        },
      },
    };
    const userGlobalHeaders = {
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'",
    };
    const userNavigationFallback = {
      rewrite: '/index.html',
      exclude: ['/images/*.{png,jpg,gif}', '/api/*'],
    };

    // Built with a raw fs.writeFileSync, NOT the writeJson helper: writeJson
    // pre-canonicalizes with the very serializer under test, which is what made
    // the previous byte-identity assertion self-fulfilling. Keep this literal.
    const nonCanonicalRawFixture = [
      '{',
      '    "responseOverrides": {',
      '',
      '        "404": {',
      '            "statusCode": 404,',
      '            "rewrite": "/stale-managed-404.html"',
      '        }',
      '    },',
      '',
      '    "navigationFallback": {',
      '        "exclude": [',
      '            "/images/*.{png,jpg,gif}",',
      '            "/api/*"',
      '        ],',
      '        "rewrite": "/index.html"',
      '    },',
      '',
      '    "globalHeaders": {',
      '        "Content-Security-Policy": "default-src \'self\'",',
      '        "X-Frame-Options": "DENY"',
      '    },',
      '',
      '    "auth": {',
      '        "identityProviders": {',
      '            "azureActiveDirectory": {',
      '                "registration": {',
      '                    "clientSecretSettingName": "AZURE_CLIENT_SECRET",',
      '                    "clientIdSettingName": "AZURE_CLIENT_ID",',
      '                    "openIdIssuer": "https://login.microsoftonline.com/tenant-id/v2.0"',
      '                }',
      '            }',
      '        }',
      '    }',
      '}',
      '',
    ].join('\n');

    const { tmpDir, configPath, sidecarPath } = createTempConfigDir();
    fs.writeFileSync(configPath, nonCanonicalRawFixture, 'utf-8');
    writeJson(sidecarPath, {
      keys: ['responseOverrides.404'],
      version: '1.2.0',
      docs: DOCS_URL,
    });

    await invokeHooks(tmpDir, {
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });

    const emittedRaw = fs.readFileSync(configPath, 'utf-8');
    const emitted: EmittedConfig = JSON.parse(emittedRaw);

    expect(emitted.auth).toEqual(userAuth);
    expect(emitted.globalHeaders).toEqual(userGlobalHeaders);
    expect(emitted.navigationFallback).toEqual(userNavigationFallback);

    const managed404 = emitted.responseOverrides?.['404'];
    if (!isRecord(managed404)) {
      throw new TypeError('Expected an emitted responseOverrides.404 object');
    }
    expect(managed404).toEqual(MANAGED_404);

    expect(emittedRaw).not.toBe(nonCanonicalRawFixture);

    // Two-space ladder: root keys sit at depth*2 spaces, so 2 / 4 / 6 below.
    // The fixture put these same three keys at 4 / 8 / 12.
    expect(emittedRaw).toContain('\n  "auth": {\n');
    expect(emittedRaw).toContain('\n    "identityProviders": {\n');
    expect(emittedRaw).toContain('\n      "azureActiveDirectory": {\n');
    expect(nonCanonicalRawFixture).toContain('\n    "auth": {\n');
    expect(nonCanonicalRawFixture).toContain(
      '\n        "identityProviders": {\n',
    );
    expect(emittedRaw).not.toContain('\n    "auth": {\n');

    expect(nonCanonicalRawFixture).toContain('\n\n');
    expect(emittedRaw).not.toContain('\n\n');
    expect(emittedRaw.endsWith('}\n')).toBe(true);

    expect(Object.keys(managed404)).toEqual(['rewrite', 'statusCode']);
  });

  it('case 19: a single-locale build claims no routes[] ownership', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const userRoutes = [{ route: '/api/*', allowedRoles: ['authenticated'] }];
    const { emitted, sidecar } = await runIntegration({
      existingConfig: { routes: userRoutes },
    });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('single-locale mode'),
    );
    expect(sidecar.keys).toEqual(['responseOverrides.404', 'trailingSlash']);
    expect(sidecar.keys.some((key) => key.startsWith('routes'))).toBe(false);
    expect(emitted.routes).toEqual(userRoutes);
  });

  it('case 20: a non-object responseOverrides throws a TypeError naming the config path', async () => {
    const { tmpDir, configPath } = createTempConfigDir();
    writeJson(configPath, { responseOverrides: ['/404.html'] });

    const error = await captureError(
      invokeHooks(tmpDir, {
        i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
      }),
    );

    expect(error).toBeInstanceOf(TypeError);
    expect(errorMessage(error)).toContain(configPath);
    expect(errorMessage(error)).toContain(
      'expected responseOverrides to be an object',
    );
  });
});
