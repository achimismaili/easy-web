import { describe, expect, it } from 'vitest';
import corePackage from '../../../package.json' with { type: 'json' };
import { buildShellFiles, shellRecipe } from '../shell-recipe.js';

const CONTRIBUTION_FILE_PATH: Record<string, string> = {
    'shell.astro-config': 'astro.config.mjs',
    'shell.dependencies': 'package.json',
    'shell.pnpm-workspace': 'pnpm-workspace.yaml',
    'shell.base-layout': 'src/layouts/Base.astro',
    'shell.home': 'src/pages/index.astro',
    'shell.404': 'src/pages/404.astro',
    'shell.localized-paths': 'src/lib/localized-paths.ts',
    'shell.robots': 'public/robots.txt',
    'shell.gitignore': '.gitignore',
};

describe('shell recipe', () => {
    it('generates a file for every declared contribution', () => {
        const files = buildShellFiles({});
        const filePaths = new Set(files.map((file) => file.path));

        for (const contribution of shellRecipe.outputContributions) {
            const expectedPath = CONTRIBUTION_FILE_PATH[contribution.id];
            expect(expectedPath, `missing file-path mapping for ${contribution.id}`).toBeDefined();
            expect(filePaths.has(expectedPath!), `missing generated file for ${contribution.id} at ${expectedPath}`).toBe(true);
        }
        expect(files.length).toBe(shellRecipe.outputContributions.length);
    });

    it('wires the SEO integration into astro.config.mjs', () => {
        const files = buildShellFiles({});
        const config = files.find((file) => file.path === 'astro.config.mjs')!;
        expect(config.content).toContain('easyWebSeo');
        expect(config.content).toContain('replace-with-your-domain.example');
    });

    it('sets noIndex true in config when the option is enabled', () => {
        const files = buildShellFiles({ noIndex: true });
        const config = files.find((file) => file.path === 'astro.config.mjs')!;
        expect(config.content).toContain('noIndex: true');
    });

    it('never emits a real domain', () => {
        const files = buildShellFiles({});
        for (const file of files) {
            expect(file.content).not.toMatch(/ismaili\.de|harleyrentflorida|party200|tv-1927/);
        }
    });

    it('gitignores node_modules', () => {
        const files = buildShellFiles({});
        const gitignore = files.find((file) => file.path === '.gitignore')!;
        expect(gitignore.content).toContain('node_modules');
    });

    it('keeps the generated Astro range inside the core peer range', () => {
        const files = buildShellFiles({});
        const manifestFile = files.find((file) => file.path === 'package.json')!;
        const manifest = JSON.parse(manifestFile.content) as { dependencies: { astro: string } };
        const generatedMinimum = Number(/^\^(\d+)\./.exec(manifest.dependencies.astro)?.[1]);
        const peerBounds = /^>=(\d+)\.0\.0 <(\d+)\.0\.0$/.exec(corePackage.peerDependencies.astro);

        expect(peerBounds, 'core Astro peer range must retain explicit major bounds').not.toBeNull();
        expect(generatedMinimum).toBeGreaterThanOrEqual(Number(peerBounds![1]));
        expect(generatedMinimum).toBeLessThan(Number(peerBounds![2]));
        expect(manifest.dependencies.astro).toBe('^7.3.5');
    });

    it('allows required dependency builds under pnpm 11', () => {
        const files = buildShellFiles({});
        const workspace = files.find((file) => file.path === 'pnpm-workspace.yaml')!;

        expect(workspace.content).toBe('allowBuilds:\n  esbuild: true\n  sharp: true\n');
    });
});
