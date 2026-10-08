import { describe, expect, it } from "vitest";
import { tokens } from "../index.js";

describe("index re-exports", () => {
	it("re-exports tokens.color.surface", () => {
		expect(tokens.color.surface).toBe("var(--ew-surface)");
	});
	it("re-exports tokens.space[4]", () => {
		expect(tokens.space[4]).toBe("var(--ew-space-4)");
	});
	it("re-exports tokens.radius.md", () => {
		expect(tokens.radius.md).toBe("var(--ew-radius-md)");
	});
});
