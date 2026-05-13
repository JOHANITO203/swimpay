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
  }
};

const bankLogoDataUriCache = new Map<string, string>();

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
