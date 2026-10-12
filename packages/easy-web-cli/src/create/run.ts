import { randomUUID } from 'node:crypto';
import { cp, link, mkdir, mkdtemp, readdir, rm, rmdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { CreateConfig, RecipeSelection } from './config.js';
import { selectionsFor } from './config.js';
import { composeRecipes } from './compose.js';
import { CreateError } from './errors.js';
import { git } from './git.js';
import { checkAncestors, checkTargetRace, planTarget } from './target.js';
import { listFiles, writeAndValidate } from './stage.js';
import { installDependencies, withPlaceholderLockfile } from './install.js';
import type { InstallOptions } from './install.js';

export async function createSite(config: CreateConfig, selections: readonly RecipeSelection[] = selectionsFor(config), installOptions: InstallOptions = {}) {
    const plan = await planTarget(config.target);
    const staging = await mkdtemp(join(dirname(plan.path), '.easy-web-create-'));
    const branch = `easy-web-create-${randomUUID()}`;
    const root = join(staging, 'site');
    let worktree = false;
    let retained = false;
    let ownedTarget = false;
    let ownedMetadata = false;
    const published: string[] = [];
    const directories: string[] = [];
    let result: { target: string; commit: string; branch: string; graphJson: string; graphMermaid: string } | undefined;
    try {
        const site = withPlaceholderLockfile(await composeRecipes(selections));
        await checkTargetRace(plan);
        if (plan.gitRoot) {
            await git(plan.path, ['worktree', 'add', '-b', branch, root, plan.head ?? 'HEAD']);
            worktree = true;
        } else {
            await mkdir(root);
            await git(root, ['init', '--initial-branch=main', '--template=']);
        }
        await writeAndValidate(root, site);
        await checkTargetRace(plan);
        if (!plan.gitRoot) {
            if (!plan.stat) { await mkdir(plan.path); ownedTarget = true; }
            await mkdir(join(plan.path, '.git'));
            ownedMetadata = true;
            await checkAncestors(plan.path);
            // Hard links publish each allow-listed file exclusively; existing paths are never overwritten.
            for (const file of site.files) {
                const destination = join(plan.path, file.path);
                const parents: string[] = [];
                let parent = dirname(destination);
                while (parent !== plan.path) { parents.unshift(parent); parent = dirname(parent); }
                for (const directory of parents) {
                    if (!directories.includes(directory)) { await mkdir(directory); directories.push(directory); }
                }
                await link(join(root, file.path), destination);
                published.push(destination);
            }
            const entries = await listFiles(plan.path);
            const expected = site.files.map(({ path }) => path).sort();
            if (JSON.stringify(entries) !== JSON.stringify(expected)) throw new CreateError('INVALID_INPUT', 'Target became occupied during publication');
        }
        if (!plan.gitRoot) {
            for (const entry of await readdir(join(root, '.git'))) {
                await cp(join(root, '.git', entry), join(plan.path, '.git', entry), { recursive: true, force: false, errorOnExist: true });
            }
        }
        const commitRoot = plan.gitRoot ? root : plan.path;
        await git(commitRoot, ['commit', '-m', 'Create easy-web site']);
        const commit = await git(commitRoot, ['rev-parse', 'HEAD']);
        retained = plan.gitRoot;
        result = { target: plan.gitRoot ? root : plan.path, commit, branch: plan.gitRoot ? branch : 'main', graphJson: site.graphJson, graphMermaid: site.graphMermaid };
    } catch (error) {
        const original = error instanceof CreateError
            ? error
            : new CreateError('CREATE_FAILED', 'Site generation/staging failed', { cause: error });
        const cleanupErrors: unknown[] = [];
        const cleanup = async (operation: () => Promise<unknown>): Promise<void> => {
            try { await operation(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
        };
        for (const path of published.reverse()) await cleanup(() => rm(path));
        for (const path of directories.reverse()) await cleanup(() => rmdir(path));
        if (ownedMetadata) await cleanup(() => rm(join(plan.path, '.git'), { recursive: true }));
        if (ownedTarget) await cleanup(() => rmdir(plan.path));
        if (cleanupErrors.length) Object.defineProperty(original, 'cleanupErrors', { value: cleanupErrors });
        throw original;
    } finally {
        if (!retained) {
            if (worktree) {
                const tracked = (await git(root, ['ls-files', '-z'])).split('\0').filter(Boolean);
                if (tracked.length) await git(root, ['rm', '--cached', '--', ...tracked]);
                for (const entry of await readdir(root)) {
                    if (entry !== '.git') await rm(join(root, entry), { recursive: true });
                }
                await git(plan.path, ['worktree', 'remove', root]);
                await git(plan.path, ['branch', '-d', branch]);
            }
            await rm(staging, { recursive: true });
        }
    }
    if (!result) throw new CreateError('CREATE_FAILED', 'Site creation produced no result');
    await installDependencies(result.target, installOptions);
    return result;
}
