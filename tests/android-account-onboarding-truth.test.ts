import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function readIfExists(relativePath: string): string {
  const absolutePath = join(root, relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

const premiumUiFiles = [
  "apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumNavigationState.kt",
  "apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt",
  "apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingState.kt",
  "apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt",
  "apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt",
  "apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumAccountEntryState.kt",
  "apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumAccountEntryScreens.kt"
];

describe("Android account and onboarding product truth", () => {
  it("documents the canonical Android account truth", () => {
    const truth = read("docs/ANDROID_ACCOUNT_AND_ONBOARDING_TRUTH.md");

    expect(truth).toContain("the app starts on an account entry screen before onboarding");
    expect(truth).toContain("Google is not required for normal Android account creation");
    expect(truth).toContain("does not collect merchant user first names or last names");
    expect(truth).toContain("Google appears only in these places");
  });

  it("requires a pre-onboarding account entry surface with equal profile rights", () => {
    const statePath =
      "apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumAccountEntryState.kt";
    const screenPath =
      "apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumAccountEntryScreens.kt";
    const accountEntry = `${readIfExists(statePath)}\n${readIfExists(screenPath)}`;

    expect(existsSync(join(root, statePath))).toBe(true);
    expect(existsSync(join(root, screenPath))).toBe(true);
    expect(accountEntry).toMatch(/Créer un compte/);
    expect(accountEntry).toMatch(/Se connecter/);
    expect(accountEntry).toMatch(/Profil personnel/);
    expect(accountEntry).toMatch(/Profil commerce|Profil commerçant|commerce/);
    expect(accountEntry).toMatch(/sameAppRights|samePermissions|SameRights|MEMBER|OWNER/);
    expect(accountEntry).not.toMatch(/firstName|lastName|givenName|surname|prénom|nom de famille/i);
  });

  it("keeps Google out of onboarding and places it in security recovery", () => {
    const onboarding = read(
      "apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt"
    );
    const security = read(
      "apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt"
    );

    expect(onboarding).not.toMatch(/Google|Se connecter avec Google/i);
    expect(security).toMatch(/Google/);
    expect(security).toMatch(/récup|sauvegard|lier/i);
  });

  it("makes the connected-site branch a webhook test only", () => {
    const onboarding = read(
      "apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt"
    );

    expect(onboarding).toContain("Lancer le test webhook");
    expect(onboarding).not.toMatch(/Tester sans site connecté/);
    expect(onboarding).not.toMatch(/payment\.confirmed|official_bank_confirmation/i);
  });

  it("keeps Android away from order confirmation and merchant webhook delivery", () => {
    const premiumUiCorpus = premiumUiFiles.map(readIfExists).join("\n");

    expect(premiumUiCorpus).not.toMatch(/confirmOrder|sendDeveloperWebhook|emitDeveloperWebhook/i);
    expect(premiumUiCorpus).not.toMatch(/payment\.confirmed/);
    expect(premiumUiCorpus).not.toMatch(/official_bank_confirmation\s*=\s*true/i);
  });
});
