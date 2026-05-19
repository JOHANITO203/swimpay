import { landingLocales, landingSeoTranslations, type LandingLocale } from './i18n';

const SITE_URL = 'https://www.swimpay.pro';
const OG_IMAGE_URL = `${SITE_URL}/images/swimpay-og.png`;

function setMeta(selector: string, attribute: 'content' | 'href', value: string): void {
  const element = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (element) {
    element.setAttribute(attribute, value);
  }
}

export function applyLandingMetadata(locale: LandingLocale): void {
  const seo = landingSeoTranslations[locale];
  const canonicalPath = locale === 'ru' ? '/' : `/${locale}/`;
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  document.documentElement.lang = seo.htmlLang;
  document.title = seo.title;

  setMeta('meta[name="description"]', 'content', seo.description);
  setMeta('meta[name="keywords"]', 'content', seo.keywords);
  setMeta('link[rel="canonical"]', 'href', canonicalUrl);
  setMeta('meta[property="og:locale"]', 'content', seo.ogLocale);
  setMeta('meta[property="og:title"]', 'content', seo.title);
  setMeta('meta[property="og:description"]', 'content', seo.description);
  setMeta('meta[property="og:url"]', 'content', canonicalUrl);
  setMeta('meta[property="og:image"]', 'content', OG_IMAGE_URL);
  setMeta('meta[property="og:image:alt"]', 'content', seo.imageAlt);
  setMeta('meta[name="twitter:title"]', 'content', seo.title);
  setMeta('meta[name="twitter:description"]', 'content', seo.description);
  setMeta('meta[name="twitter:image"]', 'content', OG_IMAGE_URL);

  for (const item of landingLocales) {
    setMeta(`link[rel="alternate"][hreflang="${item}"]`, 'href', `${SITE_URL}${item === 'ru' ? '/' : `/${item}/`}`);
  }
}
