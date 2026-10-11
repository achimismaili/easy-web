import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CreateError } from './errors.js';

const execute = promisify(execFile);

export async function git(cwd: string, args: readonly string[]): Promise<string> {
    const env: NodeJS.ProcessEnv = { ...process.env, GIT_MASTER: '1', GIT_TERMINAL_PROMPT: '0' };
    // Ambient Git overrides must not redirect operations into the invoker's repository.
    for (const key of Object.keys(env)) {
        if (key.startsWith('GIT_') && !['GIT_MASTER', 'GIT_TERMINAL_PROMPT', 'GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL'].includes(key)) delete env[key];
    }
    try {
        const result = await execute('git', ['-c', 'core.hooksPath=', '-c', 'commit.gpgSign=false', ...args], {
            cwd, env, timeout: 30_000, maxBuffer: 4 * 1024 * 1024,
        });
        return result.stdout.trimEnd();
    } catch (error) {
        throw new CreateError('CREATE_FAILED', `Git operation failed: ${args[0]}`, { cause: error });
    }
}
