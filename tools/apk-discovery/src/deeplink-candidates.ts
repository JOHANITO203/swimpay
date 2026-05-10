import type { ApkManifestDiscovery, DeeplinkCandidate, IntentDataDiscovery } from './types.js';

const CANDIDATE_KEYWORDS = ['pay', 'transfer', 'sbp', 'card', 'recipient', 'receiver', 'payment'];
const GENERIC_SCHEMES = new Set(['http', 'https']);

export function detectDeeplinkCandidates(manifest: ApkManifestDiscovery): DeeplinkCandidate[] {
  const candidates = new Map<string, DeeplinkCandidate>();

  for (const activity of manifest.browsableActivities) {
    for (const filter of activity.intentFilters) {
      for (const data of filter.data) {
        const uriPattern = toUriPattern(data);
        if (!uriPattern) {
          continue;
        }
        const searchable = uriPattern.toLocaleLowerCase('en-US');
        const hasKeyword = CANDIDATE_KEYWORDS.some((keyword) => searchable.includes(keyword));
        const isCustomScheme = Boolean(data.scheme && !GENERIC_SCHEMES.has(data.scheme));
        const confidence: DeeplinkCandidate['confidence'] = hasKeyword || isCustomScheme ? 'medium' : 'low';

        candidates.set(uriPattern, {
          uriPattern,
          source: 'manifest_discovery',
          confidence,
          status: 'candidate',
          relatedActivity: activity.activityName
        });
      }
    }
  }

  return [...candidates.values()].sort((a, b) => a.uriPattern.localeCompare(b.uriPattern));
}

function toUriPattern(data: IntentDataDiscovery): string | null {
  if (!data.scheme) {
    return null;
  }

  const host = data.host ? `://${data.host}` : ':';
  const path = data.path ?? prefixToPattern(data.pathPrefix) ?? data.pathPattern ?? '';
  return `${data.scheme}${host}${path}`;
}

function prefixToPattern(pathPrefix: string | undefined): string | undefined {
  return pathPrefix ? `${pathPrefix}*` : undefined;
}
