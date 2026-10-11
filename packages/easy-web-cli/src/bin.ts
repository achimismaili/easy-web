import { readFileSync } from 'node:fs';
import mri from 'mri';

const INVALID_INPUT_EXIT_CODE = 3;
const NOT_IMPLEMENTED_EXIT_CODE = 2;

const HELP = `easy-web - create easy-web sites

Usage:
  easy-web create [--json]
  easy-web --help
  easy-web --version

Commands:
  create       Create a new easy-web site (not yet implemented)

Options:
  --json       Emit machine-readable diagnostics
  -h, --help   Show this help message
  -v, --version  Show the CLI version`;

interface Diagnostic {
  schemaVersion: 1;
  level: 'error';
  code: 'INVALID_INPUT' | 'NOT_IMPLEMENTED';
  message: string;
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
  const output = json ? JSON.stringify(diagnostic) : diagnostic.message;
  process.stderr.write(`${output}\n`);
}

function fail(diagnostic: Diagnostic, json: boolean, exitCode: number): never {
  writeDiagnostic(diagnostic, json);
  process.exit(exitCode);
}

function main(): void {
  const rawArguments = process.argv.slice(2);
  const knownOptions = new Set(['--help', '-h', '--version', '-v', '--json']);
  const unknownFlag = rawArguments.find(
    (argument) => argument.startsWith('-') && !knownOptions.has(argument),
  );
  const argv = mri(rawArguments, {
    boolean: ['help', 'version', 'json'],
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

  fail(
    {
      schemaVersion: 1,
      level: 'error',
      code: 'NOT_IMPLEMENTED',
      message: 'The create command is not yet implemented.',
      command: 'create',
    },
    json,
    NOT_IMPLEMENTED_EXIT_CODE,
  );
}

main();
