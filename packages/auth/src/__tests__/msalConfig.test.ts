import { describe, expect, it } from "vitest";
import { BrowserCacheLocation } from "@azure/msal-browser";
import { buildMsalConfig } from "../msalConfig";

describe("buildMsalConfig", () => {
  const testConfig = {
    clientId: "test-client-id-1234",
    tenantId: "test-tenant-id-5678",
  };

  it("uses the provided clientId", () => {
    const config = buildMsalConfig(testConfig);
    expect(config.auth.clientId).toBe("test-client-id-1234");
  });

  it("builds authority URL from tenantId", () => {
    const config = buildMsalConfig(testConfig);
    expect(config.auth.authority).toBe(
      "https://login.microsoftonline.com/test-tenant-id-5678",
    );
  });

  it("sets navigateToLoginRequestUrl to true", () => {
    const config = buildMsalConfig(testConfig);
    expect(config.auth.navigateToLoginRequestUrl).toBe(true);
  });

  it("uses SessionStorage by default", () => {
    const config = buildMsalConfig(testConfig);
    expect(config.cache?.cacheLocation).toBe(
      BrowserCacheLocation.SessionStorage,
    );
  });

  it("accepts a custom redirectUri", () => {
    const config = buildMsalConfig({
      ...testConfig,
      redirectUri: "https://example.com/auth",
    });
    expect(config.auth.redirectUri).toBe("https://example.com/auth");
  });

  it("uses the provided clientId (not any hardcoded value)", () => {
    const customId = "my-custom-client-id";
    const config = buildMsalConfig({ clientId: customId, tenantId: "any-tenant" });
    expect(config.auth.clientId).toBe(customId);
    expect(config.auth.clientId).not.toBe("test-client-id-1234");
  });
});
