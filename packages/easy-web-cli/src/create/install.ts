import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { RecipeGeneratedFile } from '@easy-web/core/recipes';
import type { ComposedSite } from './compose.js';
import { CreateError, invalid } from './errors.js';

const execute = promisify(execFile);
const dependencyRange = /^(?:[~^]?\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?|[<>=*xX| .\d~^-]+)$/;

interface PackageManifest {
    readonly dependencies?: Readonly<Record<string, string>>;
    readonly devDependencies?: Readonly<Record<string, string>>;
    readonly optionalDependencies?: Readonly<Record<string, string>>;
}

export type InstallRunner = (cwd: string, command: string, args: readonly string[]) => Promise<void>;

export interface InstallOptions {
    readonly install?: boolean;
    readonly runner?: InstallRunner;
}

function quote(value: string): string {
    return `'${value.replaceAll("'", "''")}'`;
}

function packageManifest(site: ComposedSite): PackageManifest {
    const file = site.files.find(({ path }) => path === 'package.json');
    if (!file) invalid('Generated site has no package.json');
    return JSON.parse(String(file.content)) as PackageManifest;
}

function dependencyGroups(manifest: PackageManifest): readonly [string, Readonly<Record<string, string>>][] {
    return [
        ['dependencies', manifest.dependencies ?? {}],
        ['devDependencies', manifest.devDependencies ?? {}],
        ['optionalDependencies', manifest.optionalDependencies ?? {}],
    ];
}

export function validateDependencySources(site: ComposedSite): void {
    for (const [group, dependencies] of dependencyGroups(packageManifest(site))) {
        for (const [name, source] of Object.entries(dependencies)) {
            if (!dependencyRange.test(source)) {
                invalid(`Unsupported ${group} source for ${name}: ${source}`);
            }
        }
    }
}

export function createPlaceholderLockfile(site: ComposedSite): RecipeGeneratedFile {
    const manifest = packageManifest(site);
    const lines = [
        "lockfileVersion: '9.0'",
        '',
        'settings:',
        '  autoInstallPeers: true',
        '  excludeLinksFromLockfile: false',
        '',
        'importers:',
        '',
        '  .:',
    ];
    for (const [group, dependencies] of dependencyGroups(manifest)) {
        const entries = Object.entries(dependencies).sort(([left], [right]) => left.localeCompare(right, 'en'));
        if (!entries.length) continue;
        lines.push(`    ${group}:`);
        for (const [name, specifier] of entries) {
            lines.push(`      ${quote(name)}:`, `        specifier: ${quote(specifier)}`);
        }
    }
    return { path: 'pnpm-lock.yaml', content: `${lines.join('\n')}\n` };
}

export function withPlaceholderLockfile(site: ComposedSite): ComposedSite {
    validateDependencySources(site);
    return { ...site, files: [...site.files, createPlaceholderLockfile(site)].sort((a, b) => a.path.localeCompare(b.path, 'en')) };
}

const defaultRunner: InstallRunner = async (cwd, command, args) => {
    await execute(command, [...args], { cwd, shell: process.platform === 'win32' });
};

export async function installDependencies(target: string, options: InstallOptions = {}): Promise<void> {
    if (options.install !== true) return;
    const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    try {
        await (options.runner ?? defaultRunner)(target, command, ['install']);
    } catch (error) {
        throw new CreateError('CREATE_FAILED', 'Dependency installation failed', { cause: error });
    }
}
