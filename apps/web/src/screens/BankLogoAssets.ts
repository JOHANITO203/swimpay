import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

const BANK_LOGO_FILES: Readonly<Record<string, { path: string; mime: string }>> = {
  ic_bank_sberbank: {
    path: 'apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_sberbank.png',
    mime: 'image/jpeg'
  },
  ic_bank_tbank: {
    path: 'apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_tbank.png',
    mime: 'image/jpeg'
  },
  ic_bank_vtb: {
    path: 'apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_vtb.png',
    mime: 'image/png'
  },
  ic_bank_alfa: {
    path: 'apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_alfa.png',
    mime: 'image/png'
  },
  ic_bank_gazprombank: {
    path: 'apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_gazprombank.png',
    mime: 'image/png'
  },
  // Real launcher icons extracted from the reverse-engineered APKs (mipmap-xxxhdpi ic_launcher)
  // — the actual app icon buyers recognise, not a placeholder/monochrome mark.
  ic_bank_orange_money: { path: 'apps/web/assets/payer-logos/orange_money.png', mime: 'image/png' },
  ic_bank_wave: { path: 'apps/web/assets/payer-logos/wave.png', mime: 'image/png' },
  ic_bank_mtn_momo: { path: 'apps/web/assets/payer-logos/mtn_momo.png', mime: 'image/png' },
  ic_bank_wise: { path: 'apps/web/assets/payer-logos/wise.png', mime: 'image/png' },
  ic_bank_payoneer: { path: 'apps/web/assets/payer-logos/payoneer.png', mime: 'image/png' },
  // Revolut ships an adaptive (vector-only) icon in its APK — no raster to extract — so it keeps
  // the brand-mark SVG until we render the vector.
  ic_bank_revolut: { path: 'apps/web/assets/payer-logos/revolut.svg', mime: 'image/svg+xml' },
  ic_bank_moov: { path: 'apps/web/assets/payer-logos/moov.svg', mime: 'image/svg+xml' },
  ic_bank_free_money: { path: 'apps/web/assets/payer-logos/free_money.svg', mime: 'image/svg+xml' },
  ic_bank_wizall: { path: 'apps/web/assets/payer-logos/wizall.svg', mime: 'image/svg+xml' },
  ic_bank_djamo: { path: 'apps/web/assets/payer-logos/djamo.svg', mime: 'image/svg+xml' },
  ic_bank_sg: { path: 'apps/web/assets/payer-logos/sg.svg', mime: 'image/svg+xml' },
  ic_bank_ecobank: { path: 'apps/web/assets/payer-logos/ecobank.svg', mime: 'image/svg+xml' }
};

const bankLogoDataUriCache = new Map<string, string>();

/** Every logo asset key that has a bundled image — used to emit the per-logo background-image
 *  CSS. Must cover WA/international apps (wave, orange, mtn, wise, revolut…), not just RU banks. */
export const checkoutBankLogoAssetKeys: readonly string[] = Object.keys(BANK_LOGO_FILES);

export function checkoutBankLogoDataUri(logoAssetKey: string): string | undefined {
  const cached = bankLogoDataUriCache.get(logoAssetKey);
  if (cached) return cached;
  const asset = BANK_LOGO_FILES[logoAssetKey];
  if (!asset) return undefined;
  try {
    const bytes = readFileSync(join(REPO_ROOT, asset.path));
    const dataUri = `data:${asset.mime};base64,${bytes.toString('base64')}`;
    bankLogoDataUriCache.set(logoAssetKey, dataUri);
    return dataUri;
  } catch {
    return undefined;
  }
}
