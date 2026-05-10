# APK Deeplink Discovery Pipeline Report

generated_at: 2026-05-10T03:20:00+03:00

## Decision

The APK deeplink discovery pipeline is an internal research/sandbox tool, not a SwimPay app/runtime component.

It has been moved outside the repository.

External sandbox:

```txt
D:\Dev\ExternalTools\swimpay-apk-discovery
```

## Why It Is Outside The Repo

- The tool inspects bank APK metadata and generated APKTool outputs.
- Generated outputs can be large and noisy.
- The tool is not needed for API, web, Android Receiver, workers, SDKs or checkout runtime.
- Keeping it external prevents accidental commits of decoded APK files or experimental bank observations.

## Repo State

Removed from the SwimPay repo:

- root npm scripts for `apk:discover`, `apk:discover:all`, `apk:registry`;
- `tools/apk-discovery` TypeScript project reference;
- eslint ignores that only existed for the in-repo sandbox;
- `tests/apk-discovery.test.ts`;
- `tools/apk-discovery/**`.

Kept in the repo:

- this report;
- `docs/APK_DEEPLINK_DISCOVERY_PIPELINE.md`, which records the sandbox path and safety boundary.

## Safety Boundary

The sandbox remains static-analysis only:

- no APK patching;
- no APK rebuilding;
- no SSL bypass;
- no Frida/Xposed/runtime hooking;
- no credentials, tokens or secrets extraction;
- no bank action automation;
- no payment initiation;
- no claim that observed deeplinks are runtime verified or certified.

## Validation Before Externalization

Before moving the sandbox out of the repo, the tool-specific tests passed:

```txt
npx vitest run tests/apk-discovery.test.ts
```

After externalization, SwimPay repo validation should use the normal app commands only.
