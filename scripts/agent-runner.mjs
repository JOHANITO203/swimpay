import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const queuePath = resolve(root, '.swimpay-agent/TASK_QUEUE.md');
const currentTaskPath = resolve(root, '.swimpay-agent/CURRENT_TASK.md');

function nowIso() {
  return new Date().toISOString();
}

function extractSection(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`## ${escaped}\\s*\\n([\\s\\S]*?)(?=\\n## |\\n# |$)`, 'i');
  const match = content.match(pattern);
  return match?.[1]?.trim() || 'See source task file.';
}

function parseQueue(content) {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^- \[ \] `([^`]+)` - status: ([a-z_]+) - source: `([^`]+)`/);
      if (!match) {
        return null;
      }

      return {
        id: match[1],
        status: match[2],
        source: match[3],
        line
      };
    })
    .filter(Boolean);
}

if (!existsSync(queuePath)) {
  console.error(`Missing task queue: ${queuePath}`);
  process.exit(1);
}

const queue = parseQueue(readFileSync(queuePath, 'utf8'));
const nextTask = queue.find((task) => task.status === 'pending');

if (!nextTask) {
  console.error('No pending task found in .swimpay-agent/TASK_QUEUE.md.');
  process.exit(1);
}

const sourcePath = resolve(root, nextTask.source);

if (!nextTask.source.startsWith('tasks/') || !existsSync(sourcePath)) {
  console.error(`Task ${nextTask.id} is not executable automatically. Missing root task file: ${nextTask.source}`);
  process.exit(1);
}

const taskContent = readFileSync(sourcePath, 'utf8');
const goal = extractSection(taskContent, 'Goal');
const requirements = extractSection(taskContent, 'Requirements');
const acceptance = extractSection(taskContent, 'Acceptance criteria');

const currentTask = `# Current Task

task id: ${nextTask.id}
source task file: ${nextTask.source}
status: prepared
scope:
${goal}

files allowed:
- Files named or implied by ${nextTask.source}
- Tests for this task
- Documentation directly related to this task
- Shared packages only when required by this task

forbidden work:
- Do not implement any later task.
- Do not deploy.
- Do not modify production secrets.
- Do not create real bank package/cert values.
- Do not claim official bank confirmation.
- Do not store raw phone numbers.
- Do not store raw notification text by default.
- Do not modify unrelated services.

acceptance criteria:
${acceptance}

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: ${nowIso()}
completed_at: none
result: prepared

## Source requirements

${requirements}
`;

writeFileSync(currentTaskPath, currentTask, 'utf8');

console.log(`Prepared SwimPay task: ${nextTask.id}`);
console.log(`Source: ${nextTask.source}`);
console.log('');
console.log('Coding agent instructions:');
console.log('1. Read AGENTS.md, CODEX_START_HERE.md, .swimpay-agent/AGENT_RULES.md, and .swimpay-agent/CURRENT_TASK.md.');
console.log(`2. Read ${nextTask.source} and all docs it references.`);
console.log('3. Implement only this task. Do not skip ahead.');
console.log('4. Run npm run agent:validate after implementation.');
console.log('5. Run npm run agent:summary before stopping.');
console.log('');
console.log('This runner prepared one task and did not edit product code.');
