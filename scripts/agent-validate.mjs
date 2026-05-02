import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const progressLogPath = resolve(root, '.swimpay-agent/PROGRESS_LOG.md');
const packagePath = resolve(root, 'package.json');

function nowIso() {
  return new Date().toISOString();
}

function hasNpmScript(name) {
  if (!existsSync(packagePath)) {
    return false;
  }

  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  return typeof pkg.scripts?.[name] === 'string';
}

function runCommand(label, command, required) {
  console.log(`\n==> ${label}`);
  console.log(`$ ${command}`);

  const result = spawnSync(command, {
    cwd: root,
    shell: true,
    encoding: 'utf8'
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  const status = result.status === 0 ? 'pass' : required ? 'fail' : 'skip';

  return {
    label,
    command,
    status,
    code: result.status ?? 1,
    required
  };
}

const checks = [
  { label: 'Typecheck', command: 'npm run typecheck', required: hasNpmScript('typecheck') },
  { label: 'Lint', command: 'npm run lint', required: hasNpmScript('lint') },
  { label: 'Tests', command: 'npm test', required: hasNpmScript('test') },
  { label: 'Build', command: 'npm run build', required: hasNpmScript('build') },
  {
    label: 'Docker Compose config',
    command: 'docker compose --env-file .env.example -f infra/docker-compose.yml config',
    required: existsSync(resolve(root, '.env.example')) && existsSync(resolve(root, 'infra/docker-compose.yml'))
  }
];

const results = checks.map((check) => {
  if (!check.required) {
    console.log(`\n==> ${check.label}`);
    console.log('Skipped because the required script or file is not available.');
    return { ...check, status: 'skip', code: 0 };
  }

  return runCommand(check.label, check.command, true);
});

const failed = results.filter((result) => result.required && result.status !== 'pass');
const summaryStatus = failed.length === 0 ? 'pass' : 'fail';

const logEntry = [
  '',
  `## ${nowIso()} - Agent validation ${summaryStatus}`,
  '',
  ...results.map((result) => `- ${result.status.toUpperCase()}: \`${result.command}\` (${result.label}, exit ${result.code})`),
  ''
].join('\n');

appendFileSync(progressLogPath, logEntry, 'utf8');

console.log(`\nValidation status: ${summaryStatus.toUpperCase()}`);

if (failed.length > 0) {
  console.error('Required validation checks failed. Stop and understand the failure before continuing.');
  process.exit(1);
}
