export const TemplateStatuses = [
  'new',
  'learning',
  'shadow_testing',
  'trusted_low_amount',
  'trusted',
  'degraded',
  'review_only',
  'disabled',
] as const;

export const DirectionLabels = [
  'incoming_customer_transfer',
  'incoming_cashback',
  'incoming_refund',
  'incoming_salary_or_income',
  'incoming_non_customer',
  'outgoing_payment',
  'outgoing_transfer',
  'failed_transfer',
  'promo',
  'balance_update',
  'unknown',
  'unknown_ambiguous_direction',
] as const;

export function isNegativePaymentDirection(label: string): boolean {
  return [
    'incoming_cashback',
    'incoming_refund',
    'incoming_salary_or_income',
    'incoming_non_customer',
    'outgoing_payment',
    'outgoing_transfer',
    'failed_transfer',
    'promo',
    'balance_update',
    'unknown',
    'unknown_ambiguous_direction',
  ].includes(label);
}
