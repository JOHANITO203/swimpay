# Current Task

task id: 014_deployment_docker_compose
source task file: tasks/014_deployment_docker_compose.md
status: completed
scope:
Create single-server Docker Compose deployment.

files allowed:
- Files named or implied by tasks/014_deployment_docker_compose.md
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
- Compose starts locally.
- PostgreSQL/Valkey/NATS are not publicly exposed.
- Health checks exist where practical.
- Logs are configurable for rotation.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T10:49:10.741Z
completed_at: 2026-05-02T13:53:48.7157762+03:00
result: completed

## Source requirements

Create compose services:

- proxy;
- postgres;
- valkey;
- nats;
- swimpay-api;
- swimpay-signal-worker;
- swimpay-job-worker;
- swimpay-web.

Ensure only proxy exposes public web ports.
