import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
let cachedSwimPaySdkButtonIconDataUri: string | undefined;

export function swimPaySdkButtonIconDataUri(): string {
  if (cachedSwimPaySdkButtonIconDataUri) return cachedSwimPaySdkButtonIconDataUri;

  const iconPath = join(REPO_ROOT, 'apps/web/src/assets/swimpay-sdk-button-icon-96.png');
  const icon = readFileSync(iconPath);
  cachedSwimPaySdkButtonIconDataUri = `data:image/png;base64,${icon.toString('base64')}`;
  return cachedSwimPaySdkButtonIconDataUri;
}
