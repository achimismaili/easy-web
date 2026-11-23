import { describe, expect, it } from 'vitest';
import { satisfies } from 'semver';
import { createContentSiteRecipes, createRecipeAdmissionSchema, shellRecipe } from '@easy-web/core/recipes';
import { authRecipe } from '@easy-web/auth/recipe';
import { cmsMediaRecipe, createCmsContentSiteRecipes } from '@easy-web/cms-adapters';

const composition = {
    contentLocales: ['de', 'en'],
    contentTypes: [{
        id: 'entries', primary: true, labels: { de: 'Eintraege', en: 'Entries' },
        routes: { de: '/eintraege/', en: '/entries/' },
        traits: ['title', 'slug', 'body', 'order'], bindings: ['list', 'detail', 'cms-admin'],
    }],
};
const { content } = createContentSiteRecipes(composition);
const { cms } = createCmsContentSiteRecipes(composition, {
    backend: { repo: 'org/project/repo', tenantId: 'TENANT', appId: 'APP' },
    mediaRoots: ['src/assets/images'], uiLocale: 'en',
});

describe('first-party recipe CLI compatibility', () => {
    it.each([
        ['shell', shellRecipe, '@easy-web/core'],
        ['content', content, '@easy-web/core'],
        ['auth', authRecipe, '@easy-web/auth'],
        ['CMS media', cmsMediaRecipe, '@easy-web/cms-adapters'],
        ['CMS editor', cms, '@easy-web/cms-adapters'],
    ])('%s admits supported CLI versions and rejects the next minor', (_name, original, packageName) => {
        const integrity = `sha512-${'A'.repeat(86)}==`;
        const pin = { packageName, version: original.version, integrity, exportPath: './recipe' };
        const check = (cliVersion: string) => createRecipeAdmissionSchema({
            cliVersion, runtimeVersion: '1.10.0', satisfies,
        }).safeParse({
            registry: { protocolVersion: 1, recipes: [pin] },
            artifacts: [{
                receipt: { source: 'bundled', pin, verifiedIntegrity: integrity },
                recipe: { ...original, requires: [], conflicts: [] },
            }],
        });
        for (const version of ['0.1.0', '0.2.1', '0.3.0']) expect(check(version).success).toBe(true);
        const rejected = check('0.4.0');
        expect(rejected.success).toBe(false);
        if (!rejected.success) expect(rejected.error.issues.map((issue) => issue.message)).toEqual(['incompatible-cli-range']);
    });
});
