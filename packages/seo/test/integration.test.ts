import { describe, it, expect, vi, afterEach } from 'vitest';
import easyWebSeo from '../src/index.js';

type ConfigSetupHook = (params: {
  config: unknown;
  updateConfig: (patch: unknown) => void;
  injectRoute: (route: unknown) => void;
  logger: { error: (msg: string) => void; warn: (msg: string) => void; info: (msg: string) => void };
}) => void;

const getConfigSetupHook = (integration: ReturnType<typeof easyWebSeo>): ConfigSetupHook => {
  const hook = integration.hooks['astro:config:setup'];
  if (typeof hook !== 'function') {
    throw new Error('astro:config:setup hook missing on integration');
  }
  return hook as unknown as ConfigSetupHook;
};

describe('easyWebSeo integration factory', () => {
  afterEach(() => {
    delete process.env.EASY_WEB_SEO_NO_INDEX;
    vi.restoreAllMocks();
  });

  it('returns an AstroIntegration shape with name and astro:config:setup hook', () => {
    const integration = easyWebSeo();
    expect(integration.name).toBe('@achimismaili/easy-web-seo');
    expect(typeof integration.hooks['astro:config:setup']).toBe('function');
  });

  it('sets EASY_WEB_SEO_NO_INDEX=false by default and injects /robots.txt route', () => {
    const integration = easyWebSeo();
    const mockConfig = {
      site: new URL('https://example.com'),
      i18n: undefined,
      integrations: [],
    };
    const mockLogger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const mockInjectRoute = vi.fn();
    const mockUpdateConfig = vi.fn();

    getConfigSetupHook(integration)({
      config: mockConfig,
      updateConfig: mockUpdateConfig,
      injectRoute: mockInjectRoute,
      logger: mockLogger,
    });

    expect(process.env.EASY_WEB_SEO_NO_INDEX).toBe('false');
    expect(mockInjectRoute).toHaveBeenCalledOnce();
    expect(mockInjectRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: '/robots.txt',
        prerender: true,
      }),
    );
    expect(mockUpdateConfig).toHaveBeenCalledOnce();
  });

  it('sets EASY_WEB_SEO_NO_INDEX=true when noIndex option is true', () => {
    const integration = easyWebSeo({ noIndex: true });
    const mockConfig = {
      site: new URL('https://example.com'),
      i18n: undefined,
      integrations: [],
    };
    const mockLogger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };

    getConfigSetupHook(integration)({
      config: mockConfig,
      updateConfig: vi.fn(),
      injectRoute: vi.fn(),
      logger: mockLogger,
    });

    expect(process.env.EASY_WEB_SEO_NO_INDEX).toBe('true');
  });

  it('throws and logs an error when site is not configured', () => {
    const integration = easyWebSeo();
    const mockConfig = { site: undefined, i18n: undefined, integrations: [] };
    const mockLogger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const hook = getConfigSetupHook(integration);

    expect(() =>
      hook({
        config: mockConfig,
        updateConfig: vi.fn(),
        injectRoute: vi.fn(),
        logger: mockLogger,
      }),
    ).toThrow('@achimismaili/easy-web-seo');
    expect(mockLogger.error).toHaveBeenCalledOnce();
  });

  it('auto-generates uppercased BCP-47 locale map (id → id-ID.toUpperCase()) when i18n is set but sitemapLocales is not', () => {
    const integration = easyWebSeo();
    const mockConfig = {
      site: new URL('https://example.com'),
      i18n: { locales: ['de', 'en'], defaultLocale: 'de', routing: {} },
      integrations: [],
    };
    const mockLogger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const mockUpdateConfig = vi.fn();

    getConfigSetupHook(integration)({
      config: mockConfig,
      updateConfig: mockUpdateConfig,
      injectRoute: vi.fn(),
      logger: mockLogger,
    });

    expect(mockUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        integrations: expect.arrayContaining([
          expect.objectContaining({ name: '@astrojs/sitemap' }),
        ]),
      }),
    );
    expect(mockLogger.warn).toHaveBeenCalledOnce();
    const warning = mockLogger.warn.mock.calls[0][0] as string;
    expect(warning).toContain('de→de-DE');
    expect(warning).toContain('en→en-EN');
  });

  it('passes sitemapLocales verbatim (no warning) when caller provides an explicit locale map', () => {
    const customLocales = { de: 'de-DE', en: 'en-US' };
    const integration = easyWebSeo({ sitemapLocales: customLocales });
    const mockConfig = {
      site: new URL('https://example.com'),
      i18n: { locales: ['de', 'en'], defaultLocale: 'de', routing: {} },
      integrations: [],
    };
    const mockLogger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const mockUpdateConfig = vi.fn();

    getConfigSetupHook(integration)({
      config: mockConfig,
      updateConfig: mockUpdateConfig,
      injectRoute: vi.fn(),
      logger: mockLogger,
    });

    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        integrations: expect.arrayContaining([
          expect.objectContaining({ name: '@astrojs/sitemap' }),
        ]),
      }),
    );
  });

  it('handles Astro path-style locales (objects with .path) when auto-generating BCP-47 tags', () => {
    const integration = easyWebSeo();
    const mockConfig = {
      site: new URL('https://example.com'),
      i18n: {
        locales: [{ path: 'de', codes: ['de'] }, { path: 'en', codes: ['en'] }],
        defaultLocale: 'de',
        routing: {},
      },
      integrations: [],
    };
    const mockLogger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };

    getConfigSetupHook(integration)({
      config: mockConfig,
      updateConfig: vi.fn(),
      injectRoute: vi.fn(),
      logger: mockLogger,
    });

    expect(mockLogger.warn).toHaveBeenCalledOnce();
    const warning = mockLogger.warn.mock.calls[0][0] as string;
    expect(warning).toContain('de→de-DE');
    expect(warning).toContain('en→en-EN');
  });
});
