import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { buildInfoManifest } from '../build-info.js';
import { serializeBuildInfo } from '../build-info-manifest.js';

const core = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
const roots: string[] = [];
function fixture(packages: Readonly<Record<string, string>> = {}): URL {
    const root = mkdtempSync(join(tmpdir(), 'easy-web-build-info-'));
    roots.push(root);
    writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: { '@easy-web/core': '^0.0.1' } }));
    for (const [id, version] of Object.entries(packages)) {
        const folder = join(root, 'node_modules', '@easy-web', id);
        mkdirSync(folder, { recursive: true });
        writeFileSync(join(folder, 'package.json'), JSON.stringify({ name: `@easy-web/${id}`, version, exports: { '.': { import: './index.js' } } }));
        writeFileSync(join(folder, 'index.js'), 'throw new Error("must not execute packages");');
    }
    return pathToFileURL(`${root}/`);
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true }); });

describe('public build-info manifest', () => {
    it('uses the core artifact version rather than the site dependency range', () => {
        // Given a consumer claiming a different dependency range
        const root = fixture();
        // When building the default manifest
        const manifest = buildInfoManifest({ site: 'Public site' }, root);
        // Then only the exact public contract is emitted
        expect(serializeBuildInfo(manifest)).toBe(`{"schema":"easy-web/build-info","schemaVersion":1,"site":"Public site","easyWeb":{"version":"${core.version}","packages":["core"]}}\n`);
    });

    it('sorts and deduplicates configured packages and freezes every container', () => {
        // Given installed fixed-family add-ons, with no executable code allowed
        const root = fixture({ swa: core.version, auth: core.version, 'cms-adapters': core.version });
        // When options are supplied out of order
        const manifest = buildInfoManifest({ site: 'Public', releaseId: 'release-42', packages: ['swa', 'core', 'auth', 'cms-adapters', 'auth'] }, root);
        // Then a single family version and immutable package selection are published
        expect(manifest).toEqual({ schema: 'easy-web/build-info', schemaVersion: 1, site: 'Public', releaseId: 'release-42', easyWeb: { version: core.version, packages: ['auth', 'cms-adapters', 'core', 'swa'] } });
        expect([manifest, manifest.easyWeb, manifest.easyWeb.packages].every(Object.isFrozen)).toBe(true);
    });

    it.each(['brand', 'cli', 'create', 'seo', 'Card', 'react'])('rejects forbidden package %s', (id) => {
        // Given an unsupported package id
        const options = { site: 'Public', packages: [id] };
        // When crossing the configuration boundary, then reject it
        expect(() => buildInfoManifest(options, fixture())).toThrow(/buildInfo/);
    });

    it.each(['version', 'metadata', 'timestamp', 'gitSha', 'branch', 'pipelineUrl', 'tenant', 'environment'])('rejects forbidden option %s', (field) => {
        // Given extra data that must never be copied into public output
        const options = { site: 'Public', [field]: 'private' };
        // When crossing the configuration boundary, then reject it
        expect(() => buildInfoManifest(options, fixture())).toThrow(/buildInfo/);
    });

    it.each(['', ' leading', 'trailing ', 'line\nbreak', 'tab\t', 'nul\0', '\u007f', '\u0085', '\u202e', 'x'.repeat(121)])('rejects unsafe or unbounded site strings %j', (site) => {
        // Given a non-public-label string
        const root = fixture();
        // When building, then validation fails
        expect(() => buildInfoManifest({ site }, root)).toThrow(/buildInfo/);
    });

    it.each(['', ' release', 'release\n42', 'x'.repeat(121)])('rejects unsafe release labels %j', (releaseId) => {
        // Given an invalid optional opaque label
        const root = fixture();
        // When building, then validation fails
        expect(() => buildInfoManifest({ site: 'Public', releaseId }, root)).toThrow(/buildInfo/);
    });

    it('fails clearly when a configured add-on is not installed', () => {
        // Given a site without auth
        const root = fixture();
        // When enabling auth, then fail instead of claiming it is enabled
        expect(() => buildInfoManifest({ site: 'Public', packages: ['auth'] }, root)).toThrow(/@easy-web\/auth.*installed/);
    });

    it.each(['0.0.1', '^1.6.0', 'not-a-version'])('rejects mismatched or inexact installed versions %s', (version) => {
        // Given an incompatible artifact
        const root = fixture({ swa: version });
        // When enabling it, then fixed-family drift is a configuration failure
        expect(() => buildInfoManifest({ site: 'Public', packages: ['swa'] }, root)).toThrow(/@easy-web\/swa.*version/);
    });
});
