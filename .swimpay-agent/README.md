# SwimPay Local Agent Runner

This directory is a safe local task orchestration system for OpenClaw, Codex, or a human engineer.

It is not full autonomy. It prepares one bounded task, records progress, runs local checks, and summarizes the next safe action.

## Prepare the next task

```bash
npm run agent:next
```

This reads `.swimpay-agent/TASK_QUEUE.md`, finds the first pending task with a real `tasks/*.md` file, writes `.swimpay-agent/CURRENT_TASK.md`, and prints instructions for the coding agent.

The runner does not edit product code and does not skip tasks.

## Validate the current task

```bash
npm run agent:validate
```

This runs available local checks:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`

Results are appended to `.swimpay-agent/PROGRESS_LOG.md`.

## Summarize work

```bash
npm run agent:summary
```

This writes `.swimpay-agent/NEXT_ACTION.md` with latest task context, detectable changed files, validation status, blockers, the next recommended task, and what not to do next.

## Stop safely

Stop when:

- validation fails and the failure is not understood;
- scope is unclear;
- a task file is missing;
- a requested change would touch production secrets, deployment, unrelated services, raw phone storage, raw notification storage, or official bank confirmation wording.

Write the blocker in `.swimpay-agent/BLOCKERS.md` and do not continue.

## Resume tomorrow

1. Open `.swimpay-agent/NEXT_ACTION.md`.
2. Read `.swimpay-agent/CURRENT_TASK.md`.
3. Read `AGENTS.md`, `CODEX_START_HERE.md`, and the task file listed in `CURRENT_TASK.md`.
4. Run `npm run agent:validate` before claiming the workspace is healthy.
5. Continue only within the task scope.

## Use with OpenClaw or Codex

Give OpenClaw/Codex this flow:

```bash
npm run agent:next
```

Then ask it to read:

- `AGENTS.md`
- `CODEX_START_HERE.md`
- `.swimpay-agent/AGENT_RULES.md`
- `.swimpay-agent/CURRENT_TASK.md`
- the source task file named in `CURRENT_TASK.md`

After implementation, run:

```bash
npm run agent:validate
npm run agent:summary
```
