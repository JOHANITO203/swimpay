/* global console */
import { buildWebServer } from '../../apps/web/dist/index.js';

const banks = [
  {
    receiver_bank_id: 'sber_ru',
    bank_profile_id: 'sber_ru',
    display_name: 'Sberbank',
    status: 'available',
    buyer_safe_status: 'available',
    review_only: true,
    detection_supported: true,
    beta_ready: true,
    available_route_count: 2
  },
  {
    receiver_bank_id: 'tbank_ru',
    bank_profile_id: 'tbank_ru',
    display_name: 'T-Bank',
    status: 'available',
    buyer_safe_status: 'review_required_beta',
    review_only: true,
    detection_supported: true,
    beta_ready: true,
    available_route_count: 2
  },
  {
    receiver_bank_id: 'vtb_ru',
    bank_profile_id: 'vtb_ru',
    display_name: 'VTB',
    status: 'temporarily_unavailable',
    buyer_safe_status: 'temporarily_unavailable',
    review_only: true,
    detection_supported: true,
    beta_ready: false,
    available_route_count: 0
  }
];

const routes = [
  {
    route_id: 'route_card',
    bank_profile_id: 'sber_ru',
    rail_type: 'card_transfer',
    masked_identifier: '2202 **** **** 4821',
    receiver_identifier_masked: '2202 **** **** 4821',
    copy_available: true,
    fees_hint: 'Frais possibles selon votre banque',
    recommended: true,
    review_beta_label: 'Validation manuelle en beta'
  },
  {
    route_id: 'route_phone',
    bank_profile_id: 'sber_ru',
    rail_type: 'phone_transfer',
    masked_identifier: '+7 *** *** 45-67',
    receiver_identifier_masked: '+7 *** *** 45-67',
    copy_available: true,
    fees_hint: 'Pratique pour les virements via SBP',
    recommended: false,
    review_beta_label: 'Validation manuelle en beta'
  }
];

const launchers = [
  {
    payer_bank_launcher_id: 'sber_launcher',
    display_name: 'Sberbank',
    country: 'RU',
    android_package_hint: 'ru.sberbankmobile',
    launch_url: null,
    fallback_strategy: 'manual_copy',
    does_not_confirm_payment: true,
    enabled: true
  },
  {
    payer_bank_launcher_id: 'manual',
    display_name: 'Autre banque',
    country: 'RU',
    android_package_hint: null,
    launch_url: null,
    fallback_strategy: 'manual_copy',
    does_not_confirm_payment: true,
    enabled: true
  }
];

function baseSession(id) {
  const statusMap = {
    'status-searching': 'buyer_claimed_paid',
    'status-signal': 'signal_detected',
    'status-review': 'needs_review',
    'status-confirmed': 'manual_confirmed',
    'status-expired': 'expired',
    'status-rejected': 'rejected'
  };
  const status = statusMap[id] ?? 'awaiting_payment';
  const hasBank = id !== 'bank';
  const selectedRoute = ['bank', 'route'].includes(id)
    ? undefined
    : id === 'instructions-phone'
      ? 'route_phone'
      : 'route_card';
  const selectedLauncher = ['bank', 'route', 'launcher'].includes(id) ? undefined : 'sber_launcher';

  return {
    payment_session_id: id,
    order_id: 'ord_visual',
    status,
    buyer_safe_status:
      id === 'status-searching'
        ? 'searching_signal'
        : id === 'status-signal'
          ? 'signal_detected'
          : id === 'status-review'
            ? 'needs_review'
            : id === 'status-confirmed'
              ? 'confirmed'
              : id === 'status-expired'
                ? 'expired'
                : id === 'status-rejected'
                  ? 'not_validated'
                  : 'awaiting_payment',
    selected_receiver_bank_id: hasBank ? 'sber_ru' : undefined,
    selected_receiver_bank_profile_id: hasBank ? 'sber_ru' : undefined,
    selected_receiving_route_id: selectedRoute,
    selected_payer_bank_launcher_id: selectedLauncher,
    amount: { value: '58,41', currency: 'RUB' },
    reference: 'TANGO ALFA',
    receiver_status: 'armed',
    expires_at: '2026-05-04T23:59:00.000Z',
    product_name: 'Commande test',
    official_bank_confirmation: false
  };
}

const checkoutSessionProvider = {
  async getCheckoutSession(id) {
    return baseSession(id);
  },
  async getReceiverBanks(id) {
    return { payment_session_id: id, receiver_banks: banks };
  },
  async selectReceiverBank(id, receiverBankId) {
    return {
      ...baseSession('route'),
      payment_session_id: id,
      selected_receiver_bank_id: receiverBankId,
      selected_receiver_bank_profile_id: receiverBankId
    };
  },
  async getReceivingRoutes(id, bankProfileId) {
    return { payment_session_id: id, bank_profile_id: bankProfileId, routes };
  },
  async selectReceivingRoute(id, receivingRouteId) {
    return { ...baseSession('launcher'), payment_session_id: id, selected_receiving_route_id: receivingRouteId };
  },
  async getReceivingRouteCopyDetails(id) {
    return {
      payment_session_id: id,
      receiving_route_id: 'route_card',
      receiver_identifier_masked: '2202 **** **** 4821',
      receiver_identifier_copy_value: '2202000000004821',
      destination_value: '2202000000004821'
    };
  },
  async saveBuyerSenderPhoneHint(id) {
    return baseSession(id);
  },
  async getPayerBankLaunchers(id) {
    return { payment_session_id: id, payer_bank_launchers: launchers };
  },
  async selectPayerBankLauncher(id, payerBankLauncherId) {
    return { ...baseSession('instructions-card'), payment_session_id: id, selected_payer_bank_launcher_id: payerBankLauncherId };
  },
  async markPaymentInstructionsShown(id) {
    return baseSession(id);
  },
  async markBuyerClaimedPaid(id) {
    return {
      payment_session_id: id,
      buyer_claimed_paid: true,
      does_not_confirm_payment: true,
      next_status: 'searching_signal',
      status: 'buyer_claimed_paid',
      checkout_state: 'buyer_claimed_paid',
      buyer_safe_status: 'searching_signal',
      official_bank_confirmation: false
    };
  }
};

const merchantRouteAdminClient = {
  async listRoutes() {
    return [
      {
        route_id: 'route_card',
        bank_profile_id: 'sber_ru',
        rail_type: 'card_transfer',
        receiver_identifier_type: 'card',
        receiver_identifier_masked: '•••• 4821',
        route_code: 'SBER-CARD',
        display_label: 'Carte bancaire',
        enabled: true,
        recommended: true,
        review_policy: 'review_first'
      },
      {
        route_id: 'route_phone',
        bank_profile_id: 'tbank_ru',
        rail_type: 'phone_transfer',
        receiver_identifier_type: 'phone',
        receiver_identifier_masked: '+7 *** *** 45-67',
        route_code: 'TBANK-PHONE',
        display_label: 'Numéro de téléphone',
        enabled: true,
        recommended: false,
        review_policy: 'eligible_low_risk_later'
      }
    ];
  },
  async createRoute() {
    return (await this.listRoutes())[0];
  },
  async updateRoute() {
    return (await this.listRoutes())[0];
  }
};

const server = buildWebServer({
  environment: 'browser-qa',
  checkoutSessionProvider,
  merchantRouteAdminClient
});

await server.listen({ host: '127.0.0.1', port: 3099 });
console.log('FRONTEND_QA_READY');
await new Promise(() => {});
