# Task 271 - Sprint 5B Validation

Status: completed

Run validation for Sprint 5B.

Required validation:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
- `GET http://localhost:8080/api-health`
- `npm run production:admin-auth-preflight`
- Android Gradle validation if Android code is touched

Result:

- See `.swimpay-agent/SPRINT_5B_REPORT.md`.
