import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REQUIRED_ANDROID_SDK_FILES = [
  'packages/swimpay-android/package.json',
  'packages/swimpay-android/README.md',
  'packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayCheckout.kt',
  'packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayBankLauncher.kt',
  'packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayButton.kt',
  'docs/SDK_ANDROID_QUICKSTART.md',
  'examples/android-merchant-basic/README.md',
  'examples/android-merchant-basic/CheckoutActivity.kt',
  'examples/android-merchant-basic/AndroidManifest.xml'
];

const ANDROID_CODE_FILES = [
  'packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayCheckout.kt',
  'packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayBankLauncher.kt',
  'packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayButton.kt',
  'examples/android-merchant-basic/CheckoutActivity.kt',
  'examples/android-merchant-basic/AndroidManifest.xml'
];

function read(file: string): string {
  return readFileSync(join(process.cwd(), file), 'utf8');
}

describe('Android merchant SDK product truth guardrails', () => {
  it('ships a separate Android merchant SDK helper package, docs and example', () => {
    for (const file of REQUIRED_ANDROID_SDK_FILES) {
      expect(existsSync(join(process.cwd(), file)), `${file} should exist`).toBe(true);
    }
  });

  it('exposes checkout opening and non-confirming return helpers', () => {
    const sdk = read('packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayCheckout.kt');

    expect(sdk).toContain('object SwimPayCheckout');
    expect(sdk).toContain('fun open(');
    expect(sdk).toContain('fun createIntent(');
    expect(sdk).toContain('fun parseReturnUri(');
    expect(sdk).toContain('fun parseReturnIntent(');
    expect(sdk).toContain('Intent.ACTION_VIEW');
    expect(sdk).toContain('CustomTabsIntent');
    expect(sdk).toContain('enum class SwimPayCheckoutStatus');
    expect(sdk).toContain('swimpay_return_scheme');
    expect(sdk).toContain('swimpay_bank_launcher_scheme');

    for (const status of ['Returned', 'Cancelled', 'Expired', 'Rejected', 'Unknown', 'Error']) {
      expect(sdk).toContain(status);
    }

    for (const error of [
      'InvalidCheckoutUrl',
      'NoBrowserAvailable',
      'ActivityNotFound',
      'InvalidReturnUri',
      'UnsupportedScheme',
      'Cancelled',
      'Unknown'
    ]) {
      expect(sdk).toContain(error);
    }

    expect(sdk).toMatch(/returnDoesNotConfirm\s*=\s*true/);
  });

  it('exposes a safe payer bank app launcher without payment extras', () => {
    const launcher = read('packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayBankLauncher.kt');

    expect(launcher).toContain('object SwimPayBankLauncher');
    expect(launcher).toContain('data class SwimPayBankLauncherOptions');
    expect(launcher).toContain('data class SwimPayBankLauncherResult');
    expect(launcher).toContain('enum class SwimPayBankLauncherStatus');
    expect(launcher).toContain('enum class SwimPayBankLauncherError');
    expect(launcher).toContain('explicitActivityClassName');
    expect(launcher).toContain('launchUri');
    expect(launcher).toContain('packageName');
    expect(launcher).toContain('fallbackPackageNames');
    expect(launcher).toContain('setClassName');
    expect(launcher).toContain('Intent.ACTION_VIEW');
    expect(launcher).toContain('Intent.CATEGORY_BROWSABLE');
    expect(launcher).toContain('setPackage(packageName)');
    expect(launcher).toContain('getLaunchIntentForPackage');
    expect(launcher).toContain('launchDoesNotConfirm');
    expect(launcher).toMatch(/launchDoesNotConfirm\s*:\s*Boolean\s*=\s*true/);

    expect(launcher).not.toMatch(/putExtra|replaceExtras|data\s*=|setData|setDataAndType|ClipData|EXTRA_/u);
    expect(launcher).not.toMatch(/phone|amount|card|reference|webhook|notification|bank_confirmed|payment\.confirmed|official_bank_confirmation/iu);
  });

  it('ships a reusable Android checkout button UI without payment decision behavior', () => {
    const button = read('packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayButton.kt');
    const example = read('examples/android-merchant-basic/CheckoutActivity.kt');

    expect(button).toContain('object SwimPayButton');
    expect(button).toContain('enum class SwimPayButtonState');
    expect(button).toContain('data class SwimPayButtonConfig');
    expect(button).toContain('Payer avec SwimPay');
    expect(button).toMatch(/minHeightDp\s*:\s*Int\s*=\s*56/u);
    expect(button).toContain('setOnClickListener');
    expect(button).not.toMatch(/orders\.create|Authorization|secret|webhook|markOrderPaid|fulfill|payment\.confirmed/iu);

    expect(example).toContain('SwimPayButton.create');
    expect(example).toContain('SwimPayButtonState.Loading');
    expect(example).toContain('SwimPayButtonState.Ready');
  });

  it('keeps the Android merchant SDK separated from Receiver internals', () => {
    const corpus = ANDROID_CODE_FILES.map(read).join('\n');

    expect(corpus).not.toMatch(/PremiumMerchantRuntime|PremiumMerchantApp|AndroidMerchantApiWiring|NotificationAccessStatusReader/);
    expect(corpus).not.toMatch(/NotificationListenerService|NotificationListener|BIND_NOTIFICATION_LISTENER_SERVICE/);
    expect(corpus).not.toMatch(/READ_SMS|RECEIVE_SMS|BIND_ACCESSIBILITY_SERVICE|AccessibilityService|QUERY_ALL_PACKAGES/);
    expect(corpus).not.toMatch(/getInstalledPackages|getInstalledApplications|queryIntentActivities/);
    expect(corpus).not.toMatch(/ru\.sberbankmobile|com\.idamob\.tinkoff\.android|ru\.vtb24\.mobilebanking\.android|ru\.alfabank\.mobile\.android|ru\.gazprombank\.android\.mobilebank\.app/);
  });

  it('keeps secrets, webhooks and fulfillment out of Android code', () => {
    const corpus = ANDROID_CODE_FILES.map(read).join('\n');

    expect(corpus).not.toMatch(/SWIMPAY_SECRET_KEY|sk_live_|sk_test_|Authorization\s*[:=]\s*Bearer/i);
    expect(corpus).not.toMatch(/webhook|payment\.confirmed|fulfill|releaseOrder|shipOrder|markOrderPaid/i);
    expect(corpus).not.toMatch(/cvv|cvc|expiry|expiration|cardNumber|rawCard|rawPhone|notificationText/i);
    expect(corpus).not.toMatch(/auto_confirm|autoConfirm|official_bank_confirmation\s*[:=]\s*true|officialBankConfirmation\s*[:=]\s*true/i);
  });

  it('documents the safe Android integration boundary', () => {
    const docs = [
      'docs/SDK_ANDROID_QUICKSTART.md',
      'examples/android-merchant-basic/README.md',
      'packages/swimpay-android/README.md'
    ].map(read).join('\n');

    expect(docs).toContain('merchant backend');
    expect(docs).toContain('checkout_url');
    expect(docs).toContain('SwimPayButton');
    expect(docs).toContain('refresh order status from your backend');
    expect(docs).toContain('never put a SwimPay secret in the APK');
    expect(docs).toContain('return does not confirm payment');
    expect(docs).toContain('webhook is delivered to your backend');
    expect(docs).toContain('official_bank_confirmation=false');

    expect(docs).not.toMatch(/auto_confirm\s*:\s*true|autoConfirm\s*:\s*true/i);
    expect(docs).not.toMatch(/official_bank_confirmation\s*[:=]\s*true|officialBankConfirmation\s*[:=]\s*true/i);
    expect(docs).not.toMatch(/payment\.signal_detected[\s\S]{0,120}(fulfill|release|ship|confirm)/i);
    expect(docs).not.toMatch(/payment\.needs_review[\s\S]{0,120}(fulfill|release|ship|confirm)/i);
    expect(docs).not.toMatch(/J['’]ai payé[\s\S]{0,100}(confirme|confirmation du paiement)/i);
  });
});
