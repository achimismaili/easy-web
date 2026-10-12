import { readFileSync } from 'node:fs';
import mri from 'mri';
import { causeMessage, CreateError } from './create/errors.js';

const INVALID_INPUT_EXIT_CODE = 3;
const CREATE_FAILED_EXIT_CODE = 4;

const HELP = `easy-web - create easy-web sites

Usage:
  easy-web create --config <file.json> [--install | --no-install] [--json]
  easy-web --help
  easy-web --version

Commands:
  create       Generate an empty-target site and one Git commit

Options:
  --config     JSON configuration (target and recipe options)
  --json       Emit machine-readable diagnostics
  --install    Run pnpm install after the generated commit (default: false)
  --no-install Explicit alias for the offline default
  -h, --help   Show this help message
  -v, --version  Show the CLI version`;

interface Diagnostic {
  schemaVersion: 1;
  level: 'error';
  code: 'INVALID_INPUT' | 'CREATE_FAILED';
  message: string;
  cause?: string;
  command?: string;
}

interface PackageManifest {
  version: string;
}

function getVersion(): string {
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as PackageManifest;
  return manifest.version;
}

function writeDiagnostic(diagnostic: Diagnostic, json: boolean): void {
  const output = json
    ? JSON.stringify(diagnostic)
    : [diagnostic.message, diagnostic.cause && `Cause: ${diagnostic.cause}`].filter(Boolean).join('\n');
  process.stderr.write(`${output}\n`);
}

function fail(diagnostic: Diagnostic, json: boolean, exitCode: number): never {
  writeDiagnostic(diagnostic, json);
  process.exit(exitCode);
}

async function main(): Promise<void> {
  const rawArguments = process.argv.slice(2);
  const knownOptions = new Set(['--help', '-h', '--version', '-v', '--json', '--config', '--install', '--no-install']);
  const unknownFlag = rawArguments.find(
    (argument) => argument.startsWith('-') && !knownOptions.has(argument),
  );
  const argv = mri(rawArguments, {
    boolean: ['help', 'version', 'json', 'install'],
    string: ['config'],
    alias: { h: 'help', v: 'version' },
  });
  const json = argv.json === true;

  if (unknownFlag) {
    fail(
      {
        schemaVersion: 1,
        level: 'error',
        code: 'INVALID_INPUT',
        message: `Unknown option: ${unknownFlag}`,
      },
      json,
      INVALID_INPUT_EXIT_CODE,
    );
  }

  if (argv.help) {
    process.stdout.write(`${HELP}\n`);
    return;
  }

  if (argv.version) {
    process.stdout.write(`${getVersion()}\n`);
    return;
  }

  const [command, ...extraArguments] = argv._;
  if (!command) {
    process.stdout.write(`${HELP}\n`);
    return;
  }

  if (command !== 'create' || extraArguments.length > 0) {
    fail(
      {
        schemaVersion: 1,
        level: 'error',
        code: 'INVALID_INPUT',
        message:
          command === 'create'
            ? `Unexpected argument: ${String(extraArguments[0])}`
            : `Unknown command: ${String(command)}`,
        command: String(command),
      },
      json,
      INVALID_INPUT_EXIT_CODE,
    );
  }

  try {
    if (typeof argv.config !== 'string' || !argv.config) {
      throw new CreateError('INVALID_INPUT', 'create requires --config <file.json>');
    }
    const { readCreateConfig } = await import('./create/config.js');
    const { createSite } = await import('./create/run.js');
    const result = await createSite(await readCreateConfig(argv.config), undefined, { install: argv.install === true });
    process.stdout.write(json
      ? `${JSON.stringify({ schemaVersion: 1, ...result })}\n`
      : `Created ${result.target}\nCommit: ${result.commit}\nBranch: ${result.branch}\n${result.graphJson}\n${result.graphMermaid}`);
  } catch (error) {
    const diagnostic = error instanceof CreateError ? error
      : new CreateError('CREATE_FAILED', 'Site creation failed', { cause: error });
    fail({ schemaVersion: 1, level: 'error', code: diagnostic.code, message: diagnostic.message, cause: causeMessage(diagnostic), command: 'create' },
      json, diagnostic.code === 'INVALID_INPUT' ? INVALID_INPUT_EXIT_CODE : CREATE_FAILED_EXIT_CODE);
  }
}

await main();
