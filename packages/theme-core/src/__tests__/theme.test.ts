import { describe, expect, it } from "vitest";
import { tokens } from "../index.js";

describe("tokens", () => {
	it("exports color tokens", () => {
		expect(tokens.color.surface).toBe("var(--ew-surface)");
	});
	it("exports spacing tokens", () => {
		expect(tokens.space[4]).toBe("var(--ew-space-4)");
	});
});
