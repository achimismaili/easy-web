import { z } from 'astro/zod';
import type {
  RecipeGeneratedFile,
  RecipeMetadata,
  RecipeValidationIssue,
} from '@easy-web/core/recipes';

export const AUTH_RECIPE_ID = 'auth.single-island';

const authOptionsSchema = z.strictObject({});

export type AuthRecipeOptions = z.infer<typeof authOptionsSchema>;

const packageJson = `${JSON.stringify({
  dependencies: {
    '@astrojs/react': '^4.4.2',
    '@easy-web/auth': '^1.5.0',
    react: '^19.1.1',
    'react-dom': '^19.1.1',
  },
}, null, 2)}\n`;

const authConfig = `import type { AuthConfig } from '@easy-web/auth';

/**
 * PLACEHOLDER values only. Replace these after creating the site's Entra app
 * registration outside the scaffold workflow. Never put a client secret here.
 */
export const authConfig: AuthConfig = {
  clientId: 'REPLACE_WITH_YOUR_CLIENT_ID',
  tenantId: 'REPLACE_WITH_YOUR_TENANT_ID',
};
`;

const authShell = `import { AuthProvider, LoginButton, UserAvatar } from '@easy-web/auth';
import type { AuthConfig } from '@easy-web/auth';

interface AuthShellProps {
  config: AuthConfig;
}

/**
 * The site's only auth-bearing React tree. Add every component that calls an
 * auth hook inside this shell; never mount another auth component as an Astro island.
 */
export default function AuthShell({ config }: AuthShellProps) {
  return (
    <AuthProvider config={config}>
      <div data-easy-web-auth-root>
        <UserAvatar size={28} />
        <LoginButton />
      </div>
    </AuthProvider>
  );
}
`;

const authMount = `---
import AuthShell from './AuthShell';
import { authConfig } from '../config/auth';
---

<!-- Mount AuthMount once in the shared site layout. Do not mount auth on individual pages. -->
<AuthShell client:only="react" config={authConfig} />
`;

const staticWebAppConfig = `${JSON.stringify({
  routes: [
    {
      route: '/.auth/login/aad',
      allowedRoles: ['anonymous'],
      headers: { 'Cache-Control': 'no-store' },
    },
    {
      route: '/.auth/logout',
      allowedRoles: ['authenticated'],
      headers: { 'Cache-Control': 'no-store' },
    },
  ],
}, null, 2)}\n`;

const generatedFiles: readonly RecipeGeneratedFile[] = [
  { path: 'package.json', content: packageJson },
  { path: 'src/config/auth.ts', content: authConfig },
  { path: 'src/components/AuthShell.tsx', content: authShell },
  { path: 'src/components/AuthMount.astro', content: authMount },
  { path: 'staticwebapp.config.json', content: staticWebAppConfig },
];

const authImportPattern = /(?:from\s+['"]@easy-web\/auth['"]|import\s+['"]@easy-web\/auth['"])/;
const authIslandPattern = /<\w+\s+[^>]*client:(?:only|load|idle|visible|media)=(?:"react"|'react'|\{["']react["']\})/g;
const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const secretPattern = /(?:clientSecret|client_secret)\s*[:=]\s*['"][^'"]+['"]/i;

function textFiles(files: readonly RecipeGeneratedFile[]): readonly { path: string; content: string }[] {
  return files
    .filter((file): file is RecipeGeneratedFile & { content: string } => typeof file.content === 'string')
    .map(({ path, content }) => ({ path, content }));
}

export function validateSingleAuthIsland(
  files: readonly RecipeGeneratedFile[],
): readonly RecipeValidationIssue[] {
  const text = textFiles(files);
  const issues: RecipeValidationIssue[] = [];
  const authComponents = new Set(
    text.filter((file) => authImportPattern.test(file.content)).map((file) => file.path),
  );
  let islandCount = 0;

  for (const file of text.filter((candidate) => candidate.path.endsWith('.astro'))) {
    const importedAuthComponents = [...authComponents]
      .map((path) => path.split('/').pop()?.replace(/\.(?:astro|tsx?|jsx?)$/, ''))
      .filter((name): name is string => Boolean(name));
    const touchesAuth = authImportPattern.test(file.content)
      || importedAuthComponents.some((name) => new RegExp(`\\b${name}\\b`).test(file.content));
    if (touchesAuth) islandCount += file.content.match(authIslandPattern)?.length ?? 0;
  }

  if (islandCount !== 1) {
    issues.push({
      code: 'auth-single-island',
      message: `Expected exactly one auth-bearing React island; found ${islandCount}.`,
    });
  }

  for (const file of text) {
    if (uuidPattern.test(file.content) || secretPattern.test(file.content)) {
      issues.push({
        code: 'auth-private-value',
        message: 'Generated auth output contains a credential-shaped value instead of a placeholder.',
        path: file.path,
      });
    }
  }

  return issues;
}

export const authRecipe = {
  id: AUTH_RECIPE_ID,
  version: '1.5.0',
  protocolVersion: 1,
  compatibleCliRange: '^0.1.0',
  compatibleRuntimeRange: '^1.5.0',
  provides: ['auth.single-island'],
  requires: [],
  conflicts: [],
  order: { priority: 40, key: 'auth' },
  optionsSchema: authOptionsSchema,
  outputContributions: [
    { kind: 'dependency', id: 'auth.dependencies', target: 'package.json' },
    { kind: 'configuration', id: 'auth.placeholder-config', target: 'src/config/auth.ts' },
    { kind: 'file', id: 'auth.shell', target: 'src/components/AuthShell.tsx' },
    { kind: 'file', id: 'auth.mount', target: 'src/components/AuthMount.astro' },
    { kind: 'route', id: 'auth.swa-routes', target: 'staticwebapp.config.json' },
  ],
  validators: [{
    id: 'auth.single-island-output',
    phase: 'output',
    validate: ({ output }) => output ? validateSingleAuthIsland(output.files) : [],
  }],
  generate: () => ({ files: generatedFiles }),
} satisfies RecipeMetadata<AuthRecipeOptions>;

export default authRecipe;
