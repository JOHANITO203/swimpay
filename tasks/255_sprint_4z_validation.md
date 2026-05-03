# Task 255 - Sprint 4Z Validation

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
- npm run handoff:evidence-readiness
- git diff --check

