import { attr, directChildren, parseXmlDocument } from './xml.js';
import type { ApkManifestDiscovery, BrowsableActivity, IntentDataDiscovery, IntentFilterDiscovery } from './types.js';

const VIEW_ACTION = 'android.intent.action.VIEW';
const BROWSABLE_CATEGORY = 'android.intent.category.BROWSABLE';
type ParsedXmlNode = ReturnType<typeof parseXmlDocument>;

export function parseAndroidManifestXml(xml: string, generatedAt = new Date().toISOString()): ApkManifestDiscovery {
  const manifest = parseXmlDocument(xml);
  if (manifest.name !== 'manifest') {
    throw new Error('Malformed AndroidManifest XML: root element must be manifest.');
  }

  const packageName = attr(manifest, 'package') ?? manifest.attrs.package;
  if (!packageName) {
    throw new Error('Malformed AndroidManifest XML: missing package name.');
  }

  const application = directChildren(manifest, 'application')[0];
  const activityNodes = application ? [...directChildren(application, 'activity'), ...directChildren(application, 'activity-alias')] : [];
  const browsableActivities = activityNodes
    .map((activity) => toBrowsableActivity(activity, packageName))
    .filter((activity): activity is BrowsableActivity => activity !== null);
  const dataEntries = browsableActivities.flatMap((activity) => activity.intentFilters.flatMap((filter) => filter.data));

  const discovery: ApkManifestDiscovery = {
    packageName,
    browsableActivities,
    discoveredSchemes: uniqueSorted(dataEntries.map((data) => data.scheme).filter(isString)),
    discoveredHosts: uniqueSorted(dataEntries.map((data) => data.host).filter(isString)),
    generatedAt
  };
  const versionCode = attr(manifest, 'versionCode');
  const versionName = attr(manifest, 'versionName');
  const applicationLabel = application ? attr(application, 'label') : undefined;
  if (versionCode) {
    discovery.versionCode = versionCode;
  }
  if (versionName) {
    discovery.versionName = versionName;
  }
  if (applicationLabel) {
    discovery.applicationLabel = applicationLabel;
  }
  return discovery;
}

function toBrowsableActivity(activity: ParsedXmlNode, packageName: string): BrowsableActivity | null {
  const filters = directChildren(activity, 'intent-filter').map(toIntentFilter);
  const browsableFilters = filters.filter(
    (filter) => filter.actions.includes(VIEW_ACTION) && filter.categories.includes(BROWSABLE_CATEGORY)
  );
  if (browsableFilters.length === 0) {
    return null;
  }

  const activityName = resolveActivityName(attr(activity, 'name') ?? activity.attrs.name ?? '<unknown>', packageName);
  const browsableActivity: BrowsableActivity = {
    activityName,
    intentFilters: browsableFilters.map((filter) => ({
      actions: filter.actions,
      categories: filter.categories,
      data: filter.data
    }))
  };
  const exported = parseOptionalBoolean(attr(activity, 'exported'));
  if (exported !== undefined) {
    browsableActivity.exported = exported;
  }
  if (browsableFilters.some((filter) => filter.autoVerify === true)) {
    browsableActivity.autoVerify = true;
  }
  return browsableActivity;
}

function toIntentFilter(filter: ParsedXmlNode): IntentFilterDiscovery & { autoVerify?: boolean } {
  const discovery: IntentFilterDiscovery & { autoVerify?: boolean } = {
    actions: uniqueInOrder(directChildren(filter, 'action').map((node) => attr(node, 'name')).filter(isString)),
    categories: uniqueInOrder(directChildren(filter, 'category').map((node) => attr(node, 'name')).filter(isString)),
    data: directChildren(filter, 'data').map(toIntentData)
  };
  const autoVerify = parseOptionalBoolean(attr(filter, 'autoVerify'));
  if (autoVerify !== undefined) {
    discovery.autoVerify = autoVerify;
  }
  return discovery;
}

function toIntentData(data: ParsedXmlNode): IntentDataDiscovery {
  const discovery: IntentDataDiscovery = {};
  const scheme = attr(data, 'scheme');
  const host = attr(data, 'host');
  const path = attr(data, 'path');
  const pathPrefix = attr(data, 'pathPrefix');
  const pathPattern = attr(data, 'pathPattern');
  if (scheme) discovery.scheme = scheme;
  if (host) discovery.host = host;
  if (path) discovery.path = path;
  if (pathPrefix) discovery.pathPrefix = pathPrefix;
  if (pathPattern) discovery.pathPattern = pathPattern;
  return discovery;
}

function resolveActivityName(name: string, packageName: string): string {
  if (name.startsWith('.')) {
    return `${packageName}${name}`;
  }
  return name.includes('.') ? name : `${packageName}.${name}`;
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function uniqueInOrder(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function isString(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}
