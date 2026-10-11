import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readdir, writeFile, lstat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ComposedSite } from './compose.js';
import { safeOutputPath } from './compose.js';
import { invalid } from './errors.js';
import { git } from './git.js';

const execute = promisify(execFile);

export async function listFiles(root: string, prefix = ''): Promise<readonly string[]> {
    const files: string[] = [];
    for (const name of await readdir(join(root, prefix))) {
        if (!prefix && name === '.git') continue;
        const path = prefix ? `${prefix}/${name}` : name;
        const stat = await lstat(join(root, path));
        if (stat.isSymbolicLink()) invalid(`Staging contains a link: ${path}`);
        if (stat.isDirectory()) files.push(...await listFiles(root, path));
        else if (stat.isFile()) files.push(path);
        else invalid(`Staging contains a special file: ${path}`);
    }
    return files.sort();
}

export async function writeAndValidate(root: string, site: ComposedSite): Promise<void> {
    for (const file of site.files) {
        const path = join(root, safeOutputPath(file.path));
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, file.content, { flag: 'wx' });
        if (file.path.endsWith('.json')) JSON.parse(String(file.content));
        if (/\.(?:mjs|cjs|js)$/.test(file.path)) {
            await execute(process.execPath, ['--check', path], { timeout: 30_000 });
        }
    }
    const expected = site.files.map(({ path }) => path).sort();
    if (JSON.stringify(await listFiles(root)) !== JSON.stringify(expected)) invalid('Staging tree differs from the output allow-list');
    await git(root, ['add', '--', ...expected]);
    const staged = (await git(root, ['diff', '--cached', '--name-status', '--no-renames', '-z'])).split('\0').filter(Boolean);
    const paths: string[] = [];
    for (let index = 0; index < staged.length; index += 2) {
        if (staged[index] !== 'A') invalid('Staged diff must contain additions only');
        const path = staged[index + 1];
        if (path) paths.push(path);
    }
    if (JSON.stringify(paths.sort()) !== JSON.stringify(expected)) invalid('Git index differs from the output allow-list');
}
