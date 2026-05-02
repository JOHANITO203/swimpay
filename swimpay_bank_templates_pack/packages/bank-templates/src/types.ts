export type BankTemplateStatus =
  | 'new'
  | 'learning'
  | 'shadow_testing'
  | 'trusted_low_amount'
  | 'trusted'
  | 'degraded'
  | 'review_only'
  | 'disabled';

export type DirectionLabel =
  | 'incoming_customer_transfer'
  | 'incoming_cashback'
  | 'incoming_refund'
  | 'incoming_salary_or_income'
  | 'incoming_non_customer'
  | 'outgoing_payment'
  | 'outgoing_transfer'
  | 'failed_transfer'
  | 'promo'
  | 'balance_update'
  | 'unknown'
  | 'unknown_ambiguous_direction';

export interface TrustedBankApp {
  packageName: string;
  certSha256: string;
  verificationStatus: 'pending_verification' | 'verified' | 'rejected' | 'deprecated';
}

export interface BankProfile {
  bankProfileId: string;
  displayName: string;
  country: 'RU';
  status: Exclude<BankTemplateStatus, 'new'>;
  autoConfirmStatus: 'disabled' | 'review_only' | 'shadow_testing' | 'trusted_low_amount' | 'trusted';
  trustedApps: TrustedBankApp[];
  supportedLocales: string[];
  fieldPriority: string[];
}

export interface BankTemplate {
  templateId: string;
  bankProfileId: string;
  version: number;
  status: BankTemplateStatus;
  directionLabel: DirectionLabel;
  riskClass: string;
  positiveKeywords: string[];
  negativeKeywords: string[];
  decisionHints: {
    parserSignalQualityFloor: number;
    allowAutoConfirmCandidate: boolean;
    backendMustVerifyNoCollision: boolean;
  };
}

export interface ParsedBankSignal {
  bankProfileId: string;
  directionLabel: DirectionLabel;
  amountMinor?: number;
  currency?: 'RUB';
  senderPhoneHmac?: string;
  referenceHmac?: string;
  templateId?: string;
  signalQuality: number;
  reasonCodes: string[];
}
