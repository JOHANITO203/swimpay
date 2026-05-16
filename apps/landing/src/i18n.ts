export type LandingLocale = 'fr' | 'en' | 'ru';

export interface LandingCopy {
  nav: {
    features: string;
    app: string;
    download: string;
    downloadApp: string;
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
  };
  features: {
    title: string;
    description: string;
    cards: Array<{
      title: string;
      description: string;
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

export const landingLocales: LandingLocale[] = ['fr', 'en', 'ru'];

export const landingTranslations: Record<LandingLocale, LandingCopy> = {
  fr: {
    nav: {
      features: 'Fonctionnalités',
      app: "L'application",
      download: 'Télécharger',
      downloadApp: "Télécharger l'app",
      openMenu: 'Ouvrir le menu',
      closeMenu: 'Fermer le menu',
    },
    hero: {
      badge: 'Solution 100% gratuite & accessible',
      titleA: 'Paiements reçus',
      titleB: 'avec SwimPay',
      description:
        "Offrez à vos clients une expérience de paiement guidée. Gérez votre comptabilité et vos accès business via l'app Merchant.",
      freeBadge: '100% gratuit.',
      primaryCta: "Télécharger l'app Merchant",
      secondaryCta: 'Voir comment ça marche',
      phoneEyebrow: 'Espace Merchant',
      phoneTitle: 'Dashboard',
      walletLabel: 'Paiements reçus',
      walletAmount: '85 920,50 ₽',
      walletFooter: 'CARTE • 5421',
      reviewsPending: 'À confirmer',
      reviewsConfirmed: 'Confirmés',
      historyTitle: 'Historique des paiements',
      latestSuccess: 'Dernier succès',
    },
    features: {
      title: 'Pensé pour les marchands',
      description: "Une interface épurée qui se concentre sur l'essentiel : la santé financière de votre activité.",
      cards: [
        {
          title: 'Paiements reçus lisibles',
          description:
            'Le véritable hook de SwimPay : offrir une expérience guidée sur vos applications pour réduire la friction côté marchand.',
        },
        {
          title: 'Carte et téléphone / SBP',
          description:
            'Une solution accessible à tous les acteurs, avec des méthodes de réception carte et téléphone clairement présentées.',
        },
        {
          title: 'Comptabilité automatisée',
          description:
            "Suivez vos flux financiers sans effort. L'app Merchant centralise vos chiffres pour une gestion comptable limpide.",
        },
        {
          title: 'Gestion des accès business',
          description:
            'Contrôlez qui accède à vos données. Gérez les permissions de vos collaborateurs directement depuis votre mobile.',
        },
      ],
    },
    showcase: {
      titleA: 'Accessible à tous.',
      titleB: 'Gratuit pour toujours.',
      description:
        'Que vous soyez un auto-entrepreneur ou une entreprise établie, SwimPay reste simple, lisible et accessible.',
      points: ['Analyses de volume quotidiennes simplifiées', 'Suivi des taux de conversion en temps réel', 'Gestion unifiée multi-méthodes'],
      activityLabel: 'Activité business',
      chartTitle: 'Évolution des paiements',
      period: '7 jours',
      totalVolume: 'Volume total',
      weekGrowth: '+12% cette semaine',
      success: 'Succès',
      excellentYield: 'Excellent rendement',
    },
    trust: {
      title: 'Une confirmation reste entre vos mains',
      descriptionA: 'SwimPay prépare la revue.',
      descriptionB: 'Le marchand garde la décision finale sur chaque transaction.',
      chips: ['Sécurisé', 'Propriétaire', 'Android Only'],
    },
    download: {
      titleA: 'Prêt à passer à',
      titleB: 'SwimPay Merchant ?',
      description:
        "Téléchargez l'application officielle dès maintenant et commencez à gérer vos paiements avec une clarté absolue.",
      bullets: [
        'Méthodes carte et téléphone / SBP côté marchand',
        "Zéro frais d'installation ou d'abonnement",
        "Sécurité et confidentialité au cœur de l'app",
      ],
      version: 'APK Merchant v1.2.4',
      versionSubtitle: 'Version stable • Format APK direct',
      cta: 'Télécharger',
      qrLabel: 'Scanner pour mobile',
      androidSupport: 'Android 12/13/14',
      apkSupport: 'Support APK direct',
    },
    footer: {
      description:
        'Paiements reçus lisibles. Comptabilité simplifiée. Accès Business maîtrisés. La solution gratuite pour tous les marchands.',
      privacy: 'Politique de confidentialité',
      terms: "Conditions d'utilisation",
      legal: 'Non affilié à un système bancaire officiel.',
    },
  },
  en: {
    nav: {
      features: 'Features',
      app: 'The app',
      download: 'Download',
      downloadApp: 'Download the app',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
    },
    hero: {
      badge: '100% free & accessible solution',
      titleA: 'Received payments',
      titleB: 'with SwimPay',
      description:
        'Give customers a guided payment experience. Manage accounting clarity and business access from the Merchant app.',
      freeBadge: '100% free.',
      primaryCta: 'Download Merchant app',
      secondaryCta: 'See how it works',
      phoneEyebrow: 'Merchant space',
      phoneTitle: 'Dashboard',
      walletLabel: 'Received payments',
      walletAmount: '85,920.50 ₽',
      walletFooter: 'CARD • 5421',
      reviewsPending: 'To review',
      reviewsConfirmed: 'Confirmed',
      historyTitle: 'Payment history',
      latestSuccess: 'Latest success',
    },
    features: {
      title: 'Built for merchants',
      description: 'A clean interface focused on what matters: the financial health of your activity.',
      cards: [
        {
          title: 'Readable received payments',
          description: 'SwimPay gives your apps a guided payment experience and reduces merchant-side friction.',
        },
        {
          title: 'Card and phone / SBP labels',
          description: 'Receiving methods are presented clearly for card and phone-number transfers.',
        },
        {
          title: 'Simplified accounting',
          description: 'Track money flow with less effort. Merchant keeps the numbers easy to read.',
        },
        {
          title: 'Business access control',
          description: 'Control who can access business data and manage permissions from mobile.',
        },
      ],
    },
    showcase: {
      titleA: 'Accessible to everyone.',
      titleB: 'Free forever.',
      description: 'Whether you are self-employed or running a company, SwimPay stays simple, readable and accessible.',
      points: ['Simplified daily volume insights', 'Real-time conversion tracking', 'Unified multi-method management'],
      activityLabel: 'Business activity',
      chartTitle: 'Payment evolution',
      period: '7 days',
      totalVolume: 'Total volume',
      weekGrowth: '+12% this week',
      success: 'Success',
      excellentYield: 'Excellent yield',
    },
    trust: {
      title: 'The final decision stays with you',
      descriptionA: 'SwimPay prepares the review.',
      descriptionB: 'The merchant keeps the final decision on every transaction.',
      chips: ['Secure', 'Owner-controlled', 'Android only'],
    },
    download: {
      titleA: 'Ready for',
      titleB: 'SwimPay Merchant?',
      description: 'Download the official app and start managing payments with full clarity.',
      bullets: ['Merchant-side card and phone / SBP methods', 'No setup or subscription fees', 'Security and privacy at the heart of the app'],
      version: 'Merchant APK v1.2.4',
      versionSubtitle: 'Stable version • Direct APK format',
      cta: 'Download',
      qrLabel: 'Scan on mobile',
      androidSupport: 'Android 12/13/14',
      apkSupport: 'Direct APK support',
    },
    footer: {
      description: 'Readable received payments. Simplified accounting. Controlled business access. Free for merchants.',
      privacy: 'Privacy policy',
      terms: 'Terms of use',
      legal: 'Not affiliated with an official banking system.',
    },
  },
  ru: {
    nav: {
      features: 'Возможности',
      app: 'Приложение',
      download: 'Скачать',
      downloadApp: 'Скачать приложение',
      openMenu: 'Открыть меню',
      closeMenu: 'Закрыть меню',
    },
    hero: {
      badge: 'Бесплатное и доступное решение',
      titleA: 'Полученные платежи',
      titleB: 'со SwimPay',
      description:
        'Дайте клиентам понятный сценарий оплаты. Управляйте платежами, учетом и доступами бизнеса в приложении Merchant.',
      freeBadge: '100% бесплатно.',
      primaryCta: 'Скачать Merchant',
      secondaryCta: 'Как это работает',
      phoneEyebrow: 'Кабинет Merchant',
      phoneTitle: 'Панель',
      walletLabel: 'Полученные платежи',
      walletAmount: '85 920,50 ₽',
      walletFooter: 'КАРТА • 5421',
      reviewsPending: 'На проверку',
      reviewsConfirmed: 'Подтверждены',
      historyTitle: 'История платежей',
      latestSuccess: 'Последний успех',
    },
    features: {
      title: 'Для продавцов',
      description: 'Чистый интерфейс фокусируется на главном: состоянии платежей и бизнеса.',
      cards: [
        {
          title: 'Платежи читаются сразу',
          description: 'SwimPay делает сценарий оплаты понятнее и снижает трение для продавца.',
        },
        {
          title: 'Карта и телефон / SBP',
          description: 'Способы получения по карте и номеру телефона показываются ясно и привычно.',
        },
        {
          title: 'Простой учет',
          description: 'Следите за потоками платежей без лишней сложности. Merchant собирает цифры в одном месте.',
        },
        {
          title: 'Доступы бизнеса',
          description: 'Управляйте тем, кто видит данные бизнеса, прямо с телефона.',
        },
      ],
    },
    showcase: {
      titleA: 'Доступно всем.',
      titleB: 'Бесплатно навсегда.',
      description: 'Для самозанятых и компаний SwimPay остается простым, понятным и доступным.',
      points: ['Упрощенная дневная аналитика', 'Отслеживание конверсии в реальном времени', 'Единое управление способами получения'],
      activityLabel: 'Активность бизнеса',
      chartTitle: 'Динамика платежей',
      period: '7 дней',
      totalVolume: 'Общий объем',
      weekGrowth: '+12% за неделю',
      success: 'Успех',
      excellentYield: 'Отличный результат',
    },
    trust: {
      title: 'Решение остается за вами',
      descriptionA: 'SwimPay готовит платеж к проверке.',
      descriptionB: 'Продавец принимает финальное решение по каждой операции.',
      chips: ['Безопасно', 'Под вашим контролем', 'Только Android'],
    },
    download: {
      titleA: 'Готовы перейти на',
      titleB: 'SwimPay Merchant?',
      description: 'Скачайте официальное приложение и управляйте платежами с полной ясностью.',
      bullets: ['Карта и телефон / SBP на стороне продавца', 'Без платы за установку и подписку', 'Безопасность и приватность в основе приложения'],
      version: 'Merchant APK v1.2.4',
      versionSubtitle: 'Стабильная версия • Прямой APK',
      cta: 'Скачать',
      qrLabel: 'Сканировать с телефона',
      androidSupport: 'Android 12/13/14',
      apkSupport: 'Прямой APK',
    },
    footer: {
      description: 'Понятные полученные платежи. Простой учет. Управляемые доступы бизнеса. Бесплатно для продавцов.',
      privacy: 'Политика конфиденциальности',
      terms: 'Условия использования',
      legal: 'Не связано с официальной банковской системой.',
    },
  },
};

export function resolveLandingLocale(pathname = window.location.pathname): LandingLocale {
  const segment = pathname.split('/').filter(Boolean)[0];
  return isLandingLocale(segment) ? segment : 'fr';
}

export function isLandingLocale(value: unknown): value is LandingLocale {
  return typeof value === 'string' && landingLocales.includes(value as LandingLocale);
}

export function landingLocalePath(locale: LandingLocale): string {
  return `/${locale}/`;
}
