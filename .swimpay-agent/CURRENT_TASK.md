# Current Task

task id: 041_privacy_firewall_and_local_parser
source task file: tasks/041_privacy_firewall_and_local_parser.md
status: completed
scope:
Create Android Receiver MVP foundation through privacy firewall and local parser hints.

files allowed:
- tasks/037_android_project_setup.md
- tasks/038_notification_listener_service.md
- tasks/039_bank_allowlist_and_package_verification.md
- tasks/040_snapshot_extractor_and_coalescer.md
- tasks/041_privacy_firewall_and_local_parser.md
- .swimpay-agent task queue and reports
- apps/android-receiver TypeScript MVP core, tests, docs and Kotlin-source-ready skeleton

forbidden work:
- Do not implement production deployment.
- Do not invent real bank package names or certificate fingerprints.
- Do not implement SBP or PSP behavior.
- Do not claim official bank confirmation.
- Do not store raw phone numbers.
- Do not store raw notification text by default.
- Do not weaken auto-confirm gates.
- Do not weaken admin RBAC.
- Do not add unrelated parser, matching, review, webhook or UI features.

acceptance criteria:
- Android project structure and README exist.
- Notification listener skeleton ignores non-allowlisted packages and never decides payments.
- Bank allowlist model keeps `TO_VERIFY` untrusted.
- Snapshot extractor and coalescer dedupe/merge snapshots.
- Privacy firewall redacts raw phone/raw notification text and emits only extraction hints.
- Backend remains the final decision maker.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T18:33:00+03:00
completed_at: 2026-05-02T18:45:00+03:00
result: completed.

## Source requirements

See tasks/037_android_project_setup.md through tasks/041_privacy_firewall_and_local_parser.md.
