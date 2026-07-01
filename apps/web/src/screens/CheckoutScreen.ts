import { AppShell, Button, escapeHtml } from '../ui/Components.js';
import { checkoutBankLogoDataUri, checkoutBankLogoAssetKeys } from './BankLogoAssets.js';
import type {
  AvailableSenderBank,
  BuyerCheckoutPaymentMethod,
  BuyerSafeReceivingRoute,
  PayerBankLauncherOption,
  ReceiverBankOption,
  ReceivingRouteRailType
} from '@swimpay/contracts';
import type { CheckoutSession, CheckoutRecipient, PayableCurrencyOption, StructuredCheckoutFallbackCode } from '../index.js';

type BuyerCheckoutStep = 'intro' | 'currency' | 'bank' | 'route' | 'launcher' | 'instructions' | 'waiting';
type VisualStage = 'intro' | 'info' | 'instructions' | 'status';
type CheckoutStateTone = 'info' | 'success' | 'warning' | 'danger';
type TimelineState = 'done' | 'active' | 'pending' | 'danger';
type BuyerMethodAvailability = Record<BuyerCheckoutPaymentMethod, boolean>;
export type CheckoutLocale = 'fr' | 'en' | 'ru';
type CheckoutRenderOptions = {
  nativeBankLauncherScheme?: string | undefined;
  nativeReturnScheme?: string | undefined;
  locale?: CheckoutLocale | undefined;
};

interface CheckoutStateView {
  title: string;
  text: string;
  tone: CheckoutStateTone;
}

interface CheckoutCopy {
  pageTitle: string;
  brandSubtitle: string;
  languageLabel: string;
  progressLabel: string;
  progress: [string, string, string, string];
  introTitle: string;
  introText: string;
  featureGuidedLabel: string;
  featureGuidedText: string;
  featureTrackingLabel: string;
  featureTrackingText: string;
  featureReturnLabel: string;
  featureReturnText: string;
  startButton: string;
  trustNetwork: string;
  buyerInfoTitle: string;
  buyerInfoText: string;
  firstNameLabel: string;
  firstNamePlaceholder: string;
  lastNameLabel: string;
  lastNamePlaceholder: string;
  paymentMethodLabel: string;
  cardMethodLabel: string;
  phoneMethodLabel: string;
  senderBankLabel: string;
  senderCardLabel: string;
  senderPhoneLabel: string;
  securityLine: string;
  continueButton: string;
  backHomeButton: string;
  changeMethodTitle: string;
  availableLabel: string;
  unavailableLabel: string;
  manualOpenLabel: string;
  receiverBankTitle: string;
  receiverBankText: string;
  nextArrowLabel: string;
  routeKicker: string;
  routeTitle: string;
  routeText: string;
  recipientPhoneLabel: string;
  recipientCardLabel: string;
  useActionLabel: string;
  launcherKicker: string;
  launcherTitle: string;
  launcherText: string;
  launcherOpenAvailableLabel: string;
  launcherManualInstructionsLabel: string;
  instructionsKicker: string;
  instructionsTitle: string;
  instructionsText: string;
  destinationPhoneLabel: string;
  destinationCardLabel: string;
  destinationPhoneCopyLabel: string;
  destinationCardCopyLabel: string;
  phoneMethodFullLabel: string;
  receivingBankLabel: string;
  senderBankCopyLabel: string;
  amountLabel: string;
  referenceLabel: string;
  activeSessionLabel: string;
  openBankButton: string;
  openConsumerLinkButton: string;
  openBankSrLabel: string;
  copyDetailsButton: string;
  copyDetailsAria: string;
  copyActionLabel: string;
  copySuccessLabel: string;
  copyErrorLabel: string;
  paidButton: string;
  signalNotice: string;
  safeNotice: string;
  retryButton: string;
  contactMerchantButton: string;
  refreshingLabel: string;
  returnToMerchantButton: string;
  timelineLabel: string;
  timelineSearchingSignal: string;
  timelineSignalDetected: string;
  timelineMerchantValidation: string;
  timelinePaymentValidated: string;
  expiredTitle: string;
  expiredText: string;
  rejectedTitle: string;
  rejectedText: string;
  validatedTitle: string;
  validatedText: string;
  merchantValidationTitle: string;
  merchantValidationText: string;
  signalDetectedTitle: string;
  signalDetectedText: string;
  inProgressTitle: string;
  inProgressText: string;
  summaryTitle: string;
  summaryAmountLabel: string;
  summaryDestinationLabel: string;
  summaryBankLabel: string;
  summaryStatusLabel: string;
  paymentUnavailableTitle: string;
  noReceivingMethodText: string;
  refreshButton: string;
  chooseAvailableMethodText: string;
  merchantAcceptsCardText: string;
  merchantAcceptsPhoneText: string;
  payByCardButton: string;
  payByPhoneButton: string;
  refreshMethodsButton: string;
  fallbackDestinationUnavailableTitle: string;
  fallbackAmountUnavailableTitle: string;
  fallbackSelectionIncompleteTitle: string;
  fallbackSessionExpiredTitle: string;
  fallbackMethodUnavailableTitle: string;
  fallbackReceivingRouteUnavailableText: string;
  fallbackAmountLeaseUnavailableText: string;
  fallbackSelectionIncompleteText: string;
  fallbackSessionExpiredText: string;
  recipientMobileMoneyLabel: string;
  destinationMobileMoneyLabel: string;
  destinationMobileMoneyCopyLabel: string;
  mobileMoneyMethodLabel: string;
  recipientWalletLabel: string;
  destinationWalletEmailLabel: string;
  destinationWalletTagLabel: string;
  destinationWalletPhoneLabel: string;
  destinationWalletCopyLabel: string;
  walletMethodLabel: string;
  currencyKicker: string;
  currencyTitle: string;
  currencyText: string;
  payInLabel: string;
  approxBaseLabel: string;
  currentCurrencyBadge: string;
}

const checkoutTranslations: Record<CheckoutLocale, CheckoutCopy> = {
  fr: {
    pageTitle: 'Payer avec SwimPay',
    brandSubtitle: 'Security Engine',
    languageLabel: 'Langue du checkout',
    progressLabel: 'Progression du paiement',
    progress: ['Intro', 'Infos', 'Paiement', 'Suivi'],
    introTitle: 'Simple. Sûr. SwimPay.',
    introText: "Suivez votre paiement bancaire jusqu'à validation.",
    featureGuidedLabel: 'Paiement guidé',
    featureGuidedText: 'Nous vous guidons étape par étape.',
    featureTrackingLabel: 'Suivi en temps réel',
    featureTrackingText: "Suivez l'état du paiement sans quitter le parcours.",
    featureReturnLabel: 'Retour au marchand',
    featureReturnText: 'Retour au marchand après validation finale.',
    startButton: "Commencer l’expérience",
    trustNetwork: 'Réseau de confiance SwimPay',
    buyerInfoTitle: 'Vos informations',
    buyerInfoText: 'Veuillez remplir le formulaire de données ci-dessous',
    firstNameLabel: 'Prenom',
    firstNamePlaceholder: 'Jean',
    lastNameLabel: 'Nom',
    lastNamePlaceholder: 'Dupont',
    paymentMethodLabel: 'Methode de paiement',
    cardMethodLabel: 'Carte',
    phoneMethodLabel: 'Telephone',
    senderBankLabel: 'Moyen de paiement',
    senderCardLabel: "Carte d'envoi",
    senderPhoneLabel: "Telephone d'envoi",
    securityLine: 'SwimPay ne collecte pas vos données sensibles',
    continueButton: 'Continuer',
    backHomeButton: "Retour a l'accueil",
    changeMethodTitle: 'Changer de methode',
    availableLabel: 'Disponible',
    unavailableLabel: 'Indisponible',
    manualOpenLabel: 'Ouverture manuelle possible',
    receiverBankTitle: 'Banque du marchand',
    receiverBankText: 'Choisissez la banque configuree pour recevoir ce paiement.',
    nextArrowLabel: '->',
    routeKicker: 'Instructions de paiement',
    routeTitle: 'Destination',
    routeText: 'Selectionnez la destination compatible avec votre methode.',
    recipientPhoneLabel: 'Telephone du destinataire',
    recipientCardLabel: 'Carte du destinataire',
    useActionLabel: 'Utiliser',
    launcherKicker: 'Details du virement',
    launcherTitle: 'Ouvrir ma banque',
    launcherText: "Choisissez l'application bancaire a ouvrir.",
    launcherOpenAvailableLabel: 'Ouverture si disponible',
    launcherManualInstructionsLabel: 'Instructions manuelles',
    instructionsKicker: 'Instructions de paiement',
    instructionsTitle: 'Details du virement',
    instructionsText: 'Veuillez effectuer le virement avec les details exacts ci-dessous.',
    destinationPhoneLabel: 'Telephone destinataire',
    destinationCardLabel: 'Carte destinataire',
    destinationPhoneCopyLabel: 'Telephone du destinataire',
    destinationCardCopyLabel: 'Carte du destinataire',
    phoneMethodFullLabel: 'Telephone SBP',
    receivingBankLabel: 'Banque de reception',
    senderBankCopyLabel: "Banque d'envoi",
    amountLabel: 'Montant exact',
    referenceLabel: 'Reference',
    activeSessionLabel: 'Session active',
    openBankButton: 'Aller a ma banque',
    openConsumerLinkButton: 'Ouvrir Revolut pre-rempli',
    openBankSrLabel: 'Ouvrir ma banque',
    copyDetailsButton: 'Copier tous les details',
    copyDetailsAria: 'Copier les details',
    copyActionLabel: 'Copier',
    copySuccessLabel: 'Copie',
    copyErrorLabel: 'Erreur',
    paidButton: "J'ai paye",
    signalNotice: 'Signal detecte, en attente de validation marchand.',
    safeNotice: "SwimPay suit le signal cote marchand. Ce n'est pas un recu bancaire officiel.",
    retryButton: 'Reessayer',
    contactMerchantButton: 'Contacter le marchand',
    refreshingLabel: 'Actualisation...',
    returnToMerchantButton: 'Retourner au marchand',
    timelineLabel: 'Suivi du paiement',
    timelineSearchingSignal: 'Recherche du signal',
    timelineSignalDetected: 'Signal detecte',
    timelineMerchantValidation: 'En attente de validation marchand',
    timelinePaymentValidated: 'Paiement confirme',
    expiredTitle: 'Paiement expire',
    expiredText: "Le paiement n'a pas ete valide a temps.",
    rejectedTitle: 'Paiement rejete',
    rejectedText: 'Veuillez reessayer ou contacter le marchand.',
    validatedTitle: 'Paiement confirme',
    validatedText: 'Votre commande peut maintenant etre traitee.',
    merchantValidationTitle: 'Validation marchand',
    merchantValidationText: 'Le marchand verifie ce paiement.',
    signalDetectedTitle: 'Signal detecte',
    signalDetectedText: 'Signal detecte, en attente de validation marchand.',
    inProgressTitle: 'Paiement en cours',
    inProgressText: 'SwimPay suit le signal de paiement cote marchand.',
    summaryTitle: 'Resume',
    summaryAmountLabel: 'Montant',
    summaryDestinationLabel: 'Destination',
    summaryBankLabel: 'Banque',
    summaryStatusLabel: 'Statut',
    paymentUnavailableTitle: 'Paiement indisponible',
    noReceivingMethodText: "Ce marchand n'a pas encore configure de moyen de reception actif.",
    refreshButton: 'Actualiser',
    chooseAvailableMethodText: 'Choisissez une methode disponible.',
    merchantAcceptsCardText: 'Ce marchand accepte actuellement : Carte.',
    merchantAcceptsPhoneText: 'Ce marchand accepte actuellement : SBP / telephone.',
    payByCardButton: 'Payer par carte',
    payByPhoneButton: 'Payer par SBP',
    refreshMethodsButton: 'Actualiser les methodes',
    fallbackDestinationUnavailableTitle: 'Destination indisponible',
    fallbackAmountUnavailableTitle: 'Montant indisponible',
    fallbackSelectionIncompleteTitle: 'Selection incomplete',
    fallbackSessionExpiredTitle: 'Session expiree',
    fallbackMethodUnavailableTitle: 'Methode indisponible',
    fallbackReceivingRouteUnavailableText: "La destination selectionnee n'est plus disponible pour ce paiement.",
    fallbackAmountLeaseUnavailableText: "Le montant exact reserve n'est plus disponible pour cette tentative.",
    fallbackSelectionIncompleteText: 'Des informations de paiement manquent avant de continuer.',
    fallbackSessionExpiredText: 'Cette session de paiement a expire.',
    recipientMobileMoneyLabel: 'Compte mobile money',
    destinationMobileMoneyLabel: 'Numéro mobile money',
    destinationMobileMoneyCopyLabel: 'Numéro mobile money',
    mobileMoneyMethodLabel: 'Mobile money',
    recipientWalletLabel: 'Wallet du marchand',
    destinationWalletEmailLabel: 'E-mail du wallet',
    destinationWalletTagLabel: 'Tag du wallet',
    destinationWalletPhoneLabel: 'Numéro lié au wallet',
    destinationWalletCopyLabel: 'Identifiant du wallet',
    walletMethodLabel: 'Wallet international',
    currencyKicker: 'Devise',
    currencyTitle: 'Choisissez votre devise de paiement',
    currencyText: 'Le montant est converti au taux du jour.',
    payInLabel: 'Payer',
    approxBaseLabel: '≈',
    currentCurrencyBadge: 'Actuelle',
  },
  en: {
    pageTitle: 'Pay with SwimPay',
    brandSubtitle: 'Security Engine',
    languageLabel: 'Checkout language',
    progressLabel: 'Payment progress',
    progress: ['Intro', 'Info', 'Payment', 'Tracking'],
    introTitle: 'Simple. Safe. SwimPay.',
    introText: 'Track your bank payment until final validation.',
    featureGuidedLabel: 'Guided payment',
    featureGuidedText: 'We guide you step by step.',
    featureTrackingLabel: 'Real-time tracking',
    featureTrackingText: 'Track payment status without leaving the flow.',
    featureReturnLabel: 'Return to merchant',
    featureReturnText: 'Return to the merchant after final validation.',
    startButton: 'Start experience',
    trustNetwork: 'SwimPay trust network',
    buyerInfoTitle: 'Your information',
    buyerInfoText: 'Fill in the payment recognition form below',
    firstNameLabel: 'First name',
    firstNamePlaceholder: 'John',
    lastNameLabel: 'Last name',
    lastNamePlaceholder: 'Smith',
    paymentMethodLabel: 'Payment method',
    cardMethodLabel: 'Card',
    phoneMethodLabel: 'Phone',
    senderBankLabel: 'Payment app',
    senderCardLabel: 'Sending card',
    senderPhoneLabel: 'Sending phone',
    securityLine: 'SwimPay does not collect sensitive payment data',
    continueButton: 'Continue',
    backHomeButton: 'Back to start',
    changeMethodTitle: 'Change method',
    availableLabel: 'Available',
    unavailableLabel: 'Unavailable',
    manualOpenLabel: 'Manual opening available',
    receiverBankTitle: 'Merchant bank',
    receiverBankText: 'Choose the bank configured to receive this payment.',
    nextArrowLabel: '->',
    routeKicker: 'Payment instructions',
    routeTitle: 'Destination',
    routeText: 'Select the destination compatible with your method.',
    recipientPhoneLabel: 'Recipient phone',
    recipientCardLabel: 'Recipient card',
    useActionLabel: 'Use',
    launcherKicker: 'Transfer details',
    launcherTitle: 'Open my bank',
    launcherText: 'Choose the banking app to open.',
    launcherOpenAvailableLabel: 'Opens if available',
    launcherManualInstructionsLabel: 'Manual instructions',
    instructionsKicker: 'Payment instructions',
    instructionsTitle: 'Transfer details',
    instructionsText: 'Make the transfer with the exact details below.',
    destinationPhoneLabel: 'Recipient phone',
    destinationCardLabel: 'Recipient card',
    destinationPhoneCopyLabel: 'Recipient phone',
    destinationCardCopyLabel: 'Recipient card',
    phoneMethodFullLabel: 'SBP phone',
    receivingBankLabel: 'Receiving bank',
    senderBankCopyLabel: 'Sending bank',
    amountLabel: 'Exact amount',
    referenceLabel: 'Reference',
    activeSessionLabel: 'Active session',
    openBankButton: 'Go to my bank',
    openConsumerLinkButton: 'Open Revolut prefilled',
    openBankSrLabel: 'Open my bank',
    copyDetailsButton: 'Copy all details',
    copyDetailsAria: 'Copy details',
    copyActionLabel: 'Copy',
    copySuccessLabel: 'Copied',
    copyErrorLabel: 'Error',
    paidButton: 'I have paid',
    signalNotice: 'Signal detected, waiting for merchant validation.',
    safeNotice: 'SwimPay tracks the merchant-side payment signal. This is not an official bank receipt.',
    retryButton: 'Try again',
    contactMerchantButton: 'Contact merchant',
    refreshingLabel: 'Refreshing...',
    returnToMerchantButton: 'Return to merchant',
    timelineLabel: 'Payment tracking',
    timelineSearchingSignal: 'Searching for signal',
    timelineSignalDetected: 'Signal detected',
    timelineMerchantValidation: 'Waiting for merchant validation',
    timelinePaymentValidated: 'Payment validated',
    expiredTitle: 'Payment expired',
    expiredText: 'The payment was not validated in time.',
    rejectedTitle: 'Payment rejected',
    rejectedText: 'Try again or contact the merchant.',
    validatedTitle: 'Payment validated',
    validatedText: 'Your order can now be processed.',
    merchantValidationTitle: 'Merchant validation',
    merchantValidationText: 'The merchant is reviewing this payment.',
    signalDetectedTitle: 'Signal detected',
    signalDetectedText: 'Signal detected, waiting for merchant validation.',
    inProgressTitle: 'Payment in progress',
    inProgressText: 'SwimPay is tracking the merchant-side payment signal.',
    summaryTitle: 'Summary',
    summaryAmountLabel: 'Amount',
    summaryDestinationLabel: 'Destination',
    summaryBankLabel: 'Bank',
    summaryStatusLabel: 'Status',
    paymentUnavailableTitle: 'Payment unavailable',
    noReceivingMethodText: 'This merchant has not configured an active receiving method yet.',
    refreshButton: 'Refresh',
    chooseAvailableMethodText: 'Choose an available method.',
    merchantAcceptsCardText: 'This merchant currently accepts: Card.',
    merchantAcceptsPhoneText: 'This merchant currently accepts: SBP / phone.',
    payByCardButton: 'Pay by card',
    payByPhoneButton: 'Pay by SBP',
    refreshMethodsButton: 'Refresh methods',
    fallbackDestinationUnavailableTitle: 'Destination unavailable',
    fallbackAmountUnavailableTitle: 'Amount unavailable',
    fallbackSelectionIncompleteTitle: 'Selection incomplete',
    fallbackSessionExpiredTitle: 'Session expired',
    fallbackMethodUnavailableTitle: 'Method unavailable',
    fallbackReceivingRouteUnavailableText: 'The selected destination is no longer available for this payment.',
    fallbackAmountLeaseUnavailableText: 'The reserved exact amount is no longer available for this attempt.',
    fallbackSelectionIncompleteText: 'Payment information is missing before continuing.',
    fallbackSessionExpiredText: 'This payment session has expired.',
    recipientMobileMoneyLabel: 'Mobile money account',
    destinationMobileMoneyLabel: 'Mobile money number',
    destinationMobileMoneyCopyLabel: 'Mobile money number',
    mobileMoneyMethodLabel: 'Mobile money',
    recipientWalletLabel: 'Merchant wallet',
    destinationWalletEmailLabel: 'Wallet email',
    destinationWalletTagLabel: 'Wallet tag',
    destinationWalletPhoneLabel: 'Wallet phone number',
    destinationWalletCopyLabel: 'Wallet identifier',
    walletMethodLabel: 'International wallet',
    currencyKicker: 'Currency',
    currencyTitle: 'Choose your payment currency',
    currencyText: 'Amount is converted at today\'s exchange rate.',
    payInLabel: 'Pay',
    approxBaseLabel: '≈',
    currentCurrencyBadge: 'Current',
  },
  ru: {
    pageTitle: 'Оплатить через SwimPay',
    brandSubtitle: 'Security Engine',
    languageLabel: 'Язык чекаута',
    progressLabel: 'Ход оплаты',
    progress: ['Вход', 'Данные', 'Платеж', 'Статус'],
    introTitle: 'Просто. Безопасно. SwimPay.',
    introText: 'Следите за банковским платежом до финальной проверки.',
    featureGuidedLabel: 'Понятная оплата',
    featureGuidedText: 'Мы ведем вас шаг за шагом.',
    featureTrackingLabel: 'Статус в реальном времени',
    featureTrackingText: 'Следите за статусом платежа в одном сценарии.',
    featureReturnLabel: 'Возврат к продавцу',
    featureReturnText: 'Возврат к продавцу после финальной проверки.',
    startButton: 'Начать',
    trustNetwork: 'Доверенный контур SwimPay',
    buyerInfoTitle: 'Ваши данные',
    buyerInfoText: 'Заполните форму для распознавания платежа',
    firstNameLabel: 'Имя',
    firstNamePlaceholder: 'Иван',
    lastNameLabel: 'Фамилия',
    lastNamePlaceholder: 'Иванов',
    paymentMethodLabel: 'Способ оплаты',
    cardMethodLabel: 'Карта',
    phoneMethodLabel: 'Телефон',
    senderBankLabel: 'Приложение оплаты',
    senderCardLabel: 'Карта отправителя',
    senderPhoneLabel: 'Телефон отправителя',
    securityLine: 'SwimPay не собирает чувствительные платежные данные',
    continueButton: 'Продолжить',
    backHomeButton: 'Назад к началу',
    changeMethodTitle: 'Изменить способ',
    availableLabel: 'Доступно',
    unavailableLabel: 'Недоступно',
    manualOpenLabel: 'Можно открыть вручную',
    receiverBankTitle: 'Банк продавца',
    receiverBankText: 'Выберите банк, настроенный для приема этого платежа.',
    nextArrowLabel: '->',
    routeKicker: 'Инструкция по оплате',
    routeTitle: 'Получатель',
    routeText: 'Выберите реквизиты, совместимые с вашим способом оплаты.',
    recipientPhoneLabel: 'Телефон получателя',
    recipientCardLabel: 'Карта получателя',
    useActionLabel: 'Выбрать',
    launcherKicker: 'Детали перевода',
    launcherTitle: 'Открыть банк',
    launcherText: 'Выберите банковское приложение.',
    launcherOpenAvailableLabel: 'Откроется при доступности',
    launcherManualInstructionsLabel: 'Ручная инструкция',
    instructionsKicker: 'Инструкция по оплате',
    instructionsTitle: 'Детали перевода',
    instructionsText: 'Выполните перевод точно по данным ниже.',
    destinationPhoneLabel: 'Телефон получателя',
    destinationCardLabel: 'Карта получателя',
    destinationPhoneCopyLabel: 'Телефон получателя',
    destinationCardCopyLabel: 'Карта получателя',
    phoneMethodFullLabel: 'Телефон СБП',
    receivingBankLabel: 'Банк получателя',
    senderBankCopyLabel: 'Банк отправителя',
    amountLabel: 'Точная сумма',
    referenceLabel: 'Назначение',
    activeSessionLabel: 'Активная сессия',
    openBankButton: 'Перейти в банк',
    openConsumerLinkButton: 'Открыть Revolut с реквизитами',
    openBankSrLabel: 'Открыть банк',
    copyDetailsButton: 'Скопировать все данные',
    copyDetailsAria: 'Скопировать данные',
    copyActionLabel: 'Скопировать',
    copySuccessLabel: 'Скопировано',
    copyErrorLabel: 'Ошибка',
    paidButton: 'Я оплатил',
    signalNotice: 'Сигнал обнаружен, ожидается проверка продавцом.',
    safeNotice: 'SwimPay отслеживает сигнал на стороне продавца. Это не официальная банковская квитанция.',
    retryButton: 'Повторить',
    contactMerchantButton: 'Связаться с продавцом',
    refreshingLabel: 'Обновление...',
    returnToMerchantButton: 'Вернуться к продавцу',
    timelineLabel: 'Отслеживание платежа',
    timelineSearchingSignal: 'Поиск сигнала',
    timelineSignalDetected: 'Сигнал обнаружен',
    timelineMerchantValidation: 'Ожидание проверки продавцом',
    timelinePaymentValidated: 'Платеж проверен',
    expiredTitle: 'Платеж истек',
    expiredText: 'Платеж не был проверен вовремя.',
    rejectedTitle: 'Платеж отклонен',
    rejectedText: 'Повторите попытку или свяжитесь с продавцом.',
    validatedTitle: 'Платеж проверен',
    validatedText: 'Заказ можно обрабатывать.',
    merchantValidationTitle: 'Проверка продавцом',
    merchantValidationText: 'Продавец проверяет этот платеж.',
    signalDetectedTitle: 'Сигнал обнаружен',
    signalDetectedText: 'Сигнал обнаружен, ожидается проверка продавцом.',
    inProgressTitle: 'Платеж в процессе',
    inProgressText: 'SwimPay отслеживает платежный сигнал на стороне продавца.',
    summaryTitle: 'Сводка',
    summaryAmountLabel: 'Сумма',
    summaryDestinationLabel: 'Получатель',
    summaryBankLabel: 'Банк',
    summaryStatusLabel: 'Статус',
    paymentUnavailableTitle: 'Оплата недоступна',
    noReceivingMethodText: 'Продавец еще не настроил активный способ приема платежа.',
    refreshButton: 'Обновить',
    chooseAvailableMethodText: 'Выберите доступный способ.',
    merchantAcceptsCardText: 'Продавец сейчас принимает: карта.',
    merchantAcceptsPhoneText: 'Продавец сейчас принимает: СБП / телефон.',
    payByCardButton: 'Оплатить картой',
    payByPhoneButton: 'Оплатить через СБП',
    refreshMethodsButton: 'Обновить способы',
    fallbackDestinationUnavailableTitle: 'Получатель недоступен',
    fallbackAmountUnavailableTitle: 'Сумма недоступна',
    fallbackSelectionIncompleteTitle: 'Выбор не завершен',
    fallbackSessionExpiredTitle: 'Сессия истекла',
    fallbackMethodUnavailableTitle: 'Способ недоступен',
    fallbackReceivingRouteUnavailableText: 'Выбранные реквизиты больше недоступны для этого платежа.',
    fallbackAmountLeaseUnavailableText: 'Зарезервированная точная сумма больше недоступна для этой попытки.',
    fallbackSelectionIncompleteText: 'Перед продолжением не хватает платежных данных.',
    fallbackSessionExpiredText: 'Эта платежная сессия истекла.',
    recipientMobileMoneyLabel: 'Счёт mobile money',
    destinationMobileMoneyLabel: 'Номер mobile money',
    destinationMobileMoneyCopyLabel: 'Номер mobile money',
    mobileMoneyMethodLabel: 'Mobile money',
    recipientWalletLabel: 'Кошелёк продавца',
    destinationWalletEmailLabel: 'E-mail кошелька',
    destinationWalletTagLabel: 'Тег кошелька',
    destinationWalletPhoneLabel: 'Номер кошелька',
    destinationWalletCopyLabel: 'Идентификатор кошелька',
    walletMethodLabel: 'Международный кошелёк',
    currencyKicker: 'Валюта',
    currencyTitle: 'Выберите валюту платежа',
    currencyText: 'Сумма конвертируется по курсу дня.',
    payInLabel: 'Оплатить',
    approxBaseLabel: '≈',
    currentCurrencyBadge: 'Текущая',
  },
};

export function resolveCheckoutLocale(query: unknown): CheckoutLocale {
  if (!query || typeof query !== 'object' || Array.isArray(query)) return 'fr';
  const value = (query as { lang?: unknown }).lang;
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === 'en' || candidate === 'ru' || candidate === 'fr' ? candidate : 'fr';
}

export function renderCheckoutPage(
  session: CheckoutSession,
  _recipient: CheckoutRecipient,
  banks: readonly ReceiverBankOption[],
  routes: readonly BuyerSafeReceivingRoute[],
  launchers: readonly PayerBankLauncherOption[],
  displayStatus: string,
  options: CheckoutRenderOptions = {},
  payableCurrencies?: readonly PayableCurrencyOption[] | undefined
): string {
  const locale = options.locale ?? 'fr';
  const copy = checkoutTranslations[locale];
  const renderOptions: CheckoutRenderOptions = { ...options, locale };
  const visibleRoutes = filterRoutesForSession(routes, session.payment_method);
  const selectedRoute = visibleRoutes.find((route) => route.route_id === session.selected_receiving_route_id);
  const selectedLauncher = launchers.find((launcher) => launcher.payer_bank_launcher_id === session.selected_payer_bank_launcher_id);
  const methodAvailability = getBuyerMethodAvailability(session, banks, routes);
  const step = resolveCheckoutStep(session);
  const stage = visualStageForStep(step);

  return AppShell({
    title: copy.pageTitle,
    chrome: 'checkout',
    children: `<section class="screen buyer-checkout checkout-screen-shell" data-current-stage="${stage}" data-copy-success-label="${escapeHtml(copy.copySuccessLabel)}" data-copy-error-label="${escapeHtml(copy.copyErrorLabel)}">
      <div class="checkout-shell-inner">
        ${renderCheckoutBrand(copy, locale, renderOptions)}
        ${renderSegmentProgress(stage, copy)}
        <div class="checkout-flow" data-checkout-stage-host>
          ${renderCurrentStage(step, session, displayStatus, banks, visibleRoutes, selectedRoute, selectedLauncher, launchers, methodAvailability, renderOptions, copy, payableCurrencies)}
        </div>
        ${renderCheckoutTrustFooter()}
      </div>
    </section>
    ${buyerCheckoutStyles()}
    ${buyerCheckoutScript()}`
  });
}

function renderCurrentStage(
  step: BuyerCheckoutStep,
  session: CheckoutSession,
  displayStatus: string,
  banks: readonly ReceiverBankOption[],
  visibleRoutes: readonly BuyerSafeReceivingRoute[],
  selectedRoute: BuyerSafeReceivingRoute | undefined,
  selectedLauncher: PayerBankLauncherOption | undefined,
  launchers: readonly PayerBankLauncherOption[],
  methodAvailability: BuyerMethodAvailability,
  options: CheckoutRenderOptions,
  copy: CheckoutCopy,
  payableCurrencies?: readonly PayableCurrencyOption[] | undefined
): string {
  if (step === 'intro') return renderIntroFlow(session, banks, launchers, methodAvailability, options, copy);
  if (step === 'currency') return renderCurrencySelectionStep(session, payableCurrencies ?? [], options, copy);
  if (step === 'bank') return renderReceiverBankSelection(session, banks, options, copy);
  if (step === 'route') return renderReceivingRouteSelection(session, banks, visibleRoutes, launchers, methodAvailability, options, copy);
  if (step === 'launcher') return renderPayerLauncherSelection(session, banks, selectedRoute, launchers, methodAvailability, options, copy);
  if (step === 'instructions') return renderInstructionsStep(session, banks, selectedRoute, selectedLauncher, launchers, methodAvailability, options, copy);
  return renderWaitingStatusStep(session, displayStatus, selectedRoute, selectedLauncher, copy);
}

function resolveCheckoutStep(session: CheckoutSession): BuyerCheckoutStep {
  if (isFinalBuyerState(session)) return 'waiting';
  if (hasStructuredCheckoutFallback(session)) return 'route';
  const canonical = canonicalStepFromCheckoutState(session);
  if (canonical) return canonical;
  if (!session.payment_method) return 'intro';
  if (!session.selected_receiver_bank_id) return 'bank';
  if (!session.selected_receiving_route_id) return 'route';
  if (!session.selected_payer_bank_launcher_id) return 'launcher';
  return 'instructions';
}

function canonicalStepFromCheckoutState(session: CheckoutSession): BuyerCheckoutStep | null {
  switch (session.checkout_state) {
    case 'buyer_identity':
      return 'intro';
    case 'currency_selection':
      return 'currency';
    case 'receiver_bank_selection':
      return 'bank';
    case 'receiving_route_selection':
      return 'route';
    case 'payer_bank_launcher_selection':
      return 'launcher';
    case 'payment_instructions':
    case 'awaiting_payment':
      return 'instructions';
    case 'buyer_claimed_paid':
    case 'signal_detected':
    case 'needs_review':
    case 'confirmed':
    case 'expired':
    case 'rejected':
      return 'waiting';
    default:
      return null;
  }
}

function visualStageForStep(step: BuyerCheckoutStep): VisualStage {
  // Four real phases the buyer traverses: intro (1) -> info/pay + details (2) -> instructions (3)
  // -> status (4). The selection screens (currency/bank/route/launcher) are all "gathering the
  // payment details" and share phase 2 — most are auto-skipped anyway (single-option) — so the
  // active segment advances to 3 exactly when the buyer reaches the transfer instructions, rather
  // than sitting on one segment across several screens.
  if (step === 'intro') return 'intro';
  if (step === 'currency' || step === 'bank' || step === 'route' || step === 'launcher') return 'info';
  if (step === 'instructions') return 'instructions';
  return 'status';
}

function filterRoutesForSession(
  routes: readonly BuyerSafeReceivingRoute[],
  paymentMethod: CheckoutSession['payment_method']
): readonly BuyerSafeReceivingRoute[] {
  if (paymentMethod === 'card') return routes.filter((route) => route.rail_type === 'card_transfer');
  if (paymentMethod === 'sbp') return routes.filter((route) => route.rail_type === 'phone_transfer');
  if (paymentMethod === 'mobile_money') return routes.filter((route) => route.rail_type === 'mobile_money');
  if (paymentMethod === 'wallet') return routes.filter((route) => route.rail_type === 'wallet_transfer');
  return routes;
}

interface RailDescriptor {
  icon: 'phone' | 'card' | 'mobile' | 'wallet';
  recipientLabel: string;
  destinationLabel: string;
  destinationCopyLabel: string;
  methodLabel: string;
}

/** Per-rail rendering descriptor — the single source for icons and labels at the
 * route-selection, instructions and preview render points. */
function railDescriptor(
  route: Pick<BuyerSafeReceivingRoute, 'rail_type' | 'receiver_identifier_type'>,
  copy: CheckoutCopy
): RailDescriptor {
  switch (route.rail_type) {
    case 'phone_transfer':
      return {
        icon: 'phone',
        recipientLabel: copy.recipientPhoneLabel,
        destinationLabel: copy.destinationPhoneLabel,
        destinationCopyLabel: copy.destinationPhoneCopyLabel,
        methodLabel: copy.phoneMethodFullLabel
      };
    case 'mobile_money':
      return {
        icon: 'mobile',
        recipientLabel: copy.recipientMobileMoneyLabel,
        destinationLabel: copy.destinationMobileMoneyLabel,
        destinationCopyLabel: copy.destinationMobileMoneyCopyLabel,
        methodLabel: copy.mobileMoneyMethodLabel
      };
    case 'wallet_transfer': {
      const destinationLabel =
        route.receiver_identifier_type === 'tag'
          ? copy.destinationWalletTagLabel
          : route.receiver_identifier_type === 'phone'
            ? copy.destinationWalletPhoneLabel
            : copy.destinationWalletEmailLabel;
      return {
        icon: 'wallet',
        recipientLabel: copy.recipientWalletLabel,
        destinationLabel,
        destinationCopyLabel: copy.destinationWalletCopyLabel,
        methodLabel: copy.walletMethodLabel
      };
    }
    default:
      return {
        icon: 'card',
        recipientLabel: copy.recipientCardLabel,
        destinationLabel: copy.destinationCardLabel,
        destinationCopyLabel: copy.destinationCardCopyLabel,
        methodLabel: copy.cardMethodLabel
      };
  }
}

function getBuyerMethodAvailability(
  session: CheckoutSession,
  banks: readonly ReceiverBankOption[],
  routes: readonly BuyerSafeReceivingRoute[]
): BuyerMethodAvailability {
  if (session.available_payment_methods) {
    const methods = session.available_payment_methods;
    return { card: methods.card, sbp: methods.sbp, mobile_money: methods.mobile_money ?? false, wallet: methods.wallet ?? false };
  }
  const rails = new Set<ReceivingRouteRailType>();
  for (const bank of banks) {
    for (const rail of bank.rail_types ?? []) {
      rails.add(rail);
    }
  }
  for (const route of routes) {
    rails.add(route.rail_type);
  }
  return {
    card: rails.has('card_transfer'),
    sbp: rails.has('phone_transfer'),
    mobile_money: rails.has('mobile_money'),
    wallet: rails.has('wallet_transfer')
  };
}

function hasReceivingMethod(availability: BuyerMethodAvailability): boolean {
  return availability.card || availability.sbp || availability.mobile_money || availability.wallet;
}

function hasStructuredCheckoutFallback(session: CheckoutSession): boolean {
  return Boolean(session.checkout_error_code || session.unavailable_reason);
}

function getSelectedBuyerMethod(
  session: CheckoutSession,
  availability: BuyerMethodAvailability
): BuyerCheckoutPaymentMethod {
  if (session.payment_method && availability[session.payment_method]) {
    return session.payment_method;
  }
  // Default to the first available method — never hard-default to 'sbp', or an XOF/USD checkout
  // (mobile_money/wallet only) would submit sbp and be rejected ("XOF not supported for sbp").
  return (['card', 'sbp', 'mobile_money', 'wallet'] as const).find((method) => availability[method]) ?? 'sbp';
}

function isFinalBuyerState(session: CheckoutSession): boolean {
  const safeStatus = session.buyer_safe_status as string | undefined;
  if (safeStatus && ['confirmed', 'rejected', 'expired', 'cancelled'].includes(safeStatus)) {
    return true;
  }
  return ['manual_confirmed', 'fulfilled', 'rejected', 'expired'].includes(session.status);
}

function renderCheckoutBrand(
  copy: CheckoutCopy,
  locale: CheckoutLocale,
  options: CheckoutRenderOptions
): string {
  return `<header class="checkout-brand" aria-label="SwimPay">
    <div class="checkout-brand-main">
      <div class="checkout-brand-mark">${swimPayLauncherSymbolSvg()}</div>
      <div class="checkout-brand-copy">
        <strong>SwimPay</strong>
        <span>${escapeHtml(copy.brandSubtitle)}</span>
      </div>
    </div>
    ${renderCheckoutLanguageSelector(locale, copy, options)}
  </header>`;
}

function renderCheckoutLanguageSelector(
  currentLocale: CheckoutLocale,
  copy: CheckoutCopy,
  options: CheckoutRenderOptions
): string {
  const locales: CheckoutLocale[] = ['fr', 'en', 'ru'];
  return `<nav class="checkout-language-selector" aria-label="${escapeHtml(copy.languageLabel)}">
    ${locales.map((locale) => {
      const isActive = locale === currentLocale;
      return `<a href="${escapeHtml(buildCheckoutLanguageHref(locale, options))}" hreflang="${locale}" lang="${locale}" class="${isActive ? 'selected' : ''}" aria-current="${isActive ? 'true' : 'false'}">${locale.toUpperCase()}</a>`;
    }).join('')}
  </nav>`;
}

function buildCheckoutLanguageHref(
  locale: CheckoutLocale,
  options: CheckoutRenderOptions
): string {
  const params = new URLSearchParams({ lang: locale });
  if (options.nativeBankLauncherScheme) params.set('swimpay_bank_launcher_scheme', options.nativeBankLauncherScheme);
  if (options.nativeReturnScheme) params.set('swimpay_return_scheme', options.nativeReturnScheme);
  return `?${params.toString()}`;
}

function renderSegmentProgress(stage: VisualStage, copy: CheckoutCopy): string {
  const current = stageIndex(stage);
  const labels = copy.progress;
  return `<nav class="checkout-progress" data-progress-bar data-active-step="${current}" aria-label="${escapeHtml(copy.progressLabel)}">
    ${labels.map((label, index) => {
      const segmentState = index + 1 <= current ? 'active' : 'pending';
      return `<span class="checkout-progress-segment checkout-progress-${segmentState}" aria-label="${escapeHtml(label)}"></span>`;
    }).join('')}
  </nav>`;
}

function stageIndex(stage: VisualStage): number {
  if (stage === 'intro') return 1;
  if (stage === 'info') return 2;
  if (stage === 'instructions') return 3;
  return 4;
}

function renderIntroFlow(
  session: CheckoutSession,
  banks: readonly ReceiverBankOption[],
  launchers: readonly PayerBankLauncherOption[],
  methodAvailability: BuyerMethodAvailability,
  options: CheckoutRenderOptions = {},
  copy?: CheckoutCopy
): string {
  if (!hasReceivingMethod(methodAvailability)) {
    return renderNoReceivingMethodsFallback(session, false, copy ?? checkoutTranslations.fr, options);
  }
  return `<div class="checkout-stage-host">
    ${renderIntroStep(copy ?? checkoutTranslations.fr)}
    ${renderBuyerIdentityStep(session, banks, launchers, methodAvailability, true, copy?.buyerInfoTitle ?? 'Vos informations', options, copy ?? checkoutTranslations.fr)}
  </div>`;
}

function renderIntroStep(copy: CheckoutCopy): string {
  return `<section class="checkout-stage-card checkout-intro-card" data-checkout-panel="intro" data-visual-stage="intro">
    <div class="checkout-stage-icon">${swimPayWavesSvg()}</div>
    <div class="checkout-stage-head checkout-stage-head-center">
      <p class="checkout-kicker">SwimPay</p>
      <h1>${escapeHtml(copy.introTitle)}</h1>
      <p>${escapeHtml(copy.introText)}</p>
    </div>
    <div class="checkout-feature-list">
      ${renderFeature('card', copy.featureGuidedLabel, copy.featureGuidedText)}
      ${renderFeature('clock', copy.featureTrackingLabel, copy.featureTrackingText)}
      ${renderFeature('return', copy.featureReturnLabel, copy.featureReturnText)}
    </div>
    <button class="checkout-primary-action checkout-next" type="button" data-show-panel="buyer-identity" data-progress-step="2">${escapeHtml(copy.startButton)}</button>
    <p class="checkout-network-note"><span></span> ${escapeHtml(copy.trustNetwork)}</p>
  </section>`;
}

function renderFeature(icon: 'card' | 'clock' | 'return', label: string, text: string): string {
  return `<article class="checkout-feature-card">
    <span class="checkout-feature-icon">${iconSvg(icon)}</span>
    <div>
      <strong>${escapeHtml(label)}</strong>
      <small>${escapeHtml(text)}</small>
    </div>
  </article>`;
}

function renderBuyerIdentityStep(
  session: CheckoutSession,
  banks: readonly ReceiverBankOption[],
  launchers: readonly PayerBankLauncherOption[],
  methodAvailability: BuyerMethodAvailability,
  hidden = false,
  title = 'Vos informations',
  options: CheckoutRenderOptions = {},
  copy: CheckoutCopy = checkoutTranslations.fr
): string {
  if (!hasReceivingMethod(methodAvailability)) {
    return renderNoReceivingMethodsFallback(session, hidden, copy, options);
  }
  const selectedMethod = getSelectedBuyerMethod(session, methodAvailability);
  // The method toggle is only a genuine choice when BOTH card and SBP are available (the RU case).
  // For single-method currencies (XOF mobile_money, USD wallet, or a card-only / sbp-only merchant)
  // the method is implied by the currency/route — render no toggle, submit it via a hidden field,
  // and show only that method's sender field (wallet has none).
  const showMethodToggle = methodAvailability.card && methodAvailability.sbp;
  const impliedMethodInput = showMethodToggle
    ? ''
    : `<input type="hidden" name="payment_method" value="${escapeHtml(selectedMethod)}">`;
  const isMethodActive = (method: BuyerCheckoutPaymentMethod): boolean => selectedMethod === method;
  const cardActive = isMethodActive('card');
  const sbpActive = isMethodActive('sbp');
  const mobileMoneyActive = isMethodActive('mobile_money');
  return `<section class="checkout-stage-card checkout-info-card" data-checkout-panel="buyer-identity" ${hidden ? 'hidden' : ''} data-visual-stage="info">
    <div class="checkout-stage-head">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(copy.buyerInfoText)}</p>
    </div>
    <form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/expected-payment-profile" class="expected-profile-form">
      ${renderCheckoutHiddenInputs(options)}
      ${impliedMethodInput}
      <div class="checkout-input-grid">
        ${renderTextInput(copy.firstNameLabel, 'buyer_first_name', copy.firstNamePlaceholder, 'given-name')}
        ${renderTextInput(copy.lastNameLabel, 'buyer_last_name', copy.lastNamePlaceholder, 'family-name')}
      </div>
      ${showMethodToggle ? `<div class="checkout-field-block">
        <span class="checkout-field-label">${escapeHtml(copy.paymentMethodLabel)}</span>
        <div class="method-toggle" role="radiogroup" aria-label="${escapeHtml(copy.paymentMethodLabel)}">
          ${renderPaymentMethodCard('card', copy.cardMethodLabel, 'card', cardActive, true, copy)}
          ${renderPaymentMethodCard('sbp', copy.phoneMethodLabel, 'phone', sbpActive, true, copy)}
        </div>
      </div>` : ''}
      ${renderSenderBankSelector(session, launchers, copy)}
      <div class="method-field-stack">
        ${methodAvailability.card ? `<label class="checkout-field" data-method-field="card" ${cardActive ? '' : 'hidden'}>${escapeHtml(copy.senderCardLabel)}
          <input name="sender_card_number" inputmode="numeric" autocomplete="cc-number" placeholder="4242 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull;" ${cardActive ? '' : 'disabled'}>
        </label>` : ''}
        ${methodAvailability.sbp ? `<label class="checkout-field" data-method-field="sbp" ${sbpActive ? '' : 'hidden'}>${escapeHtml(copy.senderPhoneLabel)}
          <input name="sender_phone" type="tel" autocomplete="tel" placeholder="+7 ..." ${sbpActive ? '' : 'disabled'}>
        </label>` : ''}
        ${methodAvailability.mobile_money ? `<label class="checkout-field" data-method-field="mobile_money" ${mobileMoneyActive ? '' : 'hidden'}>${escapeHtml(copy.senderPhoneLabel)}
          <input name="sender_phone" type="tel" autocomplete="tel" placeholder="+225 ..." ${mobileMoneyActive ? '' : 'disabled'}>
        </label>` : ''}
      </div>
      <p class="checkout-security-line"><span></span> ${escapeHtml(copy.securityLine)}</p>
      <button class="checkout-primary-action" type="submit">${escapeHtml(copy.continueButton)}</button>
      <button class="checkout-ghost-action" type="button" data-show-panel="intro" data-progress-step="1">${escapeHtml(copy.backHomeButton)}</button>
    </form>
  </section>`;
}

function renderSenderBankSelector(session: CheckoutSession, launchers: readonly PayerBankLauncherOption[], copy: CheckoutCopy = checkoutTranslations.fr): string {
  const senderBanks = resolveSenderBankChoices(session, launchers);
  const selected = resolveSelectedSenderBankId(session, senderBanks);
  return `<div class="checkout-field-block">
    <span class="checkout-field-label">${escapeHtml(copy.senderBankLabel)}</span>
    <div class="sender-bank-selector" role="radiogroup" aria-label="${escapeHtml(copy.senderBankLabel)}">
      ${senderBanks.map((bank) => {
        const active = bank.sender_bank_id === selected;
        const logoAssetKey = bank.logo_asset_key ?? bankLogoAssetKey(bank.sender_bank_id);
        const selectable = bank.selectable !== false;
        return `<label class="sender-bank-choice ${active ? 'selected' : ''}" data-sender-bank-choice="${escapeHtml(bank.sender_bank_id)}" data-logo-asset-key="${escapeHtml(logoAssetKey)}">
          <input type="radio" name="sender_bank_id" value="${escapeHtml(bank.sender_bank_id)}" ${active ? 'checked' : ''} ${selectable ? '' : 'disabled'} required>
          ${renderBankLogoMark(logoAssetKey, bank.display_name)}
          <span>
            <strong>${escapeHtml(bank.display_name)}</strong>
            <small>${senderBankStatusLabel(bank, copy)}</small>
          </span>
        </label>`;
      }).join('')}
    </div>
  </div>`;
}

interface SenderBankChoice {
  sender_bank_id: string;
  display_name: string;
  logo_asset_key?: string | undefined;
  selectable?: boolean | undefined;
  runtime_capture_status?: AvailableSenderBank['runtime_capture_status'] | undefined;
}

function resolveSenderBankChoices(
  session: CheckoutSession,
  launchers: readonly PayerBankLauncherOption[]
): readonly SenderBankChoice[] {
  if (session.available_sender_banks && session.available_sender_banks.length > 0) {
    return session.available_sender_banks.map((bank) => ({
      sender_bank_id: bank.payer_bank_launcher_id ?? bank.bank_id,
      display_name: bank.display_name,
      logo_asset_key: bank.logo_asset_key,
      selectable: bank.selectable,
      runtime_capture_status: bank.runtime_capture_status
    }));
  }
  return launchers.map((launcher) => ({
    sender_bank_id: launcher.payer_bank_launcher_id,
    display_name: launcher.display_name,
    logo_asset_key: bankLogoAssetKey(launcher.payer_bank_launcher_id),
    selectable: true,
    runtime_capture_status: launcher.runtime_verified ? 'runtime_verified' : 'observed'
  }));
}

function resolveSelectedSenderBankId(
  session: CheckoutSession,
  senderBanks: readonly SenderBankChoice[]
): string {
  if (session.sender_bank_id && senderBanks.some((bank) => bank.sender_bank_id === session.sender_bank_id && bank.selectable !== false)) {
    return session.sender_bank_id;
  }
  return senderBanks.find((bank) => bank.selectable !== false)?.sender_bank_id ?? senderBanks[0]?.sender_bank_id ?? '';
}

function senderBankStatusLabel(bank: SenderBankChoice, copy: CheckoutCopy = checkoutTranslations.fr): string {
  if (bank.selectable === false) {
    return escapeHtml(copy.unavailableLabel);
  }
  if (bank.runtime_capture_status === 'runtime_verified') {
    return escapeHtml(copy.availableLabel);
  }
  // No "manual open" status line — it read as a limitation to buyers; every listed app is usable.
  return '';
}

function renderTextInput(label: string, name: string, placeholder: string, autocomplete: string): string {
  return `<label class="checkout-field">${escapeHtml(label)}
    <input name="${escapeHtml(name)}" autocomplete="${escapeHtml(autocomplete)}" placeholder="${escapeHtml(placeholder)}" required>
  </label>`;
}

function renderPaymentMethodCard(
  value: BuyerCheckoutPaymentMethod,
  label: string,
  icon: 'card' | 'phone' | 'mobile' | 'wallet',
  selected: boolean,
  submitsValue = true,
  copy: CheckoutCopy = checkoutTranslations.fr
): string {
  const inputAttributes = [
    'type="radio"',
    submitsValue ? 'name="payment_method"' : '',
    `value="${value}"`,
    selected ? 'checked' : ''
  ].filter(Boolean).join(' ');
  return `<label class="payment-method-card ${selected ? 'selected' : ''}" data-payment-method="${value}">
    <input ${inputAttributes}>
    <span class="payment-method-icon">${iconSvg(icon)}</span>
    <strong>${escapeHtml(label)}</strong>
    <small>${escapeHtml(`${label} ${copy.availableLabel.toLowerCase()}`)}</small>
  </label>`;
}

function bankLogoAssetKey(bankId: string): string {
  switch (bankId) {
    case 'sber_ru':
      return 'ic_bank_sberbank';
    case 'tbank_ru':
      return 'ic_bank_tbank';
    case 'vtb_ru':
      return 'ic_bank_vtb';
    case 'alfa_ru':
      return 'ic_bank_alfa';
    case 'gazprombank_ru':
      return 'ic_bank_gazprombank';
    case 'ozon_bank':
      return 'ic_bank_ozon';
    // West-Africa mobile money + international wallets — real app logos, not letter avatars.
    case 'wave_ci':
      return 'ic_bank_wave';
    case 'orange_money_ci':
    case 'orange_money_sn':
      return 'ic_bank_orange_money';
    case 'mtn_momo_ci':
      return 'ic_bank_mtn_momo';
    case 'moov_money_ci':
      return 'ic_bank_moov';
    case 'djamo_ci':
      return 'ic_bank_djamo';
    case 'ecobank_ci':
      return 'ic_bank_ecobank';
    case 'sg_connect_ci':
      return 'ic_bank_sg';
    case 'wise_int':
      return 'ic_bank_wise';
    case 'revolut_int':
      return 'ic_bank_revolut';
    case 'payoneer_int':
      return 'ic_bank_payoneer';
    default:
      return 'ic_bank_unknown';
  }
}

function renderBankLogoMark(logoAssetKey: string, displayName: string): string {
  const initials = logoAssetKey === 'ic_bank_ozon' ? 'OZ' : displayName.slice(0, 1);
  const hasImage = Boolean(checkoutBankLogoDataUri(logoAssetKey));
  return `<span class="bank-logo-mark bank-logo-${escapeHtml(logoAssetKey)}${hasImage ? ' bank-logo-image' : ''}" data-logo-asset-key="${escapeHtml(logoAssetKey)}" role="img" aria-label="${escapeHtml(displayName)}"><span aria-hidden="true">${escapeHtml(initials)}</span></span>`;
}

function renderCurrencySelectionStep(
  session: CheckoutSession,
  currencies: readonly PayableCurrencyOption[],
  options: CheckoutRenderOptions = {},
  copy: CheckoutCopy = checkoutTranslations.fr
): string {
  return `<section class="checkout-stage-card checkout-info-card" data-visual-stage="info">
    <div class="checkout-stage-head">
      <p class="checkout-kicker">${escapeHtml(copy.currencyKicker)}</p>
      <h1>${escapeHtml(copy.currencyTitle)}</h1>
      <p>${escapeHtml(copy.currencyText)}</p>
    </div>
    <div class="checkout-option-list">${currencies.map((option) => {
      const baseAmount = session.base_amount;
      const showApprox = option.quote && baseAmount && (option.currency !== baseAmount.currency);
      return `<form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/currency" class="selection-form">
        ${renderCheckoutHiddenInputs(options)}
        <input type="hidden" name="currency" value="${escapeHtml(option.currency)}">
        <button class="checkout-option-card" type="submit">
          <span class="checkout-option-copy">
            <strong>${escapeHtml(copy.payInLabel)} ${escapeHtml(option.formatted)}</strong>
            ${showApprox ? `<small>${escapeHtml(copy.approxBaseLabel)} ${escapeHtml(baseAmount!.value)} ${escapeHtml(baseAmount!.currency)}</small>` : ''}
          </span>
          ${option.is_current ? `<span class="checkout-current-badge">${escapeHtml(copy.currentCurrencyBadge)}</span>` : `<span class="checkout-option-arrow">${escapeHtml(copy.nextArrowLabel)}</span>`}
        </button>
      </form>`;
    }).join('')}</div>
  </section>`;
}

interface ChoiceCardOptions {
  action: string;
  hiddenInputs: readonly { name: string; value: string }[];
  /** A bank/app logo mark (mutually exclusive with methodIcon). */
  logoAssetKey?: string | undefined;
  /** A method glyph, used when there is no bank logo (mutually exclusive with logoAssetKey). */
  methodIcon?: 'card' | 'phone' | 'mobile' | 'wallet' | undefined;
  title: string;
  /** When true the title is already trusted markup (copy constants); otherwise it is escaped. */
  titleIsSafe?: boolean | undefined;
  subtitle: string;
  trailingLabel: string;
  disabled?: boolean | undefined;
  extraCardClass?: string | undefined;
  renderOptions: CheckoutRenderOptions;
}

/** Single selectable card shared by the receiver-bank, receiving-route and payer-launcher
 * lists — one consistent markup (logo/icon + strong title + small subtitle + trailing action)
 * so the three lists no longer drift. Each caller supplies its own form action, hidden inputs,
 * disabled state and trailing label; the data attributes and classes are preserved verbatim so
 * existing tests and client JS keep working. */
function renderChoiceCard(opts: ChoiceCardOptions): string {
  const mark = opts.logoAssetKey
    ? renderBankLogoMark(opts.logoAssetKey, opts.title)
    : `<span class="checkout-option-icon">${iconSvg(opts.methodIcon ?? 'card')}</span>`;
  const cardClass = `checkout-option-card${opts.extraCardClass ? ` ${opts.extraCardClass}` : ''}`;
  const titleHtml = opts.titleIsSafe ? opts.title : escapeHtml(opts.title);
  return `<form method="post" action="${escapeHtml(opts.action)}" class="selection-form">
    ${renderCheckoutHiddenInputs(opts.renderOptions)}
    ${opts.hiddenInputs.map((input) => `<input type="hidden" name="${escapeHtml(input.name)}" value="${escapeHtml(input.value)}">`).join('')}
    <button class="${cardClass}" type="submit" ${opts.disabled ? 'disabled' : ''}>
      ${mark}
      <span class="checkout-option-copy">
        <strong>${titleHtml}</strong>
        <small>${escapeHtml(opts.subtitle)}</small>
      </span>
      <span class="checkout-option-arrow">${escapeHtml(opts.trailingLabel)}</span>
    </button>
  </form>`;
}

function renderReceiverBankSelection(
  session: CheckoutSession,
  banks: readonly ReceiverBankOption[],
  options: CheckoutRenderOptions = {},
  copy: CheckoutCopy = checkoutTranslations.fr
): string {
  return `<section class="checkout-stage-card checkout-info-card" data-visual-stage="info">
    <div class="checkout-stage-head">
      <h1>${escapeHtml(copy.receiverBankTitle)}</h1>
      <p>${escapeHtml(copy.receiverBankText)}</p>
    </div>
    <div class="checkout-option-list">${banks.map((bank) => {
      const available = (bank.available_route_count ?? 0) > 0;
      return renderChoiceCard({
        action: `/checkout/${session.payment_session_id}/receiver-bank`,
        hiddenInputs: [{ name: 'receiver_bank_id', value: bank.receiver_bank_id }],
        logoAssetKey: bank.logo_asset_key,
        title: bank.display_name,
        subtitle: available ? copy.availableLabel : copy.unavailableLabel,
        trailingLabel: copy.nextArrowLabel,
        disabled: !available,
        renderOptions: options
      });
    }).join('')}</div>
  </section>`;
}

function renderReceivingRouteSelection(
  session: CheckoutSession,
  banks: readonly ReceiverBankOption[],
  routes: readonly BuyerSafeReceivingRoute[],
  launchers: readonly PayerBankLauncherOption[],
  methodAvailability: BuyerMethodAvailability,
  options: CheckoutRenderOptions = {},
  copy: CheckoutCopy = checkoutTranslations.fr
): string {
  if (hasStructuredCheckoutFallback(session) || routes.length === 0) {
    return `<div class="checkout-stage-host">
      ${renderStructuredFallback(session, methodAvailability, copy, options)}
      ${renderBuyerIdentityStep(session, banks, launchers, methodAvailability, false, copy.changeMethodTitle, options, copy)}
    </div>`;
  }

  return `<section class="checkout-stage-card" data-visual-stage="instructions">
    <div class="checkout-stage-head">
      <p class="checkout-kicker">${escapeHtml(copy.routeKicker)}</p>
      <h1>${escapeHtml(copy.routeTitle)}</h1>
      <p>${escapeHtml(copy.routeText)}</p>
    </div>
    <div class="checkout-option-list">${routes.map((route) => {
      const descriptor = railDescriptor(route, copy);
      return renderChoiceCard({
        action: `/checkout/${session.payment_session_id}/receiving-route`,
        hiddenInputs: [{ name: 'receiving_route_id', value: route.route_id }],
        logoAssetKey: bankLogoAssetKey(route.bank_profile_id),
        title: descriptor.recipientLabel,
        subtitle: route.receiver_identifier_masked,
        trailingLabel: copy.useActionLabel,
        extraCardClass: 'route-option-card',
        renderOptions: options
      });
    }).join('')}</div>
  </section>`;
}

function renderPayerLauncherSelection(
  session: CheckoutSession,
  banks: readonly ReceiverBankOption[],
  selectedRoute: BuyerSafeReceivingRoute | undefined,
  launchers: readonly PayerBankLauncherOption[],
  methodAvailability: BuyerMethodAvailability,
  options: CheckoutRenderOptions = {},
  copy: CheckoutCopy = checkoutTranslations.fr
): string {
  if (!selectedRoute) {
    return `<div class="checkout-stage-host">
      ${renderStructuredFallback(session, methodAvailability, copy, options)}
      ${renderBuyerIdentityStep(session, banks, launchers, methodAvailability, false, copy.changeMethodTitle, options, copy)}
    </div>`;
  }

  const orderedLaunchers = orderLaunchers(launchers, session.sender_bank_id);
  return `<section class="checkout-stage-card" data-visual-stage="instructions">
    <div class="checkout-stage-head">
      <p class="checkout-kicker">${escapeHtml(copy.launcherKicker)}</p>
      <h1>${escapeHtml(copy.launcherTitle)}</h1>
      <p>${escapeHtml(copy.launcherText)}</p>
    </div>
    ${renderInstructionPreview(session, selectedRoute, copy)}
    <div class="checkout-option-list">${orderedLaunchers.map((launcher) => renderChoiceCard({
      action: `/checkout/${session.payment_session_id}/payer-bank-launcher`,
      hiddenInputs: [{ name: 'payer_bank_launcher_id', value: launcher.payer_bank_launcher_id }],
      logoAssetKey: bankLogoAssetKey(launcher.payer_bank_launcher_id),
      title: launcher.display_name,
      subtitle: launcher.launch_url ? copy.launcherOpenAvailableLabel : copy.launcherManualInstructionsLabel,
      trailingLabel: copy.nextArrowLabel,
      renderOptions: options
    })).join('')}</div>
  </section>`;
}

function renderInstructionsStep(
  session: CheckoutSession,
  banks: readonly ReceiverBankOption[],
  selectedRoute: BuyerSafeReceivingRoute | undefined,
  selectedLauncher: PayerBankLauncherOption | undefined,
  launchers: readonly PayerBankLauncherOption[],
  methodAvailability: BuyerMethodAvailability,
  options: { nativeBankLauncherScheme?: string | undefined; nativeReturnScheme?: string | undefined },
  copy: CheckoutCopy = checkoutTranslations.fr
): string {
  if (!selectedRoute) {
    return `<div class="checkout-stage-host">
      ${renderStructuredFallback(session, methodAvailability, copy, options)}
      ${renderBuyerIdentityStep(session, banks, launchers, methodAvailability, false, copy.changeMethodTitle, options, copy)}
    </div>`;
  }

  const descriptor = railDescriptor(selectedRoute, copy);
  const amount = session.payable_amount ?? session.amount;
  const baseAmount = session.base_amount;
  const showApprox = baseAmount && baseAmount.currency !== amount.currency;
  const amountDisplay = showApprox
    ? `${amount.value} ${amount.currency} ${copy.approxBaseLabel} ${baseAmount!.value} ${baseAmount!.currency}`
    : `${amount.value} ${amount.currency}`;
  const destinationLabel = descriptor.destinationLabel;
  const destinationCopyLabel = descriptor.destinationCopyLabel;
  const methodLabel = descriptor.methodLabel;
  const receiverBank = banks.find((bank) => bank.bank_profile_id === selectedRoute.bank_profile_id);
  const bankLabel = receiverBank?.display_name ?? copy.receivingBankLabel;
  const receiverBankLogoAssetKey = receiverBank?.logo_asset_key ?? bankLogoAssetKey(selectedRoute.bank_profile_id);
  const senderBankLabel = selectedLauncher?.display_name ?? session.sender_bank_name ?? copy.senderBankCopyLabel;
  const senderBankLogoAssetKey = selectedLauncher
    ? bankLogoAssetKey(selectedLauncher.payer_bank_launcher_id)
    : session.sender_bank_logo_asset_key ?? (session.sender_bank_id ? bankLogoAssetKey(session.sender_bank_id) : 'ic_bank_unknown');
  const bankLaunchUrl = resolveBankLaunchUrl(selectedLauncher, options.nativeBankLauncherScheme);
  // A personal-tier consumer link (e.g. a Revolut revtag) opens the payer's app already
  // addressed to the merchant. Eligibility mirrors buildReceiverConsumerLink; the actual link
  // is fetched from the reveal endpoint on click (the plaintext handle stays reveal-gated).
  const consumerLinkEligible =
    selectedRoute.bank_profile_id === 'revolut_int' && selectedRoute.receiver_identifier_type === 'tag';
  const checkoutReturnPath = checkoutPathWithOptions(session.payment_session_id, options);
  const summary = [
    `${copy.amountLabel}: ${amountDisplay}`,
    `${copy.referenceLabel}: ${session.reference}`,
    `${destinationCopyLabel}: ${selectedRoute.receiver_identifier_masked}`,
    `${copy.receivingBankLabel}: ${bankLabel}`,
    `${copy.senderBankCopyLabel}: ${htmlToPlainText(senderBankLabel)}`
  ].join('\\n');

  return `<section class="checkout-stage-card checkout-instructions-card" data-visual-stage="instructions">
    <div class="checkout-stage-head checkout-stage-head-center">
      <p class="checkout-kicker">${escapeHtml(copy.instructionsKicker)}</p>
      <h1>${escapeHtml(copy.instructionsTitle)}</h1>
      <p>${escapeHtml(copy.instructionsText)}</p>
    </div>
    <div class="checkout-session-pill">
      <span><i></i> ${escapeHtml(copy.activeSessionLabel)}</span>
      <strong data-countdown-target="${escapeHtml(session.expires_at)}">--:--</strong>
    </div>
    <div class="payment-details-card">
      ${renderCopyablePaymentRow(copy.amountLabel, amountDisplay, `${amount.value} ${amount.currency}`, false, undefined, undefined, copy)}
      ${renderCopyablePaymentRow(copy.referenceLabel, session.reference, session.reference, false, undefined, undefined, copy)}
      ${renderCopyablePaymentRow(destinationLabel, selectedRoute.receiver_identifier_masked, '', true, session.payment_session_id, destinationCopyLabel, copy)}
      ${renderCopyableBankRow(copy.receivingBankLabel, bankLabel, bankLabel, receiverBankLogoAssetKey, copy)}
      ${renderCopyableBankRow(copy.senderBankCopyLabel, senderBankLabel, htmlToPlainText(senderBankLabel), senderBankLogoAssetKey, copy)}
      ${renderCopyablePaymentRow(copy.paymentMethodLabel, methodLabel, methodLabel, false, undefined, undefined, copy)}
    </div>
    <div class="instruction-actions">
      <form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/continue-to-bank" data-bank-launch-form data-launch-url="${escapeHtml(bankLaunchUrl)}" data-checkout-url="${escapeHtml(checkoutReturnPath)}" data-selected-sender-bank-id="${escapeHtml(session.sender_bank_id ?? selectedLauncher?.payer_bank_launcher_id ?? '')}" data-payer-bank-launcher-id="${escapeHtml(selectedLauncher?.payer_bank_launcher_id ?? '')}">
        ${renderCheckoutHiddenInputs(options)}
        <button class="checkout-primary-action" type="submit">${escapeHtml(copy.openBankButton)} ${iconSvg('external')}<span class="sr-only">${escapeHtml(copy.openBankSrLabel)}</span></button>
      </form>
      ${consumerLinkEligible ? `<button class="checkout-secondary-action" type="button" data-open-consumer-link="${escapeHtml(session.payment_session_id)}">${escapeHtml(copy.openConsumerLinkButton)} ${iconSvg('external')}</button>` : ''}
      <button class="checkout-secondary-action" type="button" data-copy-value="${escapeHtml(summary)}" aria-label="${escapeHtml(copy.copyDetailsAria)}">${escapeHtml(copy.copyDetailsButton)}</button>
      <form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/claimed-paid">
        ${renderCheckoutHiddenInputs(options)}
        ${Button({ text: copy.paidButton, id: 'paid-button', variant: 'ghost', class: 'checkout-ghost-action checkout-paid-action', type: 'submit' })}
      </form>
    </div>
  </section>`;
}

function renderCopyableBankRow(
  label: string,
  displayValue: string,
  copyValue: string,
  logoAssetKey: string,
  copy: CheckoutCopy = checkoutTranslations.fr
): string {
  return `<div class="payment-row payment-row-bank" data-logo-asset-key="${escapeHtml(logoAssetKey)}">
    <span>${escapeHtml(label)}</span>
    <strong>${renderBankLogoMark(logoAssetKey, displayValue)}${escapeHtml(displayValue)}</strong>
    <button class="copy-icon-btn" type="button" data-copy-value="${escapeHtml(copyValue)}" aria-label="${escapeHtml(`${copy.copyActionLabel} ${label}`)}">${iconSvg('copy')}</button>
  </div>`;
}

function htmlToPlainText(value: string): string {
  return value.replace(/&#39;/gu, "'");
}

function renderNoReceivingMethodsFallback(
  session: CheckoutSession,
  hidden = false,
  copy: CheckoutCopy = checkoutTranslations.fr,
  options: CheckoutRenderOptions = {}
): string {
  return `<section class="checkout-stage-card checkout-empty-card checkout-configuration-card" data-checkout-panel="buyer-identity" ${hidden ? 'hidden' : ''} data-visual-stage="info">
    <div class="checkout-stage-icon">!</div>
    <h1>${escapeHtml(copy.paymentUnavailableTitle)}</h1>
    <p>${escapeHtml(copy.noReceivingMethodText)}</p>
    <div class="checkout-empty-actions">
      <a class="checkout-secondary-action" href="${escapeHtml(checkoutPathWithOptions(session.payment_session_id, options))}">${escapeHtml(copy.refreshButton)}</a>
      ${renderReturnToMerchantAction(session, copy)}
    </div>
  </section>`;
}

function renderStructuredFallback(
  session: CheckoutSession,
  methodAvailability: BuyerMethodAvailability,
  copy: CheckoutCopy = checkoutTranslations.fr,
  options: CheckoutRenderOptions = {}
): string {
  const hasCard = methodAvailability.card;
  const hasSbp = methodAvailability.sbp;
  const availableText = hasCard && hasSbp
    ? copy.chooseAvailableMethodText
    : hasCard
      ? copy.merchantAcceptsCardText
      : hasSbp
        ? copy.merchantAcceptsPhoneText
        : copy.noReceivingMethodText;
  const fallbackActions = getFallbackActions(session, methodAvailability);
  const actions = [
    fallbackActions.has('switch_to_card') && hasCard
      ? `<button class="checkout-primary-action" type="button" data-show-panel="buyer-identity" data-progress-step="2" data-select-method="card">${escapeHtml(copy.payByCardButton)}</button>`
      : '',
    fallbackActions.has('switch_to_sbp') && hasSbp
      ? `<button class="checkout-primary-action" type="button" data-show-panel="buyer-identity" data-progress-step="2" data-select-method="sbp">${escapeHtml(copy.payByPhoneButton)}</button>`
      : '',
    fallbackActions.has('refresh_methods')
      ? `<a class="checkout-secondary-action" href="${escapeHtml(checkoutPathWithOptions(session.payment_session_id, options))}">${escapeHtml(copy.refreshMethodsButton)}</a>`
      : '',
    fallbackActions.has('return_to_merchant') ? renderReturnToMerchantAction(session, copy) : ''
  ].filter(Boolean).join('');
  const title = checkoutFallbackTitle(session.checkout_error_code, methodAvailability, copy);
  const explanation = checkoutFallbackExplanation(session.checkout_error_code, copy);

  return `<section class="checkout-stage-card checkout-empty-card checkout-configuration-card" data-visual-stage="instructions">
    <div class="checkout-stage-icon">!</div>
    <h1>${escapeHtml(title)}</h1>
    ${explanation ? `<p>${escapeHtml(explanation)}</p>` : ''}
    <p>${availableText}</p>
    <div class="checkout-empty-actions">${actions}</div>
  </section>`;
}

function checkoutFallbackTitle(
  code: StructuredCheckoutFallbackCode | undefined,
  methodAvailability: BuyerMethodAvailability,
  copy: CheckoutCopy = checkoutTranslations.fr
): string {
  if (code === 'receiving_route_unavailable') return copy.fallbackDestinationUnavailableTitle;
  if (code === 'amount_lease_unavailable') return copy.fallbackAmountUnavailableTitle;
  if (code === 'checkout_selection_incomplete') return copy.fallbackSelectionIncompleteTitle;
  if (code === 'checkout_session_expired') return copy.fallbackSessionExpiredTitle;
  if (!hasReceivingMethod(methodAvailability)) return copy.paymentUnavailableTitle;
  return copy.fallbackMethodUnavailableTitle;
}

function checkoutFallbackExplanation(code: StructuredCheckoutFallbackCode | undefined, copy: CheckoutCopy = checkoutTranslations.fr): string {
  if (code === 'receiving_route_unavailable') {
    return copy.fallbackReceivingRouteUnavailableText;
  }
  if (code === 'amount_lease_unavailable') {
    return copy.fallbackAmountLeaseUnavailableText;
  }
  if (code === 'checkout_selection_incomplete') {
    return copy.fallbackSelectionIncompleteText;
  }
  if (code === 'checkout_session_expired') {
    return copy.fallbackSessionExpiredText;
  }
  return '';
}

function getFallbackActions(
  session: CheckoutSession,
  methodAvailability: BuyerMethodAvailability
): Set<string> {
  const actions = session.fallback_actions && session.fallback_actions.length > 0
    ? session.fallback_actions
    : [
        methodAvailability.card ? 'switch_to_card' : '',
        methodAvailability.sbp ? 'switch_to_sbp' : '',
        'refresh_methods',
        'return_to_merchant'
      ];
  return new Set(actions.filter(Boolean));
}

function renderReturnToMerchantAction(session: CheckoutSession, copy: CheckoutCopy = checkoutTranslations.fr): string {
  const returnUrl = resolveBuyerReturnUrl(session);
  if (returnUrl) {
    return `<a class="checkout-ghost-action" href="${escapeHtml(returnUrl)}">${escapeHtml(copy.featureReturnLabel)}</a>`;
  }
  return `<a class="checkout-ghost-action" href="${escapeHtml(checkoutStableReturnFallbackUrl(session))}">${escapeHtml(copy.featureReturnLabel)}</a>`;
}

function renderCheckoutHiddenInputs(options: CheckoutRenderOptions = {}): string {
  return [
    `<input type="hidden" name="swimpay_return_scheme" value="${escapeHtml(options.nativeReturnScheme ?? '')}">`,
    `<input type="hidden" name="lang" value="${escapeHtml(options.locale ?? 'fr')}">`
  ].join('');
}

function checkoutPathWithOptions(paymentSessionId: string, options: CheckoutRenderOptions = {}): string {
  const base = `/checkout/${encodeURIComponent(paymentSessionId)}`;
  const params = new URLSearchParams();
  if (options.locale && options.locale !== 'fr') {
    params.set('lang', options.locale);
  }
  if (options.nativeReturnScheme) {
    params.set('swimpay_return_scheme', options.nativeReturnScheme);
  }
  if (options.nativeBankLauncherScheme) {
    params.set('swimpay_bank_launcher_scheme', options.nativeBankLauncherScheme);
  }
  const query = params.toString();
  return `${base}${query ? `?${query}` : ''}`;
}

function resolveBuyerReturnUrl(session: CheckoutSession): string | undefined {
  if (!session.return_url || !isSafeBuyerReturnUrl(session.return_url)) {
    return undefined;
  }
  return session.return_url;
}

function checkoutStableReturnFallbackUrl(session: CheckoutSession): string {
  const params = new URLSearchParams({
    payment_session_id: session.payment_session_id,
    order_id: session.order_id
  });
  if (session.external_id) {
    params.set('external_id', session.external_id);
  }
  return `/merchant/return-unavailable?${params.toString()}`;
}

function isSafeBuyerReturnUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const protocol = url.protocol.replace(/:$/u, '').toLowerCase();
    if (['javascript', 'data', 'file', 'content', 'intent', 'android-app'].includes(protocol)) {
      return false;
    }
    if (protocol === 'http') {
      return false;
    }
    if (protocol === 'https') {
      const hostname = url.hostname.toLowerCase();
      if (hostname.startsWith('api.') || url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) {
        return false;
      }
      return true;
    }
    return /^[a-z][a-z0-9+.-]{1,40}$/iu.test(protocol);
  } catch {
    return false;
  }
}

function renderCopyablePaymentRow(
  label: string,
  displayValue: string,
  copyValue: string,
  destination = false,
  paymentSessionId = '',
  ariaLabel = label,
  copy: CheckoutCopy = checkoutTranslations.fr
): string {
  const attr = destination
    ? `data-copy-destination="${escapeHtml(paymentSessionId)}"`
    : `data-copy-value="${escapeHtml(copyValue)}"`;
  // The destination is the merchant account the payer must send to — it is meant to be shared,
  // not a secret. Show it in full: data-destination-reveal lets the client replace the masked
  // value with the real one on load, so the number is readable and copyable, never struck out.
  const strongAttr = destination && paymentSessionId ? ` data-destination-reveal="${escapeHtml(paymentSessionId)}"` : '';
  return `<div class="payment-row">
    <span>${escapeHtml(label)}</span>
    <strong${strongAttr}>${escapeHtml(displayValue)}</strong>
    <button class="copy-icon-btn" type="button" ${attr} aria-label="${escapeHtml(`${copy.copyActionLabel} ${ariaLabel}`)}">${iconSvg('copy')}</button>
  </div>`;
}

function renderInstructionPreview(
  session: CheckoutSession,
  selectedRoute: BuyerSafeReceivingRoute,
  copy: CheckoutCopy = checkoutTranslations.fr
): string {
  const amount = session.payable_amount ?? session.amount;
  const baseAmount = session.base_amount;
  const showApprox = baseAmount && baseAmount.currency !== amount.currency;
  const destinationLabel = railDescriptor(selectedRoute, copy).destinationLabel;
  return `<div class="instruction-preview">
    <div><span>${escapeHtml(copy.amountLabel)}</span><strong>${escapeHtml(amount.value)} ${escapeHtml(amount.currency)}${showApprox ? ` <small>${escapeHtml(copy.approxBaseLabel)} ${escapeHtml(baseAmount!.value)} ${escapeHtml(baseAmount!.currency)}</small>` : ''}</strong></div>
    <div><span>${escapeHtml(copy.referenceLabel)}</span><strong>${escapeHtml(session.reference)}</strong></div>
    <div><span>${destinationLabel}</span><strong>${escapeHtml(selectedRoute.receiver_identifier_masked)}</strong></div>
  </div>`;
}

function renderWaitingStatusStep(
  session: CheckoutSession,
  displayStatus: string,
  selectedRoute: BuyerSafeReceivingRoute | undefined,
  selectedLauncher: PayerBankLauncherOption | undefined,
  copy: CheckoutCopy = checkoutTranslations.fr
): string {
  const state = checkoutStateView(session, copy);
  return `<section class="checkout-stage-card checkout-status-card buyer-state-${state.tone}" data-visual-stage="status" data-checkout-status-poll-url="/checkout/${escapeHtml(session.payment_session_id)}/status" data-checkout-current-status="${escapeHtml(session.status)}" data-checkout-current-safe-status="${escapeHtml(session.buyer_safe_status ?? '')}">
    <div class="checkout-stage-head">
      <h1>${escapeHtml(state.title)}</h1>
      <p>${escapeHtml(state.text)}</p>
    </div>
    ${renderPaymentTimeline(session, copy)}
    ${renderStatusMessage(session, copy)}
    ${renderStatusSummary(session, displayStatus, selectedRoute, selectedLauncher, copy)}
    ${renderWaitingAction(session, copy)}
  </section>`;
}

function renderStatusMessage(session: CheckoutSession, copy: CheckoutCopy = checkoutTranslations.fr): string {
  if (session.status === 'signal_detected' || session.status === 'matching' || session.status === 'needs_review') {
    return `<div class="checkout-signal-notice">${escapeHtml(copy.signalNotice)}</div>`;
  }
  return `<div class="checkout-safe-notice">
    <span class="checkout-info-icon">i</span>
    <p>${escapeHtml(copy.safeNotice)}</p>
  </div>`;
}

function renderWaitingAction(session: CheckoutSession, copy: CheckoutCopy = checkoutTranslations.fr): string {
  if (session.status === 'manual_confirmed' || session.status === 'fulfilled') {
    return renderReturnToMerchantPrimaryAction(session, copy);
  }
  if (session.status === 'expired') {
    return `<a class="checkout-primary-action" href="/checkout/${escapeHtml(session.payment_session_id)}">${escapeHtml(copy.retryButton)}</a>`;
  }
  if (session.status === 'rejected') {
    return `<a class="checkout-secondary-action" href="${escapeHtml(checkoutStableReturnFallbackUrl(session))}">${escapeHtml(copy.contactMerchantButton)}</a>`;
  }
  return `<a class="checkout-secondary-action checkout-refresh-action" href="/checkout/${escapeHtml(session.payment_session_id)}"><span></span>${escapeHtml(copy.refreshingLabel)}</a>`;
}

function renderReturnToMerchantPrimaryAction(session: CheckoutSession, copy: CheckoutCopy = checkoutTranslations.fr): string {
  const returnUrl = resolveBuyerReturnUrl(session);
  if (returnUrl) {
    return `<a class="checkout-primary-action" href="${escapeHtml(returnUrl)}">${escapeHtml(copy.returnToMerchantButton)} <span aria-hidden="true">-&gt;</span></a>`;
  }
  return `<a class="checkout-primary-action" href="${escapeHtml(checkoutStableReturnFallbackUrl(session))}">${escapeHtml(copy.returnToMerchantButton)} <span aria-hidden="true">-&gt;</span></a>`;
}

function renderPaymentTimeline(session: CheckoutSession, copy: CheckoutCopy = checkoutTranslations.fr): string {
  const confirmed = session.status === 'manual_confirmed' || session.status === 'fulfilled';
  const rejectedOrExpired = session.status === 'rejected' || session.status === 'expired';
  const signal = ['signal_detected', 'matching', 'needs_review', 'manual_confirmed', 'fulfilled'].includes(session.status);
  const review = ['needs_review', 'manual_confirmed', 'fulfilled'].includes(session.status);
  const claimedPaid = ['buyer_claimed_paid', 'signal_detected', 'matching', 'needs_review', 'manual_confirmed', 'fulfilled'].includes(session.status);
  const items: Array<[string, TimelineState]> = [
    [copy.timelineSearchingSignal, signal || review || confirmed ? 'done' : rejectedOrExpired ? 'danger' : claimedPaid ? 'active' : 'pending'],
    [copy.timelineSignalDetected, signal || review || confirmed ? 'done' : 'pending'],
    [copy.timelineMerchantValidation, confirmed ? 'done' : review ? 'active' : 'pending'],
    [copy.timelinePaymentValidated, confirmed ? 'done' : rejectedOrExpired ? 'danger' : 'pending']
  ];

  return `<div class="payment-timeline" aria-label="${escapeHtml(copy.timelineLabel)}">
    ${items.map(([label, state]) => `<div class="timeline-item timeline-${state}">
      <span>${state === 'done' ? iconSvg('check') : ''}</span><strong>${escapeHtml(label)}</strong>
    </div>`).join('')}
  </div>`;
}

function checkoutStateView(session: CheckoutSession, copy: CheckoutCopy = checkoutTranslations.fr): CheckoutStateView {
  const safe = session.buyer_safe_status;
  if (session.status === 'expired' || safe === 'expired') {
    return { title: copy.expiredTitle, text: copy.expiredText, tone: 'warning' };
  }
  if (session.status === 'rejected' || safe === 'rejected') {
    return { title: copy.rejectedTitle, text: copy.rejectedText, tone: 'danger' };
  }
  if (session.status === 'manual_confirmed' || session.status === 'fulfilled' || safe === 'confirmed') {
    return { title: copy.validatedTitle, text: copy.validatedText, tone: 'success' };
  }
  if (session.status === 'needs_review' || session.status === 'matching' || safe === 'needs_review') {
    return { title: copy.merchantValidationTitle, text: copy.merchantValidationText, tone: 'warning' };
  }
  if (session.status === 'signal_detected' || safe === 'signal_detected') {
    return { title: copy.signalDetectedTitle, text: copy.signalDetectedText, tone: 'info' };
  }
  return { title: copy.inProgressTitle, text: copy.inProgressText, tone: 'info' };
}

function renderStatusSummary(
  session: CheckoutSession,
  displayStatus: string,
  selectedRoute: BuyerSafeReceivingRoute | undefined,
  selectedLauncher: PayerBankLauncherOption | undefined,
  copy: CheckoutCopy = checkoutTranslations.fr
): string {
  const amount = session.payable_amount ?? session.amount;
  return `<div class="checkout-status-summary">
    <h2>${escapeHtml(copy.summaryTitle)}</h2>
    ${renderSummaryRow(copy.summaryAmountLabel, `${amount.value} ${amount.currency}`)}
    ${renderSummaryRow(copy.referenceLabel, session.reference)}
    ${selectedRoute ? renderSummaryRow(copy.summaryDestinationLabel, selectedRoute.receiver_identifier_masked) : ''}
    ${selectedLauncher ? renderSummaryRow(copy.summaryBankLabel, selectedLauncher.display_name) : ''}
    <div class="summary-row"><span>${escapeHtml(copy.summaryStatusLabel)}</span><strong class="summary-pill">${escapeHtml(displayStatus)}</strong></div>
  </div>`;
}

function renderSummaryRow(label: string, value: string): string {
  return `<div class="summary-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderCheckoutTrustFooter(): string {
  return `<footer class="checkout-trust-footer">
    <div class="checkout-trust-badge">${iconSvg('shield')} Secured by SwimPay Cloud</div>
    <p>&copy; 2026 SwimPay Technologies Inc. All rights reserved.</p>
  </footer>`;
}

function bankLogoImageStyles(): string {
  // Emit the background-image rule for EVERY bundled logo (RU banks + WA mobile money + wallets),
  // not a hardcoded RU-only list — otherwise Wave/Orange/MTN/Wise render as letter avatars.
  return checkoutBankLogoAssetKeys.map((logoAssetKey) => {
    const dataUri = checkoutBankLogoDataUri(logoAssetKey);
    if (!dataUri) return '';
    return `.bank-logo-${logoAssetKey} { background-image: url("${dataUri.replaceAll('QR', 'Q\\52 ')}"); }`;
  }).filter(Boolean).join('\n');
}

function orderLaunchers(
  launchers: readonly PayerBankLauncherOption[],
  selectedBankId: string | undefined
): readonly PayerBankLauncherOption[] {
  if (!selectedBankId) return launchers;
  return [...launchers].sort((a, b) => {
    if (a.payer_bank_launcher_id === selectedBankId) return -1;
    if (b.payer_bank_launcher_id === selectedBankId) return 1;
    return a.display_name.localeCompare(b.display_name);
  });
}

function resolveBankLaunchUrl(
  selectedLauncher: PayerBankLauncherOption | undefined,
  nativeBankLauncherScheme?: string | undefined
): string {
  if (!selectedLauncher) {
    return '';
  }

  if (nativeBankLauncherScheme && selectedLauncher.android_package_hint) {
    const params = new URLSearchParams({
      payer_bank_launcher_id: selectedLauncher.payer_bank_launcher_id,
      package_name: selectedLauncher.android_package_hint
    });
    if (selectedLauncher.android_explicit_activity_name) {
      params.set('explicit_activity_class_name', selectedLauncher.android_explicit_activity_name);
    }
    if (selectedLauncher.deeplink_uri_template) {
      params.set('launch_uri', selectedLauncher.deeplink_uri_template);
    }
    return `${nativeBankLauncherScheme}://swimpay-bank-launch?${params.toString()}`;
  }

  return selectedLauncher.launch_url ?? '';
}

function swimPayLauncherSymbolSvg(): string {
  return `<svg viewBox="0 0 256 256" aria-hidden="true" class="swimpay-launcher-symbol-mark">
    <path d="M 184.83,27.69 L 183.22,27 L 180,27.46 L 88.66,72.55 L 81.99,76.92 L 76.69,82.22 L 73.24,87.51 L 70.71,92.8 L 69.1,98.09 L 68.41,102.46 L 68.41,110.74 L 70.48,119.26 L 73.7,125.47 L 78.08,130.76 L 83.37,134.9 L 123.17,155.61 L 123.4,156.76 L 85.9,175.39 L 80.38,179.31 L 75.54,184.6 L 73.01,189.2 L 70.94,196.79 L 70.71,224.17 L 71.17,226.93 L 72.32,228.31 L 75.31,228.77 L 77.85,227.85 L 169.87,182.07 L 173.78,179.31 L 178.15,174.93 L 182.76,168.26 L 184.83,163.66 L 187.13,155.38 L 187.36,146.64 L 185.29,136.28 L 181.38,128.92 L 176.54,123.86 L 173.32,121.33 L 135.36,101.77 L 135.13,100.39 L 172.63,81.53 L 178.38,76.69 L 181.84,72.32 L 185.06,65.19 L 186.21,58.52 L 186.21,32.29 L 185.75,28.84 Z"/>
  </svg>`;
}

function swimPayWavesSvg(): string {
  return swimPayLauncherSymbolSvg();
}

function iconSvg(icon: 'clock' | 'shield' | 'return' | 'card' | 'phone' | 'copy' | 'external' | 'check' | 'mobile' | 'wallet'): string {
  if (icon === 'clock') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>`;
  }
  if (icon === 'shield') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-2.9 8.5-7 10-4.1-1.5-7-5.4-7-10V6l7-3z"/><path d="M9 12l2 2 4-5"/></svg>`;
  }
  if (icon === 'return') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H5v4"/><path d="M5 11c1.2-3.2 4.2-5 7.5-4.5 4 .6 6.8 4.2 6.2 8.2-.6 3.9-4.2 6.7-8.1 6.1"/></svg>`;
  }
  if (icon === 'card') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 10h16"/><path d="M8 14h4"/></svg>`;
  }
  if (icon === 'phone') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="3"/><path d="M11 17.5h2"/></svg>`;
  }
  if (icon === 'copy') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="10" height="10" rx="2"/><path d="M6 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>`;
  }
  if (icon === 'external') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5"/><path d="M10 14L19 5"/><path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/></svg>`;
  }
  if (icon === 'mobile') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="3"/><path d="M10 6h4"/><circle cx="12" cy="17" r="1"/></svg>`;
  }
  if (icon === 'wallet') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"/><path d="M4 8V7a2 2 0 0 1 2-2h10"/><circle cx="16.5" cy="12.5" r="1"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg>`;
}

function buyerCheckoutScript(): string {
  return `<script>
    (() => {
      const setProgress = (step) => {
        const progress = document.querySelector('[data-progress-bar]');
        if (!progress) return;
        progress.setAttribute('data-active-step', step);
        const segments = Array.from(progress.querySelectorAll('.checkout-progress-segment'));
        segments.forEach((segment, index) => {
          segment.classList.toggle('checkout-progress-active', index + 1 <= Number(step));
          segment.classList.toggle('checkout-progress-pending', index + 1 > Number(step));
        });
      };

      const showPanel = (id, step) => {
        const panels = Array.from(document.querySelectorAll('[data-checkout-panel]'));
        const panel = document.querySelector('[data-checkout-panel="' + id + '"]');
        if (!panel) return;
        panels.forEach((item) => {
          item.hidden = item !== panel;
        });
        document.querySelector('.checkout-screen-shell')?.setAttribute('data-current-stage', id === 'intro' ? 'intro' : 'info');
        setProgress(step || (id === 'intro' ? '1' : '2'));
        window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        const firstInput = panel.querySelector('input, select, button');
        if (firstInput && firstInput.focus) setTimeout(() => firstInput.focus(), 160);
      };

      const selectPaymentMethod = (method) => {
        if (!method) return;
        const form = document.querySelector('.expected-profile-form');
        const input = form?.querySelector('input[name=payment_method][value="' + method + '"]:not(:disabled)');
        if (!input) return;
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      document.addEventListener('click', async (event) => {
        const target = event.target instanceof Element ? event.target.closest('[data-show-panel], [data-copy-value], [data-copy-destination], [data-open-consumer-link]') : null;
        if (!target) return;

        if (target.hasAttribute('data-show-panel')) {
          showPanel(target.getAttribute('data-show-panel'), target.getAttribute('data-progress-step'));
          selectPaymentMethod(target.getAttribute('data-select-method'));
          return;
        }

        if (target.hasAttribute('data-copy-value')) {
          await copyText(target, target.getAttribute('data-copy-value') || '');
          return;
        }

        if (target.hasAttribute('data-open-consumer-link')) {
          const id = target.getAttribute('data-open-consumer-link') || '';
          const response = await fetch('/checkout/' + encodeURIComponent(id) + '/receiving-route/copy-details', { cache: 'no-store' });
          if (!response.ok) return;
          const payload = await response.json();
          if (payload.receiver_consumer_link) {
            window.open(payload.receiver_consumer_link, '_blank', 'noopener');
          }
          return;
        }

        if (target.hasAttribute('data-copy-destination')) {
          const id = target.getAttribute('data-copy-destination') || '';
          const response = await fetch('/checkout/' + encodeURIComponent(id) + '/receiving-route/copy-details', { cache: 'no-store' });
          if (!response.ok) {
            markCopy(target, false);
            return;
          }
          const payload = await response.json();
          await copyText(target, payload.destination_value || payload.receiver_identifier_copy_value || '');
        }
      });

      document.addEventListener('submit', async (event) => {
        const form = event.target instanceof HTMLFormElement ? event.target.closest('[data-bank-launch-form]') : null;
        if (!form) return;
        const launchUrl = form.getAttribute('data-launch-url') || '';
        if (!launchUrl) return;

        event.preventDefault();
        const button = form.querySelector('button[type=submit]');
        if (button) button.disabled = true;

        try {
          const response = await fetch(form.action, {
            method: 'POST',
            headers: { accept: 'application/json' },
            credentials: 'same-origin'
          });
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            document.open();
            document.write(await response.text());
            document.close();
            return;
          }
          if (!response.ok) throw new Error('continue-to-bank failed');

          window.location.href = launchUrl;
          const checkoutUrl = form.getAttribute('data-checkout-url') || form.action.replace('/continue-to-bank', '');
          window.setTimeout(() => {
            window.location.href = checkoutUrl;
          }, 1400);
        } catch {
          if (button) button.disabled = false;
          form.submit();
        }
      });

      for (const form of document.querySelectorAll('.expected-profile-form')) {
        const syncSenderBankChoices = () => {
          const selectedBank = form.querySelector('input[name=sender_bank_id]:checked');
          for (const choice of form.querySelectorAll('.sender-bank-choice')) {
            const input = choice.querySelector('input[name=sender_bank_id]');
            choice.classList.toggle('selected', Boolean(input && selectedBank && input.value === selectedBank.value));
          }
        };
        const syncMethodFields = () => {
          const checked = form.querySelector('input[name=payment_method]:checked:not(:disabled)');
          const fallback = form.querySelector('input[name=payment_method]:not(:disabled)');
          const methodInput = checked || fallback;
          if (!methodInput) return;
          methodInput.checked = true;
          const method = methodInput.value || 'card';
          for (const card of form.querySelectorAll('.payment-method-card')) {
            const input = card.querySelector('input');
            card.classList.toggle('selected', input?.value === method && !input.disabled);
          }
          for (const field of form.querySelectorAll('[data-method-field]')) {
            const active = field.getAttribute('data-method-field') === method;
            field.hidden = !active;
            const input = field.querySelector('input');
            if (input) {
              input.disabled = !active;
              input.required = active;
            }
          }
        };
        form.addEventListener('change', () => {
          syncMethodFields();
          syncSenderBankChoices();
        });
        syncMethodFields();
        syncSenderBankChoices();
      }

      // Reveal the destination account in full on load — it is the account the payer pays to, so
      // it must be readable and copyable, never shown struck-out/masked.
      for (const target of document.querySelectorAll('[data-destination-reveal]')) {
        const id = target.getAttribute('data-destination-reveal') || '';
        if (!id) continue;
        fetch('/checkout/' + encodeURIComponent(id) + '/receiving-route/copy-details', { cache: 'no-store' })
          .then((response) => (response.ok ? response.json() : null))
          .then((payload) => {
            const full = payload && (payload.destination_value || payload.receiver_identifier_copy_value);
            if (full) target.textContent = full;
          })
          .catch(() => {});
      }

      for (const timer of document.querySelectorAll('[data-countdown-target]')) {
        const target = new Date(timer.getAttribute('data-countdown-target') || '').getTime();
        const tick = () => {
          const remaining = Math.max(0, target - Date.now());
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          timer.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
        };
        tick();
        setInterval(tick, 1000);
      }

      for (const statusPanel of document.querySelectorAll('[data-checkout-status-poll-url]')) {
        const pollUrl = statusPanel.getAttribute('data-checkout-status-poll-url') || '';
        const currentStatus = statusPanel.getAttribute('data-checkout-current-status') || '';
        const currentSafeStatus = statusPanel.getAttribute('data-checkout-current-safe-status') || '';
        const finalSafeStatuses = ['confirmed', 'rejected', 'expired', 'cancelled'];
        if (!pollUrl || finalSafeStatuses.includes(currentSafeStatus)) continue;

        let stopped = false;
        const poll = async () => {
          if (stopped || document.hidden) return;
          try {
            const response = await fetch(pollUrl, {
              cache: 'no-store',
              headers: { accept: 'application/json' },
              credentials: 'same-origin'
            });
            if (!response.ok) return;
            const payload = await response.json();
            const nextSafeStatus = String(payload.buyer_safe_status || '');
            const nextStatus = String(payload.status || '');
            if (finalSafeStatuses.includes(nextSafeStatus) || (nextStatus && nextStatus !== currentStatus)) {
              stopped = true;
              window.location.href = window.location.pathname + window.location.search;
            }
          } catch {
            // Keep the waiting screen stable; the next poll or manual refresh can recover.
          }
        };
        const interval = window.setInterval(poll, 2500);
        window.addEventListener('beforeunload', () => {
          stopped = true;
          window.clearInterval(interval);
        }, { once: true });
        window.setTimeout(poll, 800);
      }

      async function copyText(button, value) {
        try {
          await navigator.clipboard.writeText(value);
          markCopy(button, true);
        } catch {
          markCopy(button, false);
        }
      }

       function markCopy(button, ok) {
         const original = button.getAttribute('data-copy-label') || button.textContent || 'Copy';
         const shell = document.querySelector('.checkout-screen-shell');
         const successLabel = shell?.getAttribute('data-copy-success-label') || 'Copie';
         const errorLabel = shell?.getAttribute('data-copy-error-label') || 'Erreur';
         button.setAttribute('data-copy-label', original);
         button.textContent = ok ? successLabel : errorLabel;
         button.classList.toggle('copy-ok', ok);
        setTimeout(() => {
          button.textContent = original;
          button.classList.remove('copy-ok');
        }, 1200);
      }
    })();
  </script>`;
}

function buyerCheckoutStyles(): string {
  return `<style>
    .app-shell-checkout {
      --sp-ink: #071126;
      --sp-navy: #0F172A;
      --sp-blue: #155BD8;
      --sp-electric-blue: #1EA7F2;
      --sp-cyan: #16ADEC;
      --sp-teal: #0EA5A4;
      --sp-mint: #EAF6FA;
      --sp-background: #F2F7FA;
      --sp-surface: #FFFFFF;
      --sp-surface-alt: #F6FAFD;
      --sp-line: #E2E8F0;
      --sp-muted: #59708D;
      --sp-soft-text: #94A3B8;
      --sp-success: #059669;
      --sp-danger: #E5484D;
    }
    .app-shell-checkout {
      padding: max(26px, env(safe-area-inset-top)) 18px max(28px, calc(28px + env(safe-area-inset-bottom)));
      background: var(--sp-background);
      background-image: linear-gradient(180deg, var(--sp-surface-alt) 0%, var(--sp-background) 62%, var(--sp-surface) 100%);
      min-height: 100dvh;
    }
    .buyer-checkout {
      max-width: 520px;
      margin: 0 auto;
      overflow: visible;
      color: var(--sp-ink);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .buyer-checkout,
    .buyer-checkout *,
    .buyer-checkout *::before,
    .buyer-checkout *::after {
      box-sizing: border-box;
    }
    .checkout-shell-inner {
      width: 100%;
      min-width: 0;
    }
    .checkout-brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin: 2px auto 34px;
      animation: checkoutFadeUp 460ms cubic-bezier(0.23, 1, 0.32, 1) both;
    }
    .checkout-brand-main {
      display: flex;
      align-items: center;
      gap: 13px;
      min-width: 0;
    }
    .checkout-brand-mark {
      width: 50px;
      height: 50px;
      border-radius: 16px;
      display: grid;
      place-items: center;
      color: #FFFFFF;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 25px;
      font-weight: 900;
      font-style: italic;
      background: #060708;
      box-shadow: 0 16px 28px rgba(6, 7, 8, 0.2);
    }
    .checkout-brand-mark svg {
      width: 34px;
      height: 34px;
      fill: currentColor;
      filter: drop-shadow(0 3px 8px rgba(255, 255, 255, 0.12));
    }
    .checkout-stage-icon svg {
      width: 34px;
      height: 34px;
      fill: none;
      stroke: currentColor;
      stroke-width: 4.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .checkout-brand-copy {
      display: flex;
      flex-direction: column;
      line-height: 1;
    }
    .checkout-brand-copy strong {
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 27px;
      font-weight: 900;
      color: var(--sp-ink);
      letter-spacing: 0;
    }
    .checkout-brand-copy span {
      margin-top: 8px;
      color: var(--sp-muted);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }
    .checkout-language-selector {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.74);
      border: 1px solid rgba(226, 234, 240, 0.82);
      box-shadow: 0 8px 18px rgba(6, 20, 38, 0.05);
      flex: 0 0 auto;
    }
    .checkout-language-selector a {
      min-width: 34px;
      min-height: 32px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--sp-soft-text);
      text-decoration: none;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0;
      transition: background 160ms ease, color 160ms ease, transform 160ms ease;
    }
    .checkout-language-selector a:active {
      transform: scale(0.96);
    }
    .checkout-language-selector a.selected {
      color: var(--sp-surface);
      background: linear-gradient(135deg, var(--sp-teal), var(--sp-blue));
      box-shadow: 0 8px 16px rgba(0, 175, 194, 0.2);
    }
    .checkout-progress {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      width: min(100%, 382px);
      margin: 0 auto 42px;
    }
    .checkout-progress-segment {
      height: 6px;
      border-radius: 999px;
      background: #EAF0F4;
      overflow: hidden;
      position: relative;
    }
    .checkout-progress-active::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--sp-teal), var(--sp-cyan));
      animation: checkoutBar 420ms cubic-bezier(0.23, 1, 0.32, 1) both;
    }
    .checkout-flow,
    .checkout-stage-host {
      display: block;
      width: 100%;
      min-width: 0;
    }
    .checkout-stage-card {
      width: 100%;
      padding: clamp(28px, 6vw, 44px);
      border-radius: 32px;
      background: var(--sp-surface);
      border: 1px solid rgba(226, 234, 240, 0.72);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04), 0 34px 80px rgba(6, 20, 38, 0.04);
      animation: checkoutStageIn 440ms cubic-bezier(0.23, 1, 0.32, 1) both;
    }
    .checkout-stage-card[hidden] {
      display: none;
    }
    .checkout-stage-head {
      margin-bottom: 28px;
    }
    .checkout-stage-head-center {
      text-align: center;
    }
    .checkout-stage-head h1 {
      font-family: 'Outfit', 'Inter', sans-serif;
      color: var(--sp-ink);
      font-size: clamp(30px, 8vw, 42px);
      line-height: 1.04;
      letter-spacing: 0;
      font-weight: 900;
      margin: 0;
    }
    .checkout-stage-head p {
      margin: 12px 0 0;
      color: var(--sp-muted);
      font-size: 16px;
      line-height: 1.48;
      font-weight: 500;
    }
    .checkout-kicker {
      margin: 0 0 10px;
      color: var(--sp-soft-text);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .checkout-stage-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 26px;
      display: grid;
      place-items: center;
      border-radius: 22px;
      background: rgba(0, 175, 194, 0.08);
      color: var(--sp-cyan);
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 26px;
      font-style: italic;
      font-weight: 900;
      box-shadow: 0 8px 18px rgba(6, 20, 38, 0.08);
    }
    .checkout-feature-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin: 42px 0 34px;
    }
    .checkout-feature-card {
      display: grid;
      grid-template-columns: 54px minmax(0, 1fr);
      gap: 18px;
      align-items: center;
      text-align: left;
    }
    .checkout-feature-icon,
    .payment-method-icon,
    .bank-logo-mark,
    .checkout-option-icon,
    .checkout-info-icon {
      width: 46px;
      height: 46px;
      border-radius: 17px;
      display: grid;
      place-items: center;
      color: var(--sp-cyan);
      background: var(--sp-surface);
      border: 1px solid rgba(226, 234, 240, 0.82);
      box-shadow: 0 8px 16px rgba(6, 20, 38, 0.06);
      flex: 0 0 auto;
    }
    .checkout-option-icon svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .checkout-feature-card svg,
    .payment-method-icon svg,
    .checkout-primary-action svg,
    .copy-icon-btn svg,
    .checkout-trust-badge svg,
    .timeline-item svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .checkout-feature-card strong {
      display: block;
      color: var(--sp-ink);
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 17px;
      font-weight: 900;
      line-height: 1.15;
    }
    .checkout-feature-card small {
      display: block;
      margin-top: 4px;
      color: #7A8AA0;
      font-size: 14px;
      line-height: 1.35;
      font-weight: 600;
    }
    .checkout-network-note {
      margin: 18px 0 0;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      color: #C8D1DA;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .checkout-network-note span,
    .checkout-security-line span,
    .checkout-session-pill i {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      display: inline-block;
      background: #20D48A;
    }
    .expected-profile-form,
    .method-field-stack {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .checkout-input-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .checkout-field,
    .checkout-field-block {
      display: flex;
      flex-direction: column;
      gap: 9px;
      color: var(--sp-soft-text);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .checkout-field input,
    .checkout-field select {
      width: 100%;
      min-width: 0;
      min-height: 58px;
      border: 1px solid transparent;
      border-radius: 20px;
      background: var(--sp-background);
      color: var(--sp-ink);
      padding: 15px 18px;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: none;
      transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
    }
    .checkout-field input::placeholder {
      color: #C2CBD5;
    }
    .checkout-field input:focus,
    .checkout-field select:focus {
      outline: none;
      background: var(--sp-surface);
      border-color: rgba(0, 175, 194, 0.62);
      box-shadow: 0 0 0 4px rgba(0, 175, 194, 0.12);
    }
    .method-toggle {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .payment-method-card {
      min-height: 86px;
      border-radius: 22px;
      border: 1px solid rgba(226, 234, 240, 0.82);
      background: #F9FBFD;
      display: grid;
      place-items: center;
      gap: 9px;
      padding: 14px;
      cursor: pointer;
      color: var(--sp-soft-text);
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
    }
    .payment-method-card input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .payment-method-card strong {
      font-family: 'Outfit', 'Inter', sans-serif;
      color: currentColor;
      font-size: 17px;
      font-weight: 900;
      text-align: center;
    }
    .payment-method-card small {
      color: var(--sp-soft-text);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0;
      line-height: 1.2;
      text-align: center;
      text-transform: none;
    }
    .payment-method-card.selected {
      color: var(--sp-cyan);
      background: rgba(0, 175, 194, 0.07);
      border-color: var(--sp-cyan);
    }
    .sender-bank-selector {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sender-bank-choice {
      min-height: 70px;
      border-radius: 22px;
      border: 1px solid rgba(226, 234, 240, 0.82);
      background: #F9FBFD;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      cursor: pointer;
      text-transform: none;
      letter-spacing: 0;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
    }
    .sender-bank-choice input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .sender-bank-choice strong,
    .sender-bank-choice small {
      display: block;
      letter-spacing: 0;
      text-transform: none;
    }
    .sender-bank-choice strong {
      color: var(--sp-ink);
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 15px;
      font-weight: 900;
    }
    .sender-bank-choice small {
      margin-top: 2px;
      color: var(--sp-soft-text);
      font-size: 12px;
      font-weight: 700;
    }
    .sender-bank-choice.selected {
      border-color: rgba(0, 175, 194, 0.62);
      background: rgba(0, 175, 194, 0.07);
    }
    .payment-method-card.unavailable {
      color: #AAB6C2;
      background: #F3F6F9;
      cursor: not-allowed;
      opacity: 0.72;
    }
    .payment-method-card.unavailable .payment-method-icon {
      color: #AAB6C2;
      background: #F8FAFC;
    }
    .payment-method-card:active,
    .sender-bank-choice:active,
    .checkout-primary-action:active,
    .checkout-secondary-action:active,
    .checkout-option-card:active,
    .copy-icon-btn:active {
      transform: scale(0.98);
    }
    .checkout-security-line {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0 0;
      color: var(--sp-soft-text);
      font-size: 13px;
      font-weight: 700;
      line-height: 1.35;
    }
    .checkout-primary-action,
    .checkout-secondary-action,
    .checkout-ghost-action {
      width: 100%;
      min-height: 64px;
      border: 0;
      border-radius: 22px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      text-decoration: none;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0;
      cursor: pointer;
      transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
    }
    .checkout-primary-action {
      color: var(--sp-surface);
      background: linear-gradient(135deg, var(--sp-teal) 0%, var(--sp-blue) 100%);
      box-shadow: 0 18px 34px rgba(0, 175, 194, 0.22);
    }
    .checkout-secondary-action {
      color: var(--sp-cyan);
      background: #F2F6F9;
      box-shadow: none;
    }
    .checkout-ghost-action {
      min-height: 40px;
      color: var(--sp-soft-text);
      background: transparent;
      box-shadow: none;
      font-size: 15px;
    }
    .checkout-option-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .selection-form {
      margin: 0;
    }
    .checkout-option-card {
      width: 100%;
      min-height: 84px;
      border: 1px solid rgba(226, 234, 240, 0.82);
      border-radius: 24px;
      background: #F9FBFD;
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 16px;
      text-align: left;
      cursor: pointer;
      color: var(--sp-ink);
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
    }
    .checkout-option-card:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .checkout-option-card:not(:disabled):hover {
      border-color: rgba(0, 175, 194, 0.38);
      background: var(--sp-surface);
    }
    .checkout-option-copy {
      min-width: 0;
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 3px;
    }
    .checkout-option-copy strong {
      color: var(--sp-ink);
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 18px;
      font-weight: 900;
    }
    .checkout-option-copy small {
      color: var(--sp-soft-text);
      font-size: 14px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .checkout-option-arrow {
      color: var(--sp-cyan);
      font-size: 13px;
      font-weight: 900;
      white-space: nowrap;
    }
    .bank-logo-mark {
      background: rgba(0, 175, 194, 0.08);
      border: 0;
      color: var(--sp-cyan);
      font-family: 'Outfit', 'Inter', sans-serif;
      font-weight: 900;
    }
    .bank-logo-image {
      background-color: #FFFFFF;
      background-position: center;
      background-repeat: no-repeat;
      background-size: cover;
      color: transparent;
      overflow: hidden;
    }
    .bank-logo-image > span {
      opacity: 0;
    }
    ${bankLogoImageStyles()}
    .bank-logo-ic_bank_ozon {
      background: #005BFF;
      color: #FFFFFF;
    }
    .instruction-preview,
    .payment-details-card,
    .checkout-status-summary {
      overflow: hidden;
      border-radius: 28px;
      background: #F9FBFD;
      border: 1px solid rgba(226, 234, 240, 0.78);
      margin-bottom: 22px;
    }
    .instruction-preview div,
    .payment-row,
    .summary-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, auto) auto;
      align-items: center;
      gap: 14px;
      padding: 18px 22px;
      border-bottom: 1px solid rgba(226, 234, 240, 0.72);
    }
    .instruction-preview div {
      grid-template-columns: minmax(0, 1fr) minmax(0, auto);
    }
    .instruction-preview div:last-child,
    .payment-row:last-child,
    .summary-row:last-child {
      border-bottom: 0;
    }
    .instruction-preview span,
    .payment-row span,
    .summary-row span {
      color: var(--sp-soft-text);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .instruction-preview strong,
    .payment-row strong,
    .summary-row strong {
      min-width: 0;
      color: var(--sp-ink);
      font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
      font-size: 17px;
      font-weight: 900;
      text-align: right;
      overflow-wrap: anywhere;
    }
    .payment-row-bank strong {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      font-family: 'Outfit', 'Inter', sans-serif;
    }
    .payment-row-bank .bank-logo-mark {
      width: 32px;
      height: 32px;
      border-radius: 12px;
      font-size: 11px;
    }
    .checkout-session-pill {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 50px;
      border-radius: 17px;
      padding: 12px 18px;
      margin-bottom: 26px;
      background: rgba(0, 175, 194, 0.08);
      color: var(--sp-cyan);
      font-weight: 900;
    }
    .checkout-session-pill span {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .checkout-session-pill strong {
      font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
      font-size: 18px;
    }
    .copy-icon-btn {
      width: 43px;
      height: 43px;
      border: 0;
      border-radius: 15px;
      display: grid;
      place-items: center;
      background: var(--sp-surface);
      color: var(--sp-cyan);
      box-shadow: 0 8px 18px rgba(6, 20, 38, 0.07);
      cursor: pointer;
      font-size: 0;
      transition: transform 160ms ease, background 160ms ease, color 160ms ease;
    }
    .copy-icon-btn.copy-ok,
    .copy-ok {
      background: rgba(32, 212, 138, 0.13);
      color: #20A970;
      font-size: 11px;
      font-weight: 900;
    }
    .copy-icon-btn.copy-ok svg {
      display: none;
    }
    .instruction-actions {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 26px;
    }
    .instruction-actions form {
      margin: 0;
    }
    .checkout-paid-action {
      color: #718096 !important;
    }
    .checkout-status-card {
      padding-bottom: clamp(28px, 6vw, 42px);
    }
    .payment-timeline {
      display: flex;
      flex-direction: column;
      gap: 18px;
      margin: 30px 0;
    }
    .timeline-item {
      display: grid;
      grid-template-columns: 42px minmax(0, 1fr);
      align-items: center;
      gap: 16px;
      color: var(--sp-ink);
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 17px;
      font-weight: 900;
    }
    .timeline-item span {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: #F1F5F9;
      color: #C9D4DC;
      border: 2px solid transparent;
    }
    .timeline-done span {
      color: var(--sp-surface);
      background: var(--sp-cyan);
      box-shadow: 0 12px 24px rgba(0, 175, 194, 0.22);
    }
    .timeline-active span {
      border-color: var(--sp-cyan);
      background: rgba(0, 175, 194, 0.08);
      box-shadow: 0 0 0 7px rgba(0, 175, 194, 0.08);
      animation: checkoutPulse 1.8s ease infinite;
    }
    .timeline-pending {
      color: #C8D1DA;
    }
    .timeline-danger span {
      color: var(--sp-surface);
      background: #E5484D;
    }
    .checkout-signal-notice {
      margin: 22px 0;
      padding: 22px;
      border-radius: 18px;
      background: rgba(0, 175, 194, 0.08);
      color: #008EA2;
      font-weight: 900;
      line-height: 1.45;
    }
    .checkout-safe-notice {
      display: grid;
      grid-template-columns: 46px minmax(0, 1fr);
      align-items: center;
      gap: 14px;
      margin: 26px 0;
      padding: 18px;
      border-radius: 18px;
      background: #F9FBFD;
      color: #475569;
      font-size: 14px;
      font-weight: 700;
    }
    .checkout-safe-notice p {
      margin: 0;
    }
    .checkout-info-icon {
      color: var(--sp-cyan);
      font-weight: 900;
    }
    .checkout-status-summary {
      margin-top: 28px;
      margin-bottom: 26px;
    }
    .checkout-status-summary h2 {
      margin: 0;
      padding: 20px 22px 4px;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 25px;
      color: var(--sp-ink);
    }
    .summary-row {
      grid-template-columns: minmax(0, 1fr) minmax(0, auto);
    }
    .summary-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 38px;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(0, 175, 194, 0.08);
      color: var(--sp-muted) !important;
      font-family: 'Inter', sans-serif !important;
      font-size: 14px !important;
    }
    .checkout-refresh-action span {
      width: 19px;
      height: 19px;
      border-radius: 999px;
      border: 3px solid rgba(0, 175, 194, 0.22);
      border-top-color: var(--sp-cyan);
      animation: checkoutSpin 1s linear infinite;
    }
    .checkout-empty-card {
      text-align: center;
    }
    .checkout-empty-card h1 {
      margin: 0 0 10px;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 34px;
    }
    .checkout-empty-card p {
      margin: 0;
      color: var(--sp-muted);
      font-size: 16px;
    }
    .checkout-configuration-card + .checkout-info-card {
      margin-top: 22px;
    }
    .checkout-empty-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 28px;
    }
    .checkout-trust-footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      margin: 36px 0 0;
      color: #C8D1DA;
      text-align: center;
    }
    .checkout-trust-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 38px;
      padding: 8px 18px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid rgba(226, 234, 240, 0.78);
      box-shadow: 0 8px 20px rgba(6, 20, 38, 0.05);
      color: var(--sp-soft-text);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      backdrop-filter: blur(12px);
    }
    .checkout-trust-badge svg {
      width: 15px;
      height: 15px;
      color: #20D48A;
    }
    .checkout-trust-footer p {
      margin: 0;
      font-size: 11px;
      font-weight: 700;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    @keyframes checkoutFadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes checkoutStageIn {
      from { opacity: 0; transform: translateX(22px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes checkoutBar {
      from { transform: scaleX(0); transform-origin: left; }
      to { transform: scaleX(1); transform-origin: left; }
    }
    @keyframes checkoutPulse {
      0%, 100% { box-shadow: 0 0 0 6px rgba(0, 175, 194, 0.08); }
      50% { box-shadow: 0 0 0 10px rgba(0, 175, 194, 0.04); }
    }
    @keyframes checkoutSpin {
      to { transform: rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .buyer-checkout *,
      .buyer-checkout *::before,
      .buyer-checkout *::after {
        animation-duration: 1ms !important;
        scroll-behavior: auto !important;
        transition-duration: 1ms !important;
      }
    }
    @media (max-width: 620px) {
      .app-shell-checkout {
        padding-left: 16px;
        padding-right: 16px;
      }
      .checkout-brand {
        margin-bottom: 30px;
      }
      .checkout-progress {
        margin-bottom: 34px;
      }
      .checkout-input-grid,
      .method-toggle {
        grid-template-columns: 1fr;
      }
      .checkout-stage-card {
        border-radius: 30px;
      }
      .payment-row {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .payment-row strong {
        grid-column: 1;
        text-align: left;
      }
      .payment-row .copy-icon-btn {
        grid-column: 2;
        grid-row: 1 / span 2;
      }
      .summary-row {
        grid-template-columns: minmax(0, 1fr);
      }
      .summary-row strong {
        text-align: left;
      }
    }
    @media (max-width: 430px) {
      .app-shell-checkout {
        padding-top: max(18px, env(safe-area-inset-top));
        padding-left: 12px;
        padding-right: 12px;
      }
      .checkout-stage-card {
        padding: 28px;
        border-radius: 28px;
      }
      .checkout-brand-mark {
        width: 48px;
        height: 48px;
      }
      .checkout-brand-copy strong {
        font-size: 25px;
      }
      .checkout-primary-action,
      .checkout-secondary-action {
        min-height: 60px;
        font-size: 18px;
      }
      .checkout-feature-card {
        grid-template-columns: 48px minmax(0, 1fr);
        gap: 14px;
      }
      .checkout-feature-icon {
        width: 44px;
        height: 44px;
      }
    }
  </style>`;
}
