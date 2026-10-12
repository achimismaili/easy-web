import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { installDependencies } from './install.js';

let target: string | undefined;

afterEach(async () => {
    if (target) await rm(target, { recursive: true, force: true });
    target = undefined;
});

describe('dependency installation', () => {
    it('starts the real pnpm runner and installs a network-free empty manifest', async () => {
        target = await mkdtemp(join(tmpdir(), 'easy-web-install-test-'));
        await writeFile(join(target, 'package.json'), '{"name":"install-smoke","private":true}\n');

        await expect(installDependencies(target, { install: true })).resolves.toBeUndefined();

        expect(await readFile(join(target, 'pnpm-lock.yaml'), 'utf8')).toContain("lockfileVersion: '9.0'");
    });

    it('wraps the real installer failure as the CreateError cause', async () => {
        const failure = Object.assign(new Error('spawn EINVAL'), { code: 'EINVAL' });

        await expect(installDependencies('.', {
            install: true,
            runner: async () => { throw failure; },
        })).rejects.toMatchObject({
            code: 'CREATE_FAILED',
            message: 'Dependency installation failed',
            cause: failure,
        });
    });
});
