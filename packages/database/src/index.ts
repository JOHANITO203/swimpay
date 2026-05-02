export const INITIAL_SCHEMA_MIGRATION = '001_initial_schema.sql';
export const WEBHOOK_DELIVERY_LOOP_MIGRATION = '002_webhook_delivery_loop.sql';

export const V1_BANK_PROFILE_IDS = [
  'sber_ru',
  'tbank_ru',
  'vtb_ru',
  'alfa_ru',
  'gazprombank_ru'
] as const;

export type V1BankProfileId = (typeof V1_BANK_PROFILE_IDS)[number];
