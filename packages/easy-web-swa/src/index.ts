import type { AstroIntegration } from 'astro';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Options for {@link easyWebNotFound}.
 *
 * These override values derived from `config.i18n`. Pass them when the site
 * has no Astro i18n config, or when the integration must diverge from it
 * (e.g. partial locale rollout).
 */
export type Options = {
  /**
   * Default locale — the locale served at the root path (`/`). Its 404 page
   * is emitted only as `responseOverrides.404 → /404.html`; no per-locale
   * `routes[]` entry is written for it.
   *
   * Fallback order: `options.defaultLocale` → `config.i18n.defaultLocale` → `'de'`.
   */
  defaultLocale?: string;
  /**
   * Full locale list. Every locale that is NOT `defaultLocale` gets a
   * `routes[]` entry rewriting `/{locale}/*` → `/{locale}/404/index.html`.
   *
   * Fallback order: `options.locales` → `config.i18n.locales` → `[defaultLocale]`.
   */
  locales?: string[];
};

const SENTINEL_VERSION = '0.1.0';
const SENTINEL_DOCS =
  'https://github.com/achimismaili/websites/blob/main/docs/decisions/0013-shared-not-found-primitives.md';
const KEY_RESPONSE_OVERRIDES_404 = 'responseOverrides.404';
const KEY_ROUTES = 'routes[]';

type ManagedRoute = { route: string; rewrite: string; statusCode: 404 };
type ResponseOverride404 = { rewrite: string; statusCode: 404 };

type ManagedSentinel = {
  keys: string[];
  routeIndices: number[];
  version: string;
  docs: string;
};

type SwaConfig = {
  responseOverrides?: Record<string, unknown>;
  routes?: unknown[];
  $easyWebManaged?: ManagedSentinel;
  [key: string]: unknown;
};

/**
 * AstroIntegration that merges a sentinel-marked slice into an instance's
 * `staticwebapp.config.json` so shared 404 handling works consistently on
 * Azure Static Web Apps.
 *
 * The integration owns only the top-level keys listed in
 * `$easyWebManaged.keys` and the specific `routes[]` entries listed in
 * `$easyWebManaged.routeIndices`. Everything else (`auth`, `globalHeaders`,
 * `navigationFallback`, user-authored routes) is preserved verbatim across
 * builds — see ADR 0013 (shared-not-found-primitives) for the full contract.
 *
 * Emitted per build:
 * - `responseOverrides.404 = { rewrite: '/404.html', statusCode: 404 }`
 * - one `routes[]` entry per non-default locale:
 *   `{ route: '/{locale}/*', rewrite: '/{locale}/404/index.html', statusCode: 404 }`
 */
export function easyWebNotFound(options: Options = {}): AstroIntegration {
  let defaultLocale = options.defaultLocale ?? 'de';
  let locales: string[] = options.locales ?? [defaultLocale];

  return {
    name: '@achimismaili/easy-web-swa',
    hooks: {
      'astro:config:setup': ({ config }) => {
        if (config.i18n) {
          defaultLocale = options.defaultLocale ?? config.i18n.defaultLocale;
          const configLocales = config.i18n.locales.map((locale) =>
            typeof locale === 'string' ? locale : locale.path,
          );
          locales = options.locales ?? configLocales;
        } else {
          console.info(
            '[easy-web-swa] no i18n config found — single-locale mode, emitting only root 404 slice',
          );
        }

        const output = config.output as string;
        if (output === 'server' || output === 'hybrid') {
          console.warn(
            '[easy-web-swa] non-static output detected; integration will write staticwebapp.config.json directly to dist/ instead of relying on public/ passthrough',
          );
        }
      },
      'astro:build:done': ({ dir }) => {
        const distDir = fileURLToPath(dir);
        const configPath = path.join(distDir, 'staticwebapp.config.json');

        const nonDefaultLocales = locales.filter((locale) => locale !== defaultLocale);
        const managedRoutes: ManagedRoute[] = nonDefaultLocales.map((locale) => ({
          route: `/${locale}/*`,
          rewrite: `/${locale}/404/index.html`,
          statusCode: 404,
        }));
        const managedResponseOverride: ResponseOverride404 = {
          rewrite: '/404.html',
          statusCode: 404,
        };

        const existing = readExisting(configPath);
        const merged = mergeConfig(existing, managedResponseOverride, managedRoutes);

        fs.writeFileSync(
          configPath,
          JSON.stringify(merged, null, 2) + '\n',
          'utf-8',
        );
      },
    },
  };
}

export default easyWebNotFound;

function readExisting(configPath: string): SwaConfig | null {
  if (!fs.existsSync(configPath)) return null;
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as SwaConfig;
}

function mergeConfig(
  existing: SwaConfig | null,
  managedResponseOverride: ResponseOverride404,
  managedRoutes: ManagedRoute[],
): SwaConfig {
  if (existing === null) {
    return createFresh(managedResponseOverride, managedRoutes);
  }
  if (existing.$easyWebManaged) {
    return replaceManaged(existing, managedResponseOverride, managedRoutes);
  }
  return additive(existing, managedResponseOverride, managedRoutes);
}

function createFresh(
  managedResponseOverride: ResponseOverride404,
  managedRoutes: ManagedRoute[],
): SwaConfig {
  const routeIndices = managedRoutes.map((_route, idx) => idx);
  return {
    responseOverrides: { '404': managedResponseOverride },
    routes: [...managedRoutes],
    $easyWebManaged: makeSentinel(
      [KEY_RESPONSE_OVERRIDES_404, KEY_ROUTES],
      routeIndices,
    ),
  };
}

function replaceManaged(
  existing: SwaConfig,
  managedResponseOverride: ResponseOverride404,
  managedRoutes: ManagedRoute[],
): SwaConfig {
  const oldSentinel = existing.$easyWebManaged;
  const oldIndices = new Set(oldSentinel ? oldSentinel.routeIndices : []);

  const oldRoutes = Array.isArray(existing.routes) ? existing.routes : [];
  const remainingRoutes = oldRoutes.filter((_route, idx) => !oldIndices.has(idx));
  const newRoutes = [...remainingRoutes, ...managedRoutes];
  const newRouteIndices: number[] = [];
  for (let i = remainingRoutes.length; i < newRoutes.length; i++) {
    newRouteIndices.push(i);
  }

  const newResponseOverrides: Record<string, unknown> = {
    ...(existing.responseOverrides ?? {}),
    '404': managedResponseOverride,
  };

  return {
    ...existing,
    responseOverrides: newResponseOverrides,
    routes: newRoutes,
    $easyWebManaged: makeSentinel(
      [KEY_RESPONSE_OVERRIDES_404, KEY_ROUTES],
      newRouteIndices,
    ),
  };
}

function additive(
  existing: SwaConfig,
  managedResponseOverride: ResponseOverride404,
  managedRoutes: ManagedRoute[],
): SwaConfig {
  const managedKeys: string[] = [];
  const existingRoutes: unknown[] = Array.isArray(existing.routes)
    ? [...existing.routes]
    : [];
  const newRouteIndices: number[] = [];

  for (const managedRoute of managedRoutes) {
    const duplicate = existingRoutes.some(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        (entry as { route?: unknown }).route === managedRoute.route,
    );
    if (duplicate) {
      console.warn(
        `[easy-web-swa] route pattern "${managedRoute.route}" already defined in staticwebapp.config.json; user route wins; integration will not append duplicate`,
      );
      continue;
    }
    const newIndex = existingRoutes.length;
    existingRoutes.push(managedRoute);
    newRouteIndices.push(newIndex);
  }
  if (newRouteIndices.length > 0) {
    managedKeys.push(KEY_ROUTES);
  }

  const newResponseOverrides: Record<string, unknown> = {
    ...((existing.responseOverrides ?? {}) as Record<string, unknown>),
  };
  const userHas404 = '404' in newResponseOverrides;
  if (userHas404) {
    console.warn(
      '[easy-web-swa] user has defined responseOverrides.404; user override wins; integration will not manage it',
    );
  } else {
    newResponseOverrides['404'] = managedResponseOverride;
    managedKeys.push(KEY_RESPONSE_OVERRIDES_404);
  }

  return {
    ...existing,
    responseOverrides: newResponseOverrides,
    routes: existingRoutes,
    $easyWebManaged: makeSentinel(managedKeys, newRouteIndices),
  };
}

function makeSentinel(keys: string[], routeIndices: number[]): ManagedSentinel {
  return {
    keys,
    routeIndices,
    version: SENTINEL_VERSION,
    docs: SENTINEL_DOCS,
  };
}
