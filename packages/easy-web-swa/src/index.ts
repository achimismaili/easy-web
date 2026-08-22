import type { AstroIntegration } from 'astro';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Options retained for compatibility with the 0.1.x API.
 *
 * Azure Static Web Apps supports one global 404 response override, so locale
 * settings no longer affect the emitted configuration.
 */
export type Options = {
  readonly defaultLocale?: string;
  readonly locales?: readonly string[];
};

const SENTINEL_VERSION = '0.2.0';
const SENTINEL_DOCS =
  'https://github.com/achimismaili/websites/blob/main/docs/decisions/0013-shared-not-found-primitives.md';
const KEY_RESPONSE_OVERRIDES_404 = 'responseOverrides.404';
const SIDECAR_SUFFIX = '.easy-web-managed.json';
const SCHEMA_LEGAL_ROOT_KEYS = new Set([
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
]);

type JsonObject = Record<string, unknown>;

type ManagedSentinel = {
  readonly keys: readonly string[];
  readonly version: string;
  readonly docs: string;
};

const MANAGED_RESPONSE_OVERRIDE = {
  rewrite: '/404.html',
  statusCode: 404,
} as const;

/**
 * Astro integration that adds shared Azure Static Web Apps 404 handling.
 *
 * The main config contains only schema-legal keys. Ownership metadata lives in
 * a sibling sidecar, and the integration updates `responseOverrides.404` only
 * when that sidecar says the key is managed. User routes and every other SWA
 * setting are preserved; no locale-wide rewrite routes are emitted.
 */
export function easyWebNotFound(_options: Options = {}): AstroIntegration {
  return {
    name: '@achimismaili/easy-web-swa',
    hooks: {
      'astro:config:setup': ({ config }) => {
        if (!config.i18n) {
          console.info(
            '[easy-web-swa] no i18n config found — single-locale mode, emitting the global 404 override',
          );
        }

        if (config.output === 'server') {
          console.warn(
            '[easy-web-swa] non-static output detected; integration will write staticwebapp.config.json directly to dist/ instead of relying on public/ passthrough',
          );
        }
      },
      'astro:build:done': ({ dir }) => {
        const distDir = fileURLToPath(dir);
        const configPath = path.join(distDir, 'staticwebapp.config.json');
        const sidecarPath = `${configPath}${SIDECAR_SUFFIX}`;
        const existing = readConfig(configPath);
        const previousSentinel = readSidecar(sidecarPath);
        const { config, sentinel } = mergeConfig(
          existing,
          previousSentinel,
          configPath,
        );

        writeJson(configPath, config);
        writeJson(sidecarPath, sentinel);
      },
    },
  };
}

export default easyWebNotFound;

function readConfig(configPath: string): JsonObject | null {
  if (!fs.existsSync(configPath)) return null;
  return parseObjectFile(configPath);
}

function readSidecar(sidecarPath: string): ManagedSentinel | null {
  if (!fs.existsSync(sidecarPath)) return null;
  const value = parseObjectFile(sidecarPath);
  const keys = value['keys'];
  const version = value['version'];
  const docs = value['docs'];

  if (
    !Array.isArray(keys) ||
    !keys.every((key) => typeof key === 'string') ||
    typeof version !== 'string' ||
    typeof docs !== 'string'
  ) {
    throw new TypeError(
      `[easy-web-swa] invalid managed metadata in ${sidecarPath}`,
    );
  }

  return { keys, version, docs };
}

function parseObjectFile(filePath: string): JsonObject {
  const raw = fs.readFileSync(filePath, 'utf-8');
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new SyntaxError(
        `[easy-web-swa] failed to parse JSON in ${filePath}: ${error.message}`,
      );
    }
    throw error;
  }

  if (!isJsonObject(value)) {
    throw new TypeError(`[easy-web-swa] expected a JSON object in ${filePath}`);
  }
  return value;
}

function mergeConfig(
  existing: JsonObject | null,
  previousSentinel: ManagedSentinel | null,
  configPath: string,
): { readonly config: JsonObject; readonly sentinel: ManagedSentinel } {
  const config = schemaLegalConfig(existing);
  const responseOverrides = readResponseOverrides(config, configPath);
  const integrationOwns404 =
    previousSentinel?.keys.includes(KEY_RESPONSE_OVERRIDES_404) ?? false;
  const userOwns404 = '404' in responseOverrides && !integrationOwns404;

  if (userOwns404) {
    console.warn(
      '[easy-web-swa] user has defined responseOverrides.404; user override wins; integration will not manage it',
    );
    return { config, sentinel: makeSentinel([]) };
  }

  return {
    config: {
      ...config,
      responseOverrides: {
        ...responseOverrides,
        '404': MANAGED_RESPONSE_OVERRIDE,
      },
    },
    sentinel: makeSentinel([KEY_RESPONSE_OVERRIDES_404]),
  };
}

function schemaLegalConfig(existing: JsonObject | null): JsonObject {
  if (existing === null) return {};

  const config: JsonObject = {};
  for (const [key, value] of Object.entries(existing)) {
    if (SCHEMA_LEGAL_ROOT_KEYS.has(key)) {
      config[key] = value;
    } else {
      console.warn(
        `[easy-web-swa] omitting non-schema-legal root key "${key}" from staticwebapp.config.json`,
      );
    }
  }
  return config;
}

function readResponseOverrides(
  config: JsonObject,
  configPath: string,
): JsonObject {
  const value = config['responseOverrides'];
  if (value === undefined) return {};
  if (!isJsonObject(value)) {
    throw new TypeError(
      `[easy-web-swa] expected responseOverrides to be an object in ${configPath}`,
    );
  }
  return value;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function makeSentinel(keys: readonly string[]): ManagedSentinel {
  return {
    keys,
    version: SENTINEL_VERSION,
    docs: SENTINEL_DOCS,
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}
