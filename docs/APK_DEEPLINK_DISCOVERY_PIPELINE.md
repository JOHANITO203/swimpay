# APK Deeplink Discovery Sandbox

The bank APK deeplink discovery pipeline is intentionally kept outside the SwimPay repository.

External sandbox path:

```txt
D:\Dev\ExternalTools\swimpay-apk-discovery
```

Purpose:

- inspect Android APK metadata;
- parse `AndroidManifest.xml`;
- list browsable intent filters, schemes, hosts and app links;
- extract observed package names and certificate fingerprints;
- generate experimental launcher registry observations.

This sandbox is not part of SwimPay runtime code and is not included in the repository build.

Safety boundary:

- no APK patching;
- no APK rebuilding;
- no SSL bypass;
- no runtime hooking;
- no credential, token or secret extraction;
- no bank action automation;
- no payment initiation;
- no claim that an observed deeplink is runtime verified or certified.

Discovery output remains experimental until validated on a real Android runtime.
