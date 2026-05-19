import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const siteUrl = 'https://www.swimpay.pro';

const locales = ['ru', 'fr', 'en'];

const seoByLocale = {
  ru: {
    path: '/',
    htmlLang: 'ru',
    ogLocale: 'ru_RU',
    title: 'SwimPay Merchant - Android APK и SDK checkout one-click',
    description:
      'SwimPay Merchant предлагает Android APK для продавцов и бесплатный checkout SDK one-click в pre-release: учет платежей бизнеса, без сбора средств SwimPay.',
    keywords:
      'SwimPay, Android APK для продавцов, merchant app, SDK checkout, one-click оплата, учет платежей бизнеса, webhook платежа',
    imageAlt: 'SwimPay Merchant, Android APK для продавцов и SDK checkout one-click',
    twitterDescription:
      'Android merchant app и SDK checkout one-click для учета платежей бизнеса, бесплатно в pre-release.',
    structuredDescription:
      'Android APK для продавцов и бесплатный SDK checkout one-click в pre-release. SwimPay не собирает средства.',
  },
  fr: {
    path: '/fr/',
    htmlLang: 'fr',
    ogLocale: 'fr_FR',
    title: 'SwimPay Merchant - APK marchand et SDK checkout one-click',
    description:
      "SwimPay Merchant propose un APK Android marchand et un SDK checkout one-click gratuit en pré-release pour suivre l'activité de paiement sans prélèvement de fonds par SwimPay.",
    keywords:
      'SwimPay, APK marchand, application marchand Android, SDK checkout, paiement one-click, suivi comptabilité business, webhook paiement',
    imageAlt: 'SwimPay Merchant, APK Android marchand et SDK checkout one-click',
    twitterDescription:
      "Une app Android marchande et un SDK checkout one-click pour suivre l'activité paiement, gratuitement en pré-release.",
    structuredDescription:
      "APK Android marchand et SDK checkout one-click gratuit en pré-release. SwimPay ne prélève pas les fonds.",
  },
  en: {
    path: '/en/',
    htmlLang: 'en',
    ogLocale: 'en_US',
    title: 'SwimPay Merchant - Android merchant APK and one-click checkout SDK',
    description:
      'SwimPay Merchant provides an Android merchant APK and a free pre-release one-click checkout SDK for business payment tracking without SwimPay collecting funds.',
    keywords:
      'SwimPay, merchant Android APK, merchant app, checkout SDK, one-click payment, business accounting tracking, payment webhook',
    imageAlt: 'SwimPay Merchant, Android merchant APK and one-click checkout SDK',
    twitterDescription:
      'An Android merchant app and one-click checkout SDK for business payment tracking, free during pre-release.',
    structuredDescription:
      'Android merchant APK and free one-click checkout SDK during pre-release. SwimPay does not collect funds.',
  },
};

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function canonicalUrl(locale) {
  return `${siteUrl}${seoByLocale[locale].path}`;
}

function replaceAttribute(html, selector, attribute, value) {
  const escaped = escapeAttribute(value);
  const pattern = new RegExp(`(<${selector}[^>]*\\s${attribute}=")[^"]*(")`, 'u');
  if (!pattern.test(html)) {
    throw new Error(`Missing ${selector} ${attribute} target`);
  }
  return html.replace(pattern, `$1${escaped}$2`);
}

function replaceMeta(html, keyAttribute, keyValue, content) {
  const selector = `meta ${keyAttribute}="${keyValue}"`;
  return replaceAttribute(html, `meta(?=[^>]*\\s${keyAttribute}="${keyValue}")`, 'content', content).replace(selector, selector);
}

function replaceLink(html, hreflang, href) {
  return replaceAttribute(html, `link(?=[^>]*\\srel="alternate")(?=[^>]*\\shreflang="${hreflang}")`, 'href', href);
}

function replaceJsonLdDescription(html, description) {
  return html.replace(
    /"description":\s*"[^"]*"/u,
    `"description": "${description.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
  );
}

function localizedHtml(template, locale) {
  const seo = seoByLocale[locale];
  const url = canonicalUrl(locale);
  let html = template;

  html = html.replace(/<html lang="[^"]*">/u, `<html lang="${seo.htmlLang}">`);
  html = html.replace(/<title>[^<]*<\/title>/u, `<title>${escapeAttribute(seo.title)}</title>`);
  html = replaceMeta(html, 'name', 'description', seo.description);
  html = replaceMeta(html, 'name', 'keywords', seo.keywords);
  html = replaceAttribute(html, 'link(?=[^>]*\\srel="canonical")', 'href', url);
  html = replaceMeta(html, 'property', 'og:locale', seo.ogLocale);
  html = replaceMeta(html, 'property', 'og:title', seo.title);
  html = replaceMeta(html, 'property', 'og:description', seo.description);
  html = replaceMeta(html, 'property', 'og:url', url);
  html = replaceMeta(html, 'property', 'og:image:alt', seo.imageAlt);
  html = replaceMeta(html, 'name', 'twitter:title', seo.title);
  html = replaceMeta(html, 'name', 'twitter:description', seo.twitterDescription);

  for (const item of locales) {
    html = replaceLink(html, item, canonicalUrl(item));
  }
  html = replaceLink(html, 'x-default', canonicalUrl('ru'));
  html = replaceJsonLdDescription(html, seo.structuredDescription);

  return html;
}

const template = await readFile(path.join(distDir, 'index.html'), 'utf8');

for (const locale of locales) {
  const html = localizedHtml(template, locale);
  const outputDir = locale === 'ru' ? distDir : path.join(distDir, locale);
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'index.html'), html);
}
