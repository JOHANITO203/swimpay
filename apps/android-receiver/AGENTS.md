# apps/android-receiver AGENTS.md

This app owns merchant-side Android notification capture.

Read before coding here:

- root `AGENTS.md`;
- `docs/08_ANDROID_RECEIVER_SPEC.md`;
- `docs/11_SECURITY_AND_PRIVACY.md`.

Rules:

- Android captures, backend decides.
- Do not implement final payment confirmation locally.
- Ignore non-allowlisted app notifications locally.
- Use local encrypted outbox.
- Sign every uploaded signal.
- Do not read SMS.
- Do not scrape bank apps.
