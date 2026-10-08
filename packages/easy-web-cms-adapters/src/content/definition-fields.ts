import { DefinitionError } from './types.js';
import type { DecapField, FieldDef, DefinitionOptions } from './types.js';

function resolveDecap(decap: DecapField, publicFolder: string): DecapField {
    return { ...decap,
        ...(decap.widget === 'image' ? { public_folder: decap.public_folder ?? publicFolder } : {}),
        ...(decap.fields ? { fields: decap.fields.map(child => resolveDecap(child, publicFolder)) } : {}),
        ...(decap.field ? { field: resolveDecap(decap.field, publicFolder) } : {}) };
}

export function resolveFields(definition: DefinitionOptions, fields: readonly FieldDef[], parent = ''): readonly FieldDef[] {
    const names = new Set<string>();
    return fields.map(entry => {
        const path = `${parent}${entry.name}`;
        const fail = (issue: string): never => { throw new DefinitionError(definition.name, path, issue); };
        if (names.has(entry.name)) fail('duplicate field name');
        names.add(entry.name);
        if (entry.name === 'body' && entry.kind !== 'body') fail('body must use field.body');
        if (entry.alt && typeof entry.alt === 'object') {
            const from = entry.alt.from;
            if (!fields.some(sibling => sibling.name === from && sibling.kind === 'string')) {
                fail(`alt.from ${from} must name a string sibling`);
            }
        }
        const publicFolder = entry.publicFolder ?? definition.publicFolder;
        if ((entry.kind === 'image' || entry.kind === 'images') && !publicFolder) fail('image requires publicFolder');
        if (entry.kind === 'images' && entry.fields?.some(child => child.name === 'src' || child.name === 'alt')) {
            fail('duplicate src or alt field');
        }
        const children = entry.fields ? resolveFields(definition, entry.fields, `${path}.`) : undefined;
        const itemField = entry.itemField ? resolveFields(definition, [entry.itemField], `${path}.`)[0] : undefined;
        const decap = publicFolder ? resolveDecap(entry.decap, publicFolder) : entry.decap;
        return Object.freeze({ ...entry, ...(children ? { fields: children } : {}), ...(itemField ? { itemField } : {}),
            ...(publicFolder && (entry.kind === 'image' || entry.kind === 'images') ? { publicFolder } : {}), decap });
    });
}
