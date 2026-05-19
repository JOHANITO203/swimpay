export type LandingLocale = 'fr' | 'en' | 'ru';

export interface LandingCopy {
  nav: {
    home: string;
    features: string;
    app: string;
    security: string;
    pricing: string;
    faq: string;
    trust: string;
    download: string;
    downloadApp: string;
    dockLabel: string;
    openMenu: string;
    closeMenu: string;
  };
  hero: {
    badge: string;
    titleA: string;
    titleB: string;
    description: string;
    freeBadge: string;
    primaryCta: string;
    secondaryCta: string;
    phoneEyebrow: string;
    phoneTitle: string;
    walletLabel: string;
    walletAmount: string;
    walletFooter: string;
    reviewsPending: string;
    reviewsConfirmed: string;
    historyTitle: string;
    latestSuccess: string;
    proofs: Array<{
      title: string;
      description: string;
    }>;
  };
  features: {
    eyebrow: string;
    title: string;
    description: string;
    cards: Array<{
      title: string;
      description: string;
      meta: string;
      status: string;
      tags: string[];
    }>;
  };
  showcase: {
    titleA: string;
    titleB: string;
    description: string;
    points: string[];
    activityLabel: string;
    chartTitle: string;
    period: string;
    totalVolume: string;
    weekGrowth: string;
    success: string;
    excellentYield: string;
  };
  trust: {
    title: string;
    descriptionA: string;
    descriptionB: string;
    chips: string[];
  };
  download: {
    titleA: string;
    titleB: string;
    description: string;
    bullets: string[];
    version: string;
    versionSubtitle: string;
    cta: string;
    qrLabel: string;
    androidSupport: string;
    apkSupport: string;
  };
  footer: {
    description: string;
    privacy: string;
    terms: string;
    legal: string;
  };
}

export interface LandingSeoCopy {
  htmlLang: string;
  ogLocale: string;
  title: string;
  description: string;
  keywords: string;
  imageAlt: string;
}

export const defaultLandingLocale: LandingLocale = 'ru';

export const landingLocales: LandingLocale[] = ['ru', 'fr', 'en'];

export const landingSeoTranslations: Record<LandingLocale, LandingSeoCopy> = {
  ru: {
    htmlLang: 'ru',
    ogLocale: 'ru_RU',
    title: 'SwimPay Merchant - Android APK и SDK checkout one-click',
    description:
      'SwimPay Merchant предлагает Android APK для продавцов и бесплатный checkout SDK one-click в pre-release: учет платежей бизнеса, без сбора средств SwimPay.',
    keywords:
      'SwimPay, Android APK для продавцов, merchant app, SDK checkout, one-click оплата, учет платежей бизнеса, webhook платежа',
    imageAlt: 'SwimPay Merchant, Android APK для продавцов и SDK checkout one-click',
  },
  fr: {
    htmlLang: 'fr',
    ogLocale: 'fr_FR',
    title: 'SwimPay Merchant - APK marchand et SDK checkout one-click',
    description:
      "SwimPay Merchant propose un APK Android marchand et un SDK checkout one-click gratuit en pré-release pour suivre l'activité de paiement sans prélèvement de fonds par SwimPay.",
    keywords:
      'SwimPay, APK marchand, application marchand Android, SDK checkout, paiement one-click, suivi comptabilité business, webhook paiement',
    imageAlt: 'SwimPay Merchant, APK Android marchand et SDK checkout one-click',
  },
  en: {
    htmlLang: 'en',
    ogLocale: 'en_US',
    title: 'SwimPay Merchant - Android merchant APK and one-click checkout SDK',
    description:
      'SwimPay Merchant provides an Android merchant APK and a free pre-release one-click checkout SDK for business payment tracking without SwimPay collecting funds.',
    keywords:
      'SwimPay, merchant Android APK, merchant app, checkout SDK, one-click payment, business accounting tracking, payment webhook',
    imageAlt: 'SwimPay Merchant, Android merchant APK and one-click checkout SDK',
  },
};

export const landingTranslations: Record<LandingLocale, LandingCopy> = {
  fr: {
    nav: {
      home: 'Accueil',
      features: 'Fonctionnalités',
      app: "L'application",
      security: 'Sécurité',
      pricing: 'Tarifs',
      faq: 'FAQ',
      trust: 'Sécurité',
      download: 'Télécharger',
      downloadApp: "Télécharger l'app",
      dockLabel: 'Navigation principale de la landing page',
      openMenu: 'Ouvrir le menu',
      closeMenu: 'Fermer le menu',
    },
    hero: {
      badge: 'Pré-release gratuite pour marchands',
      titleA: 'Recevez et suivez',
      titleB: 'vos paiements simplement',
      description:
        "SwimPay réunit une app marchande pour suivre la comptabilité de votre business et un SDK qui installe un paiement one-click entre marchand et acheteur.",
      freeBadge: 'Gratuit au lancement.',
      primaryCta: "Télécharger l'app Merchant",
      secondaryCta: 'En savoir +',
      phoneEyebrow: 'Espace Merchant',
      phoneTitle: 'Dashboard',
      walletLabel: 'Paiements reçus',
      walletAmount: '85 920,50 ₽',
      walletFooter: 'CARTE • 5421',
      reviewsPending: 'À confirmer',
      reviewsConfirmed: 'Confirmés',
      historyTitle: 'Historique des paiements',
      latestSuccess: 'Dernier signal reconnu',
      proofs: [
        { title: 'App marchande', description: 'Suivez paiements, statuts et comptabilité.' },
        { title: 'SDK one-click', description: 'Installez un paiement guidé côté acheteur.' },
        { title: 'Identité préservée', description: 'Pas de prélèvement de fonds par SwimPay.' },
      ],
    },
    features: {
      eyebrow: 'App + SDK',
      title: 'Une couche paiement légère pour marchands',
      description:
        "SwimPay présente les outils essentiels pour lancer simplement : l'app Merchant, le suivi comptable et le SDK checkout one-click.",
      cards: [
        {
          title: 'SDK paiement one-click',
          description:
            "Ajoutez un bouton SwimPay à votre app ou site. Le client est guidé, puis revient vers votre parcours marchand.",
          meta: 'SDK',
          status: 'Pré-release',
          tags: ['checkout', 'one-click', 'gratuit'],
        },
        {
          title: 'APK Merchant',
          description:
            "Téléchargez l'application Android pour suivre vos paiements reçus, vos statuts et la santé de votre business.",
          meta: 'Android',
          status: 'APK',
          tags: ['app', 'business'],
        },
        {
          title: 'Comptabilité lisible',
          description:
            "Gardez une vue simple sur les entrées, les dossiers à relire, l'historique et les événements terminaux.",
          meta: 'Ledger',
          status: 'Suivi',
          tags: ['compta', 'statuts'],
        },
        {
          title: 'Flux sans prélèvement',
          description:
            "SwimPay ne collecte pas les fonds et ne se place pas comme PSP : il organise le parcours, les signaux et la revue.",
          meta: 'Trust',
          status: 'Clair',
          tags: ['no PSP', 'fonds'],
        },
        {
          title: 'Données minimisées',
          description:
            "L'identité de l'acheteur reste préservée : pas de collecte cachée, pas de lecture SMS, pas de scraping bancaire.",
          meta: 'Privacy',
          status: 'Privé',
          tags: ['privacy', 'android'],
        },
      ],
    },
    showcase: {
      titleA: 'Télécharger l’APK.',
      titleB: 'Installer le SDK.',
      description:
        "SwimPay est pensé pour le lancement : une app marchande pour piloter le business et un SDK pour ajouter le paiement guidé à vos surfaces.",
      points: ['APK Android téléchargeable', 'SDK checkout gratuit en pré-release', 'Pas de prélèvement de fonds par SwimPay'],
      activityLabel: 'Activité business',
      chartTitle: 'Évolution des paiements',
      period: '7 jours',
      totalVolume: 'Volume total',
      weekGrowth: '+12% cette semaine',
      success: 'Succès',
      excellentYield: 'Rendement stable',
    },
    trust: {
      title: 'Simple, gratuit au lancement, respectueux des données',
      descriptionA: "SwimPay sert le marchand : suivi comptable, checkout guidé, revue claire.",
      descriptionB: "L'identité utilisateur est minimisée et SwimPay ne prélève pas les fonds.",
      chips: ['APK', 'SDK', 'Privacy', 'Pré-release'],
    },
    download: {
      titleA: 'Installer',
      titleB: 'SwimPay Merchant',
      description:
        "Téléchargez l'APK Merchant, puis installez le SDK dans votre app ou site pour tester le paiement one-click gratuitement pendant la pré-release.",
      bullets: [
        'APK Android Merchant disponible directement',
        'SDK checkout pour site ou application',
        'Pas de fonds prélevés par SwimPay',
      ],
      version: 'APK Merchant',
      versionSubtitle: 'Build Android • Téléchargement direct',
      cta: 'Télécharger',
      qrLabel: 'Scanner pour mobile',
      androidSupport: 'Android 12/13/14',
      apkSupport: 'APK direct',
    },
    footer: {
      description:
        'SwimPay aide les marchands à suivre leur comptabilité business et à installer un paiement guidé one-click gratuitement en pré-release.',
      privacy: 'Politique de confidentialité',
      terms: "Conditions d'utilisation",
      legal: 'Non affilié à un système bancaire officiel.',
    },
  },
  en: {
    nav: {
      home: 'Home',
      features: 'Features',
      app: 'The app',
      security: 'Security',
      pricing: 'Pricing',
      faq: 'FAQ',
      trust: 'Security',
      download: 'Download',
      downloadApp: 'Download app',
      dockLabel: 'Landing page main navigation',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
    },
    hero: {
      badge: 'Free merchant pre-release',
      titleA: 'Receive and track',
      titleB: 'payments simply',
      description:
        'SwimPay combines a merchant app for business accounting visibility with an SDK that installs one-click payment between merchant and buyer.',
      freeBadge: 'Free during launch.',
      primaryCta: 'Download Merchant app',
      secondaryCta: 'Learn more',
      phoneEyebrow: 'Merchant space',
      phoneTitle: 'Dashboard',
      walletLabel: 'Received payments',
      walletAmount: '85,920.50 ₽',
      walletFooter: 'CARD • 5421',
      reviewsPending: 'To review',
      reviewsConfirmed: 'Confirmed',
      historyTitle: 'Payment history',
      latestSuccess: 'Latest recognized signal',
      proofs: [
        { title: 'Merchant app', description: 'Track payments, statuses and accounting.' },
        { title: 'One-click SDK', description: 'Install guided payment for buyers.' },
        { title: 'Identity preserved', description: 'SwimPay does not collect funds.' },
      ],
    },
    features: {
      eyebrow: 'App + SDK',
      title: 'A lightweight payment layer for merchants',
      description:
        'SwimPay gives merchants the essentials to launch simply: the Merchant app, accounting visibility and the one-click checkout SDK.',
      cards: [
        {
          title: 'One-click payment SDK',
          description:
            'Add a SwimPay button to your app or website. The buyer is guided, then returns to your merchant flow.',
          meta: 'SDK',
          status: 'Pre-release',
          tags: ['checkout', 'one-click', 'free'],
        },
        {
          title: 'Merchant APK',
          description:
            'Download the Android app to track received payments, statuses and business health.',
          meta: 'Android',
          status: 'APK',
          tags: ['app', 'business'],
        },
        {
          title: 'Readable accounting',
          description:
            'Keep a simple view over incoming entries, items to review, history and terminal events.',
          meta: 'Ledger',
          status: 'Tracking',
          tags: ['accounting', 'status'],
        },
        {
          title: 'No fund collection',
          description:
            'SwimPay does not collect funds and does not act as a PSP: it organizes the flow, signals and review.',
          meta: 'Trust',
          status: 'Clear',
          tags: ['no PSP', 'funds'],
        },
        {
          title: 'Minimized data',
          description:
            'Buyer identity stays protected: no hidden collection, no SMS reading, no bank app scraping.',
          meta: 'Privacy',
          status: 'Private',
          tags: ['privacy', 'android'],
        },
      ],
    },
    showcase: {
      titleA: 'Download the APK.',
      titleB: 'Install the SDK.',
      description:
        'SwimPay is built for launch: a merchant app to run the business and an SDK to add guided payment to your surfaces.',
      points: ['Direct Android APK download', 'Free checkout SDK during pre-release', 'No funds collected by SwimPay'],
      activityLabel: 'Business activity',
      chartTitle: 'Payment evolution',
      period: '7 days',
      totalVolume: 'Total volume',
      weekGrowth: '+12% this week',
      success: 'Success',
      excellentYield: 'Stable yield',
    },
    trust: {
      title: 'Simple, free at launch, respectful of data',
      descriptionA: 'SwimPay serves merchants: accounting visibility, guided checkout, clear review.',
      descriptionB: 'User identity is minimized and SwimPay does not collect funds.',
      chips: ['APK', 'SDK', 'Privacy', 'Pre-release'],
    },
    download: {
      titleA: 'Install',
      titleB: 'SwimPay Merchant',
      description:
        'Download the Merchant APK, then install the SDK in your app or website to test one-click payment for free during pre-release.',
      bullets: ['Direct Merchant Android APK', 'Checkout SDK for app or website', 'No funds collected by SwimPay'],
      version: 'Merchant APK',
      versionSubtitle: 'Android build • Direct download',
      cta: 'Download',
      qrLabel: 'Scan on mobile',
      androidSupport: 'Android 12/13/14',
      apkSupport: 'Direct APK',
    },
    footer: {
      description:
        'SwimPay helps merchants track business accounting and install guided one-click payment for free during pre-release.',
      privacy: 'Privacy policy',
      terms: 'Terms of use',
      legal: 'Not affiliated with an official banking system.',
    },
  },
  ru: {
    nav: {
      home: 'Главная',
      features: 'Возможности',
      app: 'Приложение',
      security: 'Безопасность',
      pricing: 'Тарифы',
      faq: 'FAQ',
      trust: 'Безопасность',
      download: 'Скачать',
      downloadApp: 'Скачать приложение',
      dockLabel: 'Основная навигация лендинга',
      openMenu: 'Открыть меню',
      closeMenu: 'Закрыть меню',
    },
    hero: {
      badge: 'Бесплатная pre-release для продавцов',
      titleA: 'Получайте и отслеживайте',
      titleB: 'платежи проще',
      description:
        'SwimPay объединяет merchant app для учета бизнеса и SDK, который добавляет one-click оплату между продавцом и покупателем.',
      freeBadge: 'Бесплатно на запуске.',
      primaryCta: 'Скачать Merchant',
      secondaryCta: 'Подробнее',
      phoneEyebrow: 'Кабинет Merchant',
      phoneTitle: 'Панель',
      walletLabel: 'Полученные платежи',
      walletAmount: '85 920,50 ₽',
      walletFooter: 'КАРТА • 5421',
      reviewsPending: 'На проверку',
      reviewsConfirmed: 'Подтверждены',
      historyTitle: 'История платежей',
      latestSuccess: 'Последний распознанный сигнал',
      proofs: [
        { title: 'Merchant app', description: 'Платежи, статусы и учет бизнеса.' },
        { title: 'One-click SDK', description: 'Направленная оплата для покупателя.' },
        { title: 'Identity preserved', description: 'SwimPay не собирает средства.' },
      ],
    },
    features: {
      eyebrow: 'App + SDK',
      title: 'Легкий платежный слой для продавцов',
      description:
        'SwimPay дает продавцам основные инструменты для запуска: Merchant app, учет платежей и checkout SDK one-click.',
      cards: [
        {
          title: 'SDK one-click оплаты',
          description:
            'Добавьте кнопку SwimPay в приложение или сайт. Покупатель проходит сценарий и возвращается в merchant flow.',
          meta: 'SDK',
          status: 'Pre-release',
          tags: ['checkout', 'one-click', 'free'],
        },
        {
          title: 'Merchant APK',
          description:
            'Скачайте Android-приложение, чтобы отслеживать полученные платежи, статусы и здоровье бизнеса.',
          meta: 'Android',
          status: 'APK',
          tags: ['app', 'business'],
        },
        {
          title: 'Понятный учет',
          description:
            'Держите простую картину по входящим платежам, review, истории и терминальным событиям.',
          meta: 'Ledger',
          status: 'Tracking',
          tags: ['accounting', 'status'],
        },
        {
          title: 'Без сбора средств',
          description:
            'SwimPay не собирает средства и не является PSP: он организует flow, сигналы и review.',
          meta: 'Trust',
          status: 'Clear',
          tags: ['no PSP', 'funds'],
        },
        {
          title: 'Минимум данных',
          description:
            'Идентичность покупателя защищена: без скрытого сбора, без чтения SMS, без scraping банковских приложений.',
          meta: 'Privacy',
          status: 'Private',
          tags: ['privacy', 'android'],
        },
      ],
    },
    showcase: {
      titleA: 'Скачайте APK.',
      titleB: 'Установите SDK.',
      description:
        'SwimPay создан для запуска: merchant app для управления бизнесом и SDK для направленной оплаты на ваших поверхностях.',
      points: ['Прямая загрузка Android APK', 'Checkout SDK бесплатно в pre-release', 'SwimPay не собирает средства'],
      activityLabel: 'Активность бизнеса',
      chartTitle: 'Динамика платежей',
      period: '7 дней',
      totalVolume: 'Общий объем',
      weekGrowth: '+12% за неделю',
      success: 'Успех',
      excellentYield: 'Стабильный результат',
    },
    trust: {
      title: 'Просто, бесплатно на запуске, бережно к данным',
      descriptionA: 'SwimPay служит продавцу: учет, checkout, понятный review.',
      descriptionB: 'Идентичность пользователя минимизируется, а SwimPay не собирает средства.',
      chips: ['APK', 'SDK', 'Privacy', 'Pre-release'],
    },
    download: {
      titleA: 'Установить',
      titleB: 'SwimPay Merchant',
      description:
        'Скачайте Merchant APK, затем установите SDK в приложение или сайт, чтобы бесплатно протестировать one-click оплату во время pre-release.',
      bullets: ['Прямой Merchant Android APK', 'Checkout SDK для app или сайта', 'SwimPay не собирает средства'],
      version: 'Merchant APK',
      versionSubtitle: 'Android build • Прямая загрузка',
      cta: 'Скачать',
      qrLabel: 'Сканировать с телефона',
      androidSupport: 'Android 12/13/14',
      apkSupport: 'Прямой APK',
    },
    footer: {
      description:
        'SwimPay помогает продавцам отслеживать учет бизнеса и бесплатно установить one-click платеж в pre-release.',
      privacy: 'Политика конфиденциальности',
      terms: 'Условия использования',
      legal: 'Не связано с официальной банковской системой.',
    },
  },
};

export function resolveLandingLocale(pathname = window.location.pathname): LandingLocale {
  const segment = pathname.split('/').filter(Boolean)[0];
  return isLandingLocale(segment) ? segment : defaultLandingLocale;
}

export function isLandingLocale(value: unknown): value is LandingLocale {
  return typeof value === 'string' && landingLocales.includes(value as LandingLocale);
}

export function landingLocalePath(locale: LandingLocale): string {
  if (locale === defaultLandingLocale) return '/';
  return `/${locale}/`;
}
