# Android Merchant Polish Closeout

Date: 2026-05-12

## Result

The Android Merchant premium runtime no longer presents the audited static/fake values as real merchant state.

## Fixed Items

- Menu/profile identity.
- Configuration checklist readiness.
- Receiver Health fake counts/state.
- Payment detail fake signal age.
- Review tabs filtering.
- Receiving method bank catalogs.
- Onboarding receiving method bank catalogs.
- Developer integration external URL placeholder.
- Confirmation mode V1 manual copy.

## Preview/Catalog Exceptions

Preview/demo data may remain in previews or fixture-style tests. Runtime normal paths must use session, repository, backend, local receiver config, or explicit honest fallback.

## Backend Contracts Reused

- Mobile merchant session display handle / merchant id.
- Receiving methods repository.
- Connected site repository.
- Developer integration snapshot.
- Bank target lock supported targets.
- Receiver runtime config store.

## Blockers

- Full repository validation still needs to be run after this closeout if time allows.
- Receiver Health still has limited local runtime visibility where backend `receiver_health` fields are absent; UI now says `À vérifier` rather than inventing values.

## Next Recommended Polish Step

Audit preview/demo-only data boundaries and add a small naming convention so tests can distinguish runtime source files from Compose previews and catalog fixtures.
