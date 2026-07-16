import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { pathToFileURL } from 'node:url';
import easyWebNotFound from '../index.js';

/**
 * Unit tests for the sentinel-marked staticwebapp.config.json merge algorithm.
 *
 * These tests exercise the actual exported `easyWebNotFound` integration by
 * invoking its `astro:config:setup` and `astro:build:done` hooks against a
 * real temp directory (no mocked fs, no mocked merge). The 7 core scenarios
 * are the enterprise-grade behaviors documented in ADR 0013.
 */

type EmittedConfig = {
  responseOverrides?: Record<string, unknown>;
  routes?: unknown[];
  $easyWebManaged?: {
    keys: string[];
    routeIndices: number[];
    version: string;
    docs: string;
  };
  [k: string]: unknown;
};

type RunOpts = {
  existingConfig?: unknown;
  i18n?: { defaultLocale: string; locales: (string | { path: string })[] };
  output?: string;
  integrationOptions?: { defaultLocale?: string; locales?: string[] };
};

const _tmpDirs: string[] = [];

afterEach(() => {
  while (_tmpDirs.length > 0) {
    const d = _tmpDirs.pop();
    if (d && fs.existsSync(d)) {
      try {
        fs.rmSync(d, { recursive: true, force: true });
      } catch {
        /* best-effort cleanup */
      }
    }
  }
  vi.restoreAllMocks();
});

async function runIntegration(opts: RunOpts): Promise<{
  tmpDir: string;
  configPath: string;
  emittedRaw: string;
  emitted: EmittedConfig;
}> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'easy-web-swa-test-'));
  _tmpDirs.push(tmpDir);
  const configPath = path.join(tmpDir, 'staticwebapp.config.json');
  if (opts.existingConfig !== undefined) {
    fs.writeFileSync(
      configPath,
      JSON.stringify(opts.existingConfig, null, 2) + '\n',
      'utf-8',
    );
  }
  const integration = easyWebNotFound(opts.integrationOptions ?? {});
  const hooks = integration.hooks as Record<
    string,
    (arg: unknown) => unknown | Promise<unknown>
  >;
  const setupHook = hooks['astro:config:setup'];
  if (typeof setupHook === 'function') {
    await setupHook({
      config: { i18n: opts.i18n, output: opts.output ?? 'static' },
    });
  }
  const doneHook = hooks['astro:build:done'];
  if (typeof doneHook === 'function') {
    await doneHook({ dir: pathToFileURL(tmpDir + path.sep) });
  }
  const emittedRaw = fs.readFileSync(configPath, 'utf-8');
  return {
    tmpDir,
    configPath,
    emittedRaw,
    emitted: JSON.parse(emittedRaw) as EmittedConfig,
  };
}

const MANAGED_404 = { rewrite: '/404.html', statusCode: 404 };
const DOCS_URL =
  'https://github.com/achimismaili/websites/blob/main/docs/decisions/0013-shared-not-found-primitives.md';

describe('easyWebNotFound merge algorithm', () => {
  it('case 1: no existing file → sentinel + responseOverrides.404 + /en/* route', async () => {
    const { emitted } = await runIntegration({
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });
    expect(emitted.$easyWebManaged).toBeDefined();
    expect(emitted.$easyWebManaged?.version).toBe('0.1.0');
    expect(emitted.$easyWebManaged?.docs).toBe(DOCS_URL);
    expect(emitted.$easyWebManaged?.keys).toEqual([
      'responseOverrides.404',
      'routes[]',
    ]);
    expect(emitted.responseOverrides?.['404']).toEqual(MANAGED_404);
    expect(emitted.routes).toEqual([
      { route: '/en/*', rewrite: '/en/404/index.html', statusCode: 404 },
    ]);
    expect(emitted.$easyWebManaged?.routeIndices).toEqual([0]);
  });

  it('case 2: existing user routes, no sentinel → user routes preserved + shared slice added', async () => {
    const userRoutes = [
      { route: '/api/*', allowedRoles: ['authenticated'] },
      { route: '/admin/*', allowedRoles: ['admin'] },
    ];
    const { emitted } = await runIntegration({
      existingConfig: { routes: userRoutes },
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });
    // User routes preserved byte-identical at [0..1]
    expect(emitted.routes?.[0]).toEqual(userRoutes[0]);
    expect(emitted.routes?.[1]).toEqual(userRoutes[1]);
    // Managed route appended at [2]
    expect(emitted.routes?.[2]).toEqual({
      route: '/en/*',
      rewrite: '/en/404/index.html',
      statusCode: 404,
    });
    // Sentinel manages both keys, indices point only to appended entry
    expect(emitted.$easyWebManaged?.keys).toEqual(
      expect.arrayContaining(['responseOverrides.404', 'routes[]']),
    );
    expect(emitted.$easyWebManaged?.routeIndices).toEqual([2]);
    expect(emitted.responseOverrides?.['404']).toEqual(MANAGED_404);
  });

  it('case 3: existing sentinel → replaces managed keys; auth/globalHeaders/navigationFallback byte-identical', async () => {
    const userAuth = {
      identityProviders: {
        azureActiveDirectory: {
          registration: {
            openIdIssuer:
              'https://login.microsoftonline.com/tenant-id/v2.0',
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
    const existingConfig = {
      auth: userAuth,
      globalHeaders: userGlobalHeaders,
      navigationFallback: userNavigationFallback,
      responseOverrides: {
        '404': { rewrite: '/404.html', statusCode: 404 },
        '500': { rewrite: '/500.html', statusCode: 500 },
      },
      routes: [
        { route: '/api/*', allowedRoles: ['authenticated'] },
        // Previously managed route at index 1 — should be dropped on rebuild
        { route: '/en/*', rewrite: '/en/404/index.html', statusCode: 404 },
      ],
      $easyWebManaged: {
        keys: ['responseOverrides.404', 'routes[]'],
        routeIndices: [1],
        version: '0.1.0',
        docs: DOCS_URL,
      },
    };
    const { emitted } = await runIntegration({
      existingConfig,
      i18n: { defaultLocale: 'de', locales: ['de', 'en', 'fr'] },
    });
    // Byte-identical preservation of non-managed keys
    expect(emitted.auth).toEqual(userAuth);
    expect(emitted.globalHeaders).toEqual(userGlobalHeaders);
    expect(emitted.navigationFallback).toEqual(userNavigationFallback);
    // Non-404 responseOverride preserved
    expect(emitted.responseOverrides?.['500']).toEqual({
      rewrite: '/500.html',
      statusCode: 500,
    });
    // Managed 404 refreshed
    expect(emitted.responseOverrides?.['404']).toEqual(MANAGED_404);
    // Old managed /en/* dropped; user /api/* preserved; new /en/* + /fr/* appended
    expect(emitted.routes).toHaveLength(3);
    expect(emitted.routes?.[0]).toEqual({
      route: '/api/*',
      allowedRoles: ['authenticated'],
    });
    expect(emitted.routes?.[1]).toEqual({
      route: '/en/*',
      rewrite: '/en/404/index.html',
      statusCode: 404,
    });
    expect(emitted.routes?.[2]).toEqual({
      route: '/fr/*',
      rewrite: '/fr/404/index.html',
      statusCode: 404,
    });
    expect(emitted.$easyWebManaged?.routeIndices).toEqual([1, 2]);
    expect(emitted.$easyWebManaged?.keys).toEqual([
      'responseOverrides.404',
      'routes[]',
    ]);
  });

  it('case 4: user 404 override, no sentinel → warns, user override wins, keys omits responseOverrides.404', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const userOverride = { rewrite: '/custom-404.html', statusCode: 404 };
    const { emitted } = await runIntegration({
      existingConfig: { responseOverrides: { '404': userOverride } },
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });
    const warnMessages = warnSpy.mock.calls.map((c) => c.join(' '));
    expect(
      warnMessages.some((m) => m.includes('user override wins')),
    ).toBe(true);
    expect(emitted.responseOverrides?.['404']).toEqual(userOverride);
    expect(emitted.$easyWebManaged?.keys).not.toContain(
      'responseOverrides.404',
    );
    expect(emitted.$easyWebManaged?.keys).toContain('routes[]');
  });

  it('case 5: no i18n config → single-locale mode, no route entries, console.info', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { emitted } = await runIntegration({});
    const infoMessages = infoSpy.mock.calls.map((c) => c.join(' '));
    expect(
      infoMessages.some((m) => m.includes('single-locale mode')),
    ).toBe(true);
    expect(emitted.responseOverrides?.['404']).toEqual(MANAGED_404);
    expect(emitted.routes).toEqual([]);
    expect(emitted.$easyWebManaged?.routeIndices).toEqual([]);
    expect(emitted.$easyWebManaged?.keys).toContain('responseOverrides.404');
  });

  it('case 6: output encoding — 2-space indent + trailing newline (byte-match fixture)', async () => {
    const { emittedRaw } = await runIntegration({
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });
    const expected =
      '{\n' +
      '  "responseOverrides": {\n' +
      '    "404": {\n' +
      '      "rewrite": "/404.html",\n' +
      '      "statusCode": 404\n' +
      '    }\n' +
      '  },\n' +
      '  "routes": [\n' +
      '    {\n' +
      '      "route": "/en/*",\n' +
      '      "rewrite": "/en/404/index.html",\n' +
      '      "statusCode": 404\n' +
      '    }\n' +
      '  ],\n' +
      '  "$easyWebManaged": {\n' +
      '    "keys": [\n' +
      '      "responseOverrides.404",\n' +
      '      "routes[]"\n' +
      '    ],\n' +
      '    "routeIndices": [\n' +
      '      0\n' +
      '    ],\n' +
      '    "version": "0.1.0",\n' +
      `    "docs": "${DOCS_URL}"\n` +
      '  }\n' +
      '}\n';
    expect(emittedRaw).toBe(expected);
    expect(emittedRaw.endsWith('\n')).toBe(true);
    expect(emittedRaw.endsWith('\n\n')).toBe(false);
    expect(emittedRaw).toMatch(/^\{\n {2}"/);
  });

  it('case 7: route conflict (/en/* exists) → warn + skip duplicate', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const userRoute = {
      route: '/en/*',
      rewrite: '/legacy-en/404.html',
      statusCode: 404,
    };
    const { emitted } = await runIntegration({
      existingConfig: { routes: [userRoute] },
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });
    const warnMessages = warnSpy.mock.calls.map((c) => c.join(' '));
    expect(
      warnMessages.some(
        (m) => m.includes('/en/*') && m.includes('will not append duplicate'),
      ),
    ).toBe(true);
    // Only one /en/* route: the user's — unchanged
    const enRoutes = (emitted.routes ?? []).filter(
      (r) =>
        typeof r === 'object' &&
        r !== null &&
        (r as { route?: unknown }).route === '/en/*',
    );
    expect(enRoutes).toHaveLength(1);
    expect(enRoutes[0]).toEqual(userRoute);
    // All managed routes were skipped → routes[] NOT in managedKeys; indices empty
    expect(emitted.$easyWebManaged?.routeIndices).toEqual([]);
    expect(emitted.$easyWebManaged?.keys).not.toContain('routes[]');
    // responseOverrides.404 was still managed (user hadn't defined one)
    expect(emitted.$easyWebManaged?.keys).toContain('responseOverrides.404');
  });

  it('case 8 (bonus): locale-list-swap → old managed routes replaced on rebuild', async () => {
    // Build 1: default=de, locales=[de,en] → managed /en/*
    const build1 = await runIntegration({
      i18n: { defaultLocale: 'de', locales: ['de', 'en'] },
    });
    expect(build1.emitted.routes).toEqual([
      { route: '/en/*', rewrite: '/en/404/index.html', statusCode: 404 },
    ]);
    // Build 2: swap default to en → managed /de/* (old /en/* dropped via sentinel indices)
    const build2 = await runIntegration({
      existingConfig: build1.emitted,
      i18n: { defaultLocale: 'en', locales: ['de', 'en'] },
    });
    expect(build2.emitted.routes).toEqual([
      { route: '/de/*', rewrite: '/de/404/index.html', statusCode: 404 },
    ]);
    expect(build2.emitted.$easyWebManaged?.routeIndices).toEqual([0]);
    expect(build2.emitted.$easyWebManaged?.keys).toEqual([
      'responseOverrides.404',
      'routes[]',
    ]);
  });
});
