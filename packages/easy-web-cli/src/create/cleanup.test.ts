import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fault = vi.hoisted(() => ({
    destination: '',
    error: new Error('injected publication fault'),
    foreign: '',
}));

vi.mock('node:fs/promises', async (importOriginal) => {
    const original = await importOriginal<typeof import('node:fs/promises')>();
    return {
        ...original,
        link: async (existingPath: string, newPath: string) => {
            if (newPath === fault.destination) {
                await original.writeFile(fault.foreign, 'preserve');
                throw fault.error;
            }
            return original.link(existingPath, newPath);
        },
    };
});

const { parseCreateConfig } = await import('./config.js');
const { createSite } = await import('./run.js');

let root: string;
beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'easy-web-cleanup-test-'));
    fault.destination = '';
    fault.foreign = '';
});
afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('create publication cleanup', () => {
    it.each([false, true])('preserves the original failure and foreign file while cleaning every other owned artifact when target exists=%s', async (exists) => {
        // Given
        const target = join(root, 'site');
        if (exists) await mkdir(target);
        fault.destination = join(target, 'src', 'pages', '404.astro');
        fault.foreign = join(target, 'src', 'FOREIGN.txt');

        // When
        const creation = createSite(parseCreateConfig({ target }));

        // Then
        await expect(creation).rejects.toMatchObject({
            code: 'CREATE_FAILED',
            message: 'Site generation/staging failed',
            cause: fault.error,
            cleanupErrors: Array.from({ length: exists ? 1 : 2 }, () => expect.objectContaining({ code: 'ENOTEMPTY' })),
        });
        expect(await readFile(fault.foreign, 'utf8')).toBe('preserve');
        expect(await readdir(target)).toEqual(['src']);
        expect(await readdir(join(target, 'src'))).toEqual(['FOREIGN.txt']);
        expect(await readdir(root)).toEqual(['site']);

        await expect(createSite(parseCreateConfig({ target }))).rejects.toMatchObject({
            code: 'INVALID_INPUT',
            message: expect.stringContaining('Target is not empty'),
        });
        expect(await readFile(fault.foreign, 'utf8')).toBe('preserve');
    });
});
