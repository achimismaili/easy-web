import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.turbo/**"],
  },
  {
    rules: {
      // A leading underscore marks a binding as deliberately unused: phantom
      // type parameters, compile-only assertions, and rest-sibling omission.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
];
