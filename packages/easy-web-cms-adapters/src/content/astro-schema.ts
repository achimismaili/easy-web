import { z } from 'astro/zod';
import type { InferData } from './infer.js';
import { DefinitionError } from './types.js';
import type { ContentTypeDef, FieldDef, SingletonDef, VariantOption } from './types.js';

type Definition = ContentTypeDef | SingletonDef;
type SchemaContext = { readonly image: () => z.ZodTypeAny };
type SchemaShape = Record<string, z.ZodTypeAny>;

function cleared(value: unknown): unknown {
    return value === '' || value === null ? undefined : value;
}

function optional(schema: z.ZodTypeAny): z.ZodTypeAny {
    return z.preprocess(cleared, schema.optional());
}

function textSchema(field: FieldDef): z.ZodTypeAny {
    let schema = z.string();
    if (field.required) schema = schema.min(1);
    const pattern = field.decap.pattern;
    if (pattern) schema = schema.regex(new RegExp(pattern[0]), pattern[1]);
    return field.required ? schema : optional(schema);
}

function imageSource(field: FieldDef, context: SchemaContext): z.ZodTypeAny {
    return field.publicFolder?.startsWith('/src/') ? context.image() : z.string().min(1);
}

function descriptiveImage(field: FieldDef, context: SchemaContext): z.ZodTypeAny {
    const image = z.object({
        src: imageSource(field, context),
        alt: z.string().min(1).regex(/\S/, 'Darf nicht nur aus Leerzeichen bestehen.'),
        caption: optional(z.string()),
    });
    if (field.required) return image;
    return z.preprocess(cleared, z.array(image).max(1).optional().transform(entries => entries?.[0]));
}

function arrayBounds(schema: z.ZodArray, field: FieldDef): z.ZodArray {
    let bounded = schema;
    if (field.decap.min !== undefined) bounded = bounded.min(field.decap.min);
    if (field.decap.max !== undefined) bounded = bounded.max(field.decap.max);
    return bounded;
}

function objectSchema(fields: readonly FieldDef[], context: SchemaContext): z.ZodTypeAny {
    return z.object(shapeFor(fields, context)).transform(data => deriveImages(data, fields));
}

function listSchema(field: FieldDef, context: SchemaContext): z.ZodTypeAny {
    const item = field.itemField ? fieldSchema(field.itemField, context) : objectSchema(field.fields ?? [], context);
    const schema = arrayBounds(z.array(item), field);
    return field.required ? schema : optional(schema);
}

function gallerySchema(field: FieldDef, context: SchemaContext): z.ZodTypeAny {
    const item = z.object({
        src: imageSource(field, context),
        alt: z.string().min(1).regex(/\S/, 'Darf nicht nur aus Leerzeichen bestehen.'),
        ...shapeFor(field.fields ?? [], context),
    }).transform(data => deriveImages(data, field.fields ?? []));
    const schema = arrayBounds(z.array(item), field);
    return z.preprocess(value => cleared(value) ?? [], schema);
}

function fieldSchema(field: FieldDef, context: SchemaContext): z.ZodTypeAny {
    switch (field.kind) {
        case 'string':
        case 'text':
        case 'hidden':
            return textSchema(field);
        case 'color': {
            const schema = z.string().min(1).regex(/^#[0-9a-fA-F]{6}$/);
            return field.required ? schema : optional(schema);
        }
        case 'number': {
            let schema = z.number();
            if (field.decap.value_type === 'int') schema = schema.int();
            if (field.decap.min !== undefined) schema = schema.min(field.decap.min);
            if (field.decap.max !== undefined) schema = schema.max(field.decap.max);
            const defaulted = typeof field.decap.default === 'number' ? schema.default(field.decap.default) : schema;
            return field.required ? defaulted : optional(defaulted);
        }
        case 'boolean':
            return z.preprocess(cleared, z.boolean().default(field.decap.default === true));
        case 'date': {
            const schema = z.coerce.date();
            return field.required ? schema : optional(schema);
        }
        case 'select': {
            const values = (field.decap.options ?? []).map(option => typeof option === 'string' ? option : option.value);
            const schema = z.enum(values);
            return field.required ? schema : optional(schema);
        }
        case 'image': {
            if (field.alt === 'required') return descriptiveImage(field, context);
            const schema = imageSource(field, context).transform(src => field.alt === 'decorative'
                ? { src, decorative: true as const } : src);
            return field.required ? schema : optional(schema);
        }
        case 'images':
            return gallerySchema(field, context);
        case 'list':
        case 'navItems':
            return listSchema(field, context);
        case 'object':
        case 'perLocale': {
            const schema = objectSchema(field.fields ?? [], context);
            return field.required ? schema : optional(schema);
        }
        case 'body':
            return z.never();
    }
}

function shapeFor(fields: readonly FieldDef[], context: SchemaContext): SchemaShape {
    return Object.fromEntries(fields.filter(field => field.kind !== 'body').map(field => [field.name, fieldSchema(field, context)]));
}

function deriveImages(data: Record<string, unknown>, fields: readonly FieldDef[]): Record<string, unknown> {
    return Object.fromEntries(Object.entries(data).map(([name, value]) => {
        const field = fields.find(candidate => candidate.name === name);
        if (field?.kind !== 'image' || !field.alt || typeof field.alt !== 'object' || value === undefined) return [name, value];
        return [name, { src: value, alt: data[field.alt.from] }];
    }));
}

function definitionFields(definition: Definition): readonly FieldDef[] {
    return definition.kind === 'contentType' ? [...definition.fields, ...definition.generatedFields] : definition.fields;
}

function definitionSchema(definition: Definition, context: SchemaContext): z.ZodTypeAny {
    const fields = definitionFields(definition);
    const shape = shapeFor(fields, context);
    if (definition.kind === 'contentType' && definition.locales && definition.locales.length > 1) {
        shape.locale = z.enum(definition.locales);
        shape.translationKey = z.string().min(1).regex(/\S/, 'Darf nicht nur aus Leerzeichen bestehen.');
    }
    if (definition.kind !== 'contentType' || !definition.variants) return z.object(shape).transform(data => deriveImages(data, fields));
    const { discriminator, options } = definition.variants;
    const entries = Object.entries(options);
    const first = entries[0];
    if (!first) throw new DefinitionError(definition.name, discriminator, 'empty variant options');
    const branch = ([value, option]: [string, VariantOption]) => z.object({ ...shape,
        ...shapeFor(option.fields, context), [discriminator]: z.literal(value) });
    const branches: [ReturnType<typeof branch>, ...ReturnType<typeof branch>[]] = [branch(first), ...entries.slice(1).map(branch)];
    return z.discriminatedUnion(discriminator, branches).transform(data => {
        const option = options[String(data[discriminator])];
        return deriveImages(data, option ? [...fields, ...option.fields] : fields);
    });
}

export function toAstroSchema<const Def extends Definition>(definition: Def): (context: SchemaContext) => z.ZodType<InferData<Def>>;
export function toAstroSchema(definition: Definition) {
    return (context: SchemaContext) => definitionSchema(definition, context);
}
