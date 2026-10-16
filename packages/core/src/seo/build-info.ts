import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'astro/zod';
import {
    BuildInfoError, buildInfoOptionsSchema, exactVersionSchema,
    type BuildInfoManifest, type BuildInfoPackageId,
} from './build-info-manifest.js';

const packageSchema = z.object({ name: z.string(), version: exactVersionSchema });

function installedPackage(id: BuildInfoPackageId, root: URL) {
    const name = `@easy-web/${id}`;
    let folder = fileURLToPath(root);
    let manifestPath = join(folder, 'node_modules', name, 'package.json');
    while (!existsSync(manifestPath)) {
        const parent = dirname(folder);
        if (parent === folder) throw new BuildInfoError(`${name} must be installed in the site before it can be enabled.`);
        folder = parent;
        manifestPath = join(folder, 'node_modules', name, 'package.json');
    }
    const result = packageSchema.safeParse(JSON.parse(readFileSync(manifestPath, 'utf8')));
    if (!result.success || result.data.name !== name) throw new BuildInfoError(`${name} artifact must contain its package identity and an exact version.`);
    return result.data;
}

export function buildInfoManifest(input: unknown, root: URL): BuildInfoManifest {
    const parsed = buildInfoOptionsSchema.safeParse(input);
    if (!parsed.success) throw new BuildInfoError(`options are invalid: ${parsed.error.message}`);
    const options = parsed.data;
    const core = packageSchema.parse(JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')));
    if (core.name !== '@easy-web/core') throw new BuildInfoError('core artifact identity is invalid.');
    const packages = Object.freeze([...new Set<BuildInfoPackageId>(['core', ...(options.packages ?? [])])].sort());
    for (const id of packages) {
        if (id === 'core') continue;
        const installed = installedPackage(id, root);
        if (installed.version !== core.version) throw new BuildInfoError(`${installed.name} version must match core version ${core.version}.`);
    }
    return Object.freeze({
        schema: 'easy-web/build-info', schemaVersion: 1, site: options.site,
        ...(options.releaseId === undefined ? {} : { releaseId: options.releaseId }),
        easyWeb: Object.freeze({ version: core.version, packages }),
    });
}
