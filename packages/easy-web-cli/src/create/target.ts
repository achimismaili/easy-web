import { lstat, readdir, realpath } from 'node:fs/promises';
import { dirname, parse, resolve } from 'node:path';
import type { Stats } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { git } from './git.js';
import { invalid } from './errors.js';

export async function statOrMissing(path: string): Promise<Stats | undefined> {
    try {
        return await lstat(path);
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
        throw error;
    }
}

export async function checkAncestors(path: string): Promise<void> {
    if (process.platform === 'win32') {
        const result = await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
            "Set-StrictMode -Version Latest; $ErrorActionPreference='Stop'; $path=$env:EASY_WEB_CHECK_PATH; while ($path) { if (Test-Path -LiteralPath $path) { $item=Get-Item -Force -LiteralPath $path; if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { 'reparse'; break } }; $path=[IO.Path]::GetDirectoryName($path) }"],
        { env: { ...process.env, EASY_WEB_CHECK_PATH: path }, timeout: 15_000 });
        if (result.stdout.trim() === 'reparse') invalid(`Reparse-point target ancestor: ${path}`);
    }
    let current = path;
    while (true) {
        const stat = await statOrMissing(current);
        if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) invalid(`Unsafe target ancestor: ${current}`);
        if (current === parse(current).root) break;
        current = dirname(current);
    }
}

export interface TargetPlan {
    readonly path: string;
    readonly stat: Stats | undefined;
    readonly gitRoot: boolean;
    readonly head?: string;
}

export async function planTarget(input: string): Promise<TargetPlan> {
    const path = resolve(input);
    await checkAncestors(path);
    const stat = await statOrMissing(path);
    if (!stat) {
        if (!(await statOrMissing(dirname(path)))) invalid('Target parent directory must exist');
        return { path, stat, gitRoot: false };
    }
    const entries = await readdir(path);
    if (!entries.length) return { path, stat, gitRoot: false };
    if (entries.length !== 1 || entries[0] !== '.git') invalid(`Target is not empty (including hidden/ignored files): ${path}`);
    const metadata = await lstat(resolve(path, '.git'));
    if (metadata.isSymbolicLink()) invalid('Git metadata must not be a link');
    const root = await git(path, ['rev-parse', '--show-toplevel']);
    if (await realpath(root) !== await realpath(path)) invalid('Target must be a Git root or worktree');
    const head = await git(path, ['rev-parse', '--verify', 'HEAD']);
    if (await git(path, ['ls-tree', '-r', '--name-only', head])
        || await git(path, ['ls-files', '--stage'])
        || await git(path, ['status', '--porcelain', '--untracked-files=all', '--ignored'])) {
        invalid('Target Git HEAD tree, index and worktree must be empty and clean');
    }
    return { path, stat, gitRoot: true, head };
}

export async function checkTargetRace(plan: TargetPlan): Promise<void> {
    const current = await planTarget(plan.path);
    if (current.stat?.ino !== plan.stat?.ino || current.stat?.dev !== plan.stat?.dev
        || current.gitRoot !== plan.gitRoot || current.head !== plan.head) {
        invalid('Target changed after planning');
    }
}
