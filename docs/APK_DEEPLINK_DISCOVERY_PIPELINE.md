# APK Deeplink Discovery Pipeline

This internal SwimPay tool performs static Android APK discovery for bank launcher compatibility.

It is only for:

- AndroidManifest metadata;
- browsable intent-filter discovery;
- custom scheme and app-link observation;
- package-name observation;
- META-INF certificate fingerprint observation;
- experimental BankLauncherRegistry generation.

It is not for:

- APK patching;
- rebuilding APKs;
- SSL bypass;
- Frida, Xposed or runtime hooking;
- credential, token or secret extraction;
- bypassing authentication;
- automating bank actions;
- transaction manipulation;
- Accessibility abuse.

## Commands

Single APK:

```bash
npm run apk:discover -- --apk ./tools/apk-discovery/input/sber.apk --bank sber_ru
```

All APKs:

```bash
npm run apk:discover:all
```

Generate the aggregate observed registry from existing per-bank reports:

```bash
npm run apk:registry
```

The all-APK command scans `tools/apk-discovery/input` first. On this workstation, if that folder is empty, it falls back to:

```txt
C:\Users\Lenovo\Downloads\apkanalyser
```

You can override this with:

```bash
npm run apk:discover:all -- --input-dir "C:\Users\Lenovo\Downloads\apkanalyser"
```

## Output

Each APK discovery run produces:

```txt
tools/apk-discovery/output/<bank_id>/<version>/
```

The temporary APKTool decode directory is removed after extraction by default, because full decoded bank APKs are large and the registry only needs the generated JSON reports.

Reports are written to:

```txt
tools/apk-discovery/reports/<bank_id>.md
tools/apk-discovery/reports/<bank_id>.json
tools/apk-discovery/reports/bank-launcher-registry.observed.json
```

Generated output and reports are ignored by git because they are local discovery artifacts.

## Status Vocabulary

`candidate` means a manifest URI pattern looks launcher-relevant.

`observed` means static metadata was observed from an APK or manifest.

`runtime_verified` means a real device test proved `resolveActivity`, package launch or deeplink open behavior.

`certified` is a later product/security status that requires runtime verification, package/cert validation and explicit SwimPay approval.

## Hard Rules

```txt
APK discovery != runtime support
runtime support != certified
deeplink found != safe
deeplink safe != payment support
```

Generated registry entries are always:

```json
{
  "testedStatus": "experimental",
  "runtimeVerified": false
}
```

unless a later runtime validation pipeline promotes them through explicit tests and review.

## Runtime Validation Next Step

After static discovery:

1. test exact package launch;
2. test `resolveActivity()` for candidate deeplinks;
3. test deeplink open behavior on a consenting device;
4. test manual fallback;
5. record `runtimeVerified=true` only after those checks pass;
6. promote to certified only through the bank route certification workflow.
