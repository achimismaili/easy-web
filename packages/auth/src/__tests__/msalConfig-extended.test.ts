import { describe, expect, it } from 'vitest';
import { LogLevel } from '@azure/msal-browser';
import { buildMsalConfig } from '../msalConfig';

describe('buildMsalConfig – postLogoutRedirectUri', () => {
  it('postLogoutRedirectUri matches explicit redirectUri', () => {
    const config = buildMsalConfig({
      clientId: 'cid',
      tenantId: 'tid',
      redirectUri: 'https://example.com/auth',
    });
    expect(config.auth.postLogoutRedirectUri).toBe('https://example.com/auth');
  });

  it('postLogoutRedirectUri equals redirectUri when both fall back to window.location.origin', () => {
    const config = buildMsalConfig({ clientId: 'cid', tenantId: 'tid' });
    expect(config.auth.postLogoutRedirectUri).toBe(config.auth.redirectUri);
  });
});

describe('buildMsalConfig – redirectUri fallback', () => {
  it('defaults redirectUri to window.location.origin when not provided', () => {
    const config = buildMsalConfig({ clientId: 'cid', tenantId: 'tid' });
    expect(config.auth.redirectUri).toBe(window.location.origin);
  });

  it('explicit redirectUri takes precedence over window.location.origin', () => {
    const config = buildMsalConfig({
      clientId: 'cid',
      tenantId: 'tid',
      redirectUri: 'https://app.example.com/callback',
    });
    expect(config.auth.redirectUri).toBe('https://app.example.com/callback');
  });
});

describe('buildMsalConfig – system logger options', () => {
  it('piiLoggingEnabled is false', () => {
    const config = buildMsalConfig({ clientId: 'cid', tenantId: 'tid' });
    expect(config.system?.loggerOptions?.piiLoggingEnabled).toBe(false);
  });

  it('logLevel is Warning', () => {
    const config = buildMsalConfig({ clientId: 'cid', tenantId: 'tid' });
    expect(config.system?.loggerOptions?.logLevel).toBe(LogLevel.Warning);
  });

  it('loggerCallback is a function', () => {
    const config = buildMsalConfig({ clientId: 'cid', tenantId: 'tid' });
    expect(typeof config.system?.loggerOptions?.loggerCallback).toBe('function');
  });
});

describe('buildMsalConfig – authority URL construction', () => {
  it('uses the tenantId in authority path', () => {
    const config = buildMsalConfig({ clientId: 'any', tenantId: 'my-org-tenant' });
    expect(config.auth.authority).toContain('my-org-tenant');
  });

  it('authority always starts with https://login.microsoftonline.com', () => {
    const config = buildMsalConfig({ clientId: 'any', tenantId: 'tid' });
    expect(config.auth.authority).toMatch(/^https:\/\/login\.microsoftonline\.com\//);
  });
});
