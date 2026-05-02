# Blockers

No current critical blockers.

Last checked after Sprint 3C Receiver lifecycle/upload/outbox/health validation: 2026-05-02T19:02:00+03:00.

Known non-critical limitations:

- Production-grade asymmetric receiver device signature verification is still a future hardening item.
- Live PostgreSQL/NATS integration smoke tests are documented but not yet automated as a containerized integration suite.
- Real bank package/certificate verification policy requires human/operator process and real Android PackageManager evidence outside this repo.
- Gradle/Android tooling is not present in this repo, so Android platform tests were not run.
- Kotlin-source-ready Android skeleton exists, but a runnable Android app module still needs Gradle setup.
- Sprint 3C outbox encryption uses an interface and safe test fake/model; Android Keystore and encrypted storage are future platform implementation work.
