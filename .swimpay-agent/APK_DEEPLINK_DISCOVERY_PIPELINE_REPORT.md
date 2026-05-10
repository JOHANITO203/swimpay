# APK Deeplink Discovery Pipeline Report

generated_at: 2026-05-10T02:00:00+03:00

## Summary

Implemented a static, non-invasive APKTool discovery pipeline for bank launcher compatibility.

The pipeline only observes AndroidManifest metadata, browsable intent filters, URI schemes, app links, package names and META-INF certificate fingerprints. It does not patch APKs, rebuild APKs, hook runtime behavior, bypass SSL pinning, extract secrets, automate bank actions or infer payment support.

## Files Created

- `tools/apk-discovery/src/types.ts`
- `tools/apk-discovery/src/banks.ts`
- `tools/apk-discovery/src/xml.ts`
- `tools/apk-discovery/src/manifest-parser.ts`
- `tools/apk-discovery/src/deeplink-candidates.ts`
- `tools/apk-discovery/src/registry-generator.ts`
- `tools/apk-discovery/src/zip.ts`
- `tools/apk-discovery/src/certificate-extractor.ts`
- `tools/apk-discovery/src/reports.ts`
- `tools/apk-discovery/src/apktool.ts`
- `tools/apk-discovery/src/pipeline.ts`
- `tools/apk-discovery/src/index.ts`
- `tools/apk-discovery/scripts/discover.ts`
- `tools/apk-discovery/scripts/discover-all.ts`
- `tools/apk-discovery/scripts/generate-observed-registry.ts`
- `tools/apk-discovery/fixtures/manifest-sberbank.xml`
- `tools/apk-discovery/tsconfig.json`
- `tools/apk-discovery/.gitignore`
- `docs/APK_DEEPLINK_DISCOVERY_PIPELINE.md`
- `tests/apk-discovery.test.ts`

## Scripts

- `npm run apk:discover -- --apk <path.apk> --bank <bank_id>`
- `npm run apk:discover:all`
- `npm run apk:registry`

## Discovery Results

Generated local reports under `tools/apk-discovery/reports/` and local JSON artifacts under `tools/apk-discovery/output/`.

| Bank | Package | Version | Schemes | Candidates | Runtime Verified |
| --- | --- | ---: | ---: | ---: | --- |
| Sberbank | `ru.sberbankmobile` | `17.5.0` | 14 | 28 | false |
| T-Bank | `com.idamob.tinkoff.android` | `7.34.0` | 8 | 13 | false |
| VTB | `ru.vtb24.mobilebanking.android` | `20.6.2.4` | 10 | 55 | false |
| Alfa-Bank | `ru.alfabank.mobile.android` | `12.50.02` | 6 | 213 | false |
| Gazprombank | `ru.gazprombank.android.mobilebank.app` | `6.1.3` | 3 | 12 | false |
| Ozon Bank | `ru.ozon.fintech.finance` | `19.15.0` | 6 | 31 | false |

Aggregate registry generated:

- `tools/apk-discovery/reports/bank-launcher-registry.observed.json`

Generated registry entries are always experimental and `runtimeVerified=false`.

## Safety Boundaries

Preserved:

- no APK patching;
- no APK rebuilding;
- no SSL bypass;
- no Frida, Xposed or runtime hook;
- no credentials, token or secret extraction;
- no bank action automation;
- no transaction manipulation;
- no Accessibility abuse;
- no claim that a deeplink works at runtime;
- no claim that a deeplink supports payment transfer.

## Tests

Added tests for:

- manifest parser;
- missing browsable activity;
- malformed manifest handling;
- candidate detection;
- runtime verification defaulting to false;
- decoded APK report generation;
- `apktool.yml` version fallback;
- META-INF certificate SHA-256 extraction.

## Commands Run

- `npx vitest run tests/apk-discovery.test.ts` passed: 8 tests.
- `npm run apk:discover` for Sberbank passed.
- `npm run apk:discover` for T-Bank passed.
- `npm run apk:discover` for VTB passed.
- `npm run apk:discover` for Alfa-Bank passed.
- `npm run apk:discover` for Gazprombank passed.
- `npm run apk:discover` for Ozon Bank passed.
- `npm run apk:registry` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 78 files, 607 tests.
- `npm run build` passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` passed.

## Known Limitations

- APK discovery is static observation only.
- `runtimeVerified=false` until real device `resolveActivity`, package launch, deeplink open and manual fallback tests pass.
- Certificate extraction only observes META-INF certificate entries. APK Signature Scheme v2/v3 may require a later dedicated certificate extraction enhancement.
- Some old pre-fix decoded `unknown/apktool` artifacts remain locally under `tools/apk-discovery/output` because Windows long paths resisted deletion. They are ignored by git and ESLint, and the corrected pipeline no longer recreates decoded APK folders after extraction.

## Next Runtime Validation

1. Add an Android runtime validation runner for exact supported packages only.
2. Test `resolveActivity()` for each candidate URI.
3. Test package launch fallback on the consenting device.
4. Record `packageLaunchTested`, `deeplinkTested`, `resolveActivityTested` and `fallbackManualTested`.
5. Promote entries from `experimental` to `observed/runtime_verified` only after runtime proof.
6. Feed validated package/cert/capability data into the Bank Route Certification Matrix.
