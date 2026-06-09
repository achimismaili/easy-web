import { describe, expect, it } from "vitest";
import { DEFAULT_SCOPES, LOGIN_SCOPES } from "../scopes";

describe("DEFAULT_SCOPES", () => {
  it("contains User.Read", () => {
    expect(DEFAULT_SCOPES).toContain("User.Read");
  });

  it("contains Sites.Read.All", () => {
    expect(DEFAULT_SCOPES).toContain("Sites.Read.All");
  });

  it("contains Files.Read.All", () => {
    expect(DEFAULT_SCOPES).toContain("Files.Read.All");
  });

  it("has exactly 3 scopes", () => {
    expect(DEFAULT_SCOPES).toHaveLength(3);
  });
});

describe("LOGIN_SCOPES", () => {
  it("contains openid", () => {
    expect(LOGIN_SCOPES).toContain("openid");
  });

  it("contains profile", () => {
    expect(LOGIN_SCOPES).toContain("profile");
  });

  it("contains User.Read", () => {
    expect(LOGIN_SCOPES).toContain("User.Read");
  });
});
