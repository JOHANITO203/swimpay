# Task 263 - Sprint 5A Validation

Run required validation.

Commands:

- npm run android:doctor
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config
- docker compose --env-file .env.example -f infra/docker-compose.yml ps
- GET http://localhost:8080/api-health
- npm run operator:identity-readiness
- git diff --check

