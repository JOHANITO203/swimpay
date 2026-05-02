import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const currentTaskPath = resolve(root, '.swimpay-agent/CURRENT_TASK.md');
const queuePath = resolve(root, '.swimpay-agent/TASK_QUEUE.md');
const progressLogPath = resolve(root, '.swimpay-agent/PROGRESS_LOG.md');
const blockersPath = resolve(root, '.swimpay-agent/BLOCKERS.md');
const nextActionPath = resolve(root, '.swimpay-agent/NEXT_ACTION.md');

function readIfExists(path, fallback) {
  return existsSync(path) ? readFileSync(path, 'utf8') : fallback;
}

function firstPendingTask(queue) {
  const match = queue.match(/^- \[ \] `([^`]+)` - status: pending - source: `([^`]+)`/m);
  if (!match) {
    return 'No pending root task found.';
  }

  return `${match[1]} (${match[2]})`;
}

function currentTaskId(currentTask) {
  return currentTask.match(/^task id: (.+)$/m)?.[1] ?? 'unknown';
}

function latestValidation(progressLog) {
  const matches = [...progressLog.matchAll(/## ([^\n]+) - Agent validation (pass|fail)/g)];
  const latest = matches.at(-1);
  if (!latest) {
    return 'No agent validation run found.';
  }

  return `${latest[2]} at ${latest[1]}`;
}

function changedFiles() {
  const result = spawnSync('git status --short -- .', {
    cwd: root,
    shell: true,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    return `Could not detect changed files:\n${result.stderr || result.stdout || 'git status failed'}`;
  }

  return result.stdout.trim() || 'No changed files detected by git.';
}

const currentTask = readIfExists(currentTaskPath, 'task id: none');
const queue = readIfExists(queuePath, '');
const progressLog = readIfExists(progressLogPath, '');
const blockers = readIfExists(blockersPath, 'No blocker file found.');
const validation = latestValidation(progressLog);
const nextTask = firstPendingTask(queue);
const taskId = currentTaskId(currentTask);

const summary = `# Next Action

generated_at: ${new Date().toISOString()}

## Latest completed task

Repository foundation baseline is complete. Current prepared task: ${taskId}.

## Files changed if detectable

\`\`\`text
${changedFiles()}
\`\`\`

## Commands run

See .swimpay-agent/PROGRESS_LOG.md.

Latest validation: ${validation}

## Pass/fail status

${validation.startsWith('pass') ? 'PASS' : 'UNKNOWN_OR_FAIL'}

## Blockers

${blockers.trim()}

## Next recommended task

${nextTask}

## What not to do next

- Do not implement task 004 before task 003 is complete.
- Do not implement payment auto-confirmation in the Order API task.
- Do not store raw phone numbers.
- Do not store raw notification text by default.
- Do not create real bank package or certificate values.
- Do not deploy.
- Do not continue after failing checks unless the failure is understood and documented.
`;

writeFileSync(nextActionPath, summary, 'utf8');

console.log(`Wrote ${nextActionPath}`);
console.log(`Next recommended task: ${nextTask}`);
