# Content definitions

`field` builders preserve literal names and parsed value types in a frozen
`FieldDef<Name, Data, Kind>`. The optional unique-symbol member is type-only;
no value or parsing code is attached to it. `InferData<typeof definition>` maps
the original builder tuple, omits `body`, makes undefined-valued fields optional,
and distributes common fields across variant branches. Parsed arrays are mutable
to match the core contracts; definitions and inferred property bindings are readonly.

## Generator-facing metadata

- `decap` contains only documented widget properties. Schema-only information
  (`kind`, `alt`, `fields`, `itemField`, `locales`, folder options) lives alongside it.
- `fields` contains nested builders for objects, lists, locale objects and
  navigation. For `images`, it contains the **extra** item fields only; `src` and
  required `alt` are implicit and cannot be redefined.
- `list(..., { field })` uses Decap's scalar-list form. It is needed by the
  `Article.tags: string[]` contract; `{ fields }` remains the object-list form.
- `perLocale` renames each callback result to its locale key. It also accepts
  `required: false` for optional localized containers such as `skipLabel`.
- `images` accepts field-level `mediaFolder`/`publicFolder` just like `image`.
- Definitions resolve image public folders recursively without mutating the
  input builders. `publicFolder` on the resolved image builder is the effective
  folder; its nested image widget receives `public_folder` too. A field override
  wins over the definition fallback. There is deliberately no global fallback.
- `defineContentType.fields` remains the user's ordered tuple.
  `generatedFields` holds multi-locale `locale`/`translationKey` and optional
  `publishDate`. It is separate so later form/schema generators can order body
  last and expand one form per locale without losing inference.
- `variants.options[value].fields` contains only that branch's added fields;
  `collectionName` is resolved to the explicit name or `<definition>_<value>`.
  The discriminator is metadata, not a conditional widget. Validate and combine
  common fields, generated fields, branch fields and discriminator when consuming.
- An explicit identifier must exist among common fields. Otherwise `title` wins,
  then `name`; singletons require neither.

Locale inference is exact for literal tuples (the normal inline call needs no
`as const` because builders use const generics). Runtime-sized locale arrays
cannot prove a multi-locale contract statically; prefer literal tuples.

`tsconfig.tests.json` typechecks the Vitest inference assertions excluded by the
package's normal tsconfig. `type-tests.ts` is also checked by the normal package
typecheck and contains the negative conformance assertions. Its function is
neither exported nor called. No schema generation or config assembly lives here.
