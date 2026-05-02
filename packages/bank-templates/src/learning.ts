import { createHash } from 'node:crypto';

import type { BankTemplateStatus, DirectionLabel } from './types.js';
import { canonicalizeTemplateText } from './drift.js';

export type TemplateReviewOutcome = 'human_verified' | 'false_positive' | 'review_rejected' | 'shadow_agreed' | 'shadow_disagreed';

export interface TemplateLearningStats {
  seenCount: number;
  humanVerifiedCount: number;
  falsePositiveCount: number;
  shadowPredictionsCount: number;
  reviewerAgreementCount: number;
  unknownCount: number;
  parserConfidenceTotal: number;
  driftCriticalCount: number;
  driftRate7d: number;
}

export interface TemplateLearningState {
  templateId: string;
  bankProfileId: string;
  canonicalTemplate: string;
  templateHash: string;
  directionLabel: DirectionLabel;
  status: BankTemplateStatus;
  stats: TemplateLearningStats;
  reliabilityScore: number;
  autoConfirmAllowedByTemplate: boolean;
  reasonCodes: string[];
}

export interface ObserveTemplateSignalInput {
  state?: TemplateLearningState | undefined;
  bankProfileId: string;
  rawNotificationText: string;
  directionLabel: DirectionLabel;
  parserConfidence: number;
  reviewOutcome?: TemplateReviewOutcome | undefined;
  driftStatus?: 'stable' | 'minor_drift' | 'major_drift' | 'critical_drift' | undefined;
}

export interface TemplateLifecycleRecommendation {
  status: BankTemplateStatus;
  autoConfirmAllowedByTemplate: boolean;
  reasonCodes: string[];
}

export interface TemplateMutationCandidate {
  mutationId: string;
  family:
    | 'incoming_keyword_synonym'
    | 'amount_currency_format'
    | 'phone_removed_or_masked'
    | 'reference_removed_or_truncated'
    | 'balance_suffix_added'
    | 'promo_text_added';
  canonicalTemplate: string;
  status: 'new';
  allowAutoConfirmCandidate: false;
  reasonCodes: string[];
}

export function canonicalizeLearningTemplate(rawNotificationText: string): string {
  return canonicalizeTemplateText(rawNotificationText)
    .replaceAll('<amount>', '<AMOUNT>')
    .replaceAll('<currency>', '<CURRENCY>')
    .replaceAll('<phone>', '<PHONE>')
    .replaceAll('<person>', '<PERSON>')
    .replaceAll('<reference>', '<REFERENCE>')
    .replaceAll('<card_mask>', '<CARD_MASK>');
}

export function hashCanonicalTemplate(canonicalTemplate: string): string {
  return createHash('sha256').update(canonicalTemplate, 'utf8').digest('hex');
}

export function createInitialTemplateLearningState(input: {
  bankProfileId: string;
  canonicalTemplate: string;
  directionLabel: DirectionLabel;
}): TemplateLearningState {
  const canonicalTemplate = canonicalizeLearningTemplate(input.canonicalTemplate);
  const templateHash = hashCanonicalTemplate(canonicalTemplate);
  const stats = createEmptyTemplateStats();

  return {
    templateId: `${input.bankProfileId}_${templateHash.slice(0, 16)}`,
    bankProfileId: input.bankProfileId,
    canonicalTemplate,
    templateHash,
    directionLabel: input.directionLabel,
    status: 'learning',
    stats,
    reliabilityScore: calculateTemplateReliabilityScore(stats),
    autoConfirmAllowedByTemplate: false,
    reasonCodes: ['new_template_observed', 'template_learning_started']
  };
}

export function observeTemplateSignal(input: ObserveTemplateSignalInput): TemplateLearningState {
  const canonicalTemplate = canonicalizeLearningTemplate(input.rawNotificationText);
  const state =
    input.state ??
    createInitialTemplateLearningState({
      bankProfileId: input.bankProfileId,
      canonicalTemplate,
      directionLabel: input.directionLabel
    });
  const stats = updateTemplateLearningStats(state.stats, {
    directionLabel: input.directionLabel,
    parserConfidence: input.parserConfidence,
    reviewOutcome: input.reviewOutcome,
    driftStatus: input.driftStatus
  });
  const recommendation = recommendTemplateLifecycleStatus({
    currentStatus: state.status,
    stats
  });

  return {
    ...state,
    canonicalTemplate,
    templateHash: hashCanonicalTemplate(canonicalTemplate),
    directionLabel: input.directionLabel,
    status: recommendation.status,
    stats,
    reliabilityScore: calculateTemplateReliabilityScore(stats),
    autoConfirmAllowedByTemplate: recommendation.autoConfirmAllowedByTemplate,
    reasonCodes: [...new Set([...state.reasonCodes, ...recommendation.reasonCodes])]
  };
}

export function updateTemplateLearningStats(
  stats: TemplateLearningStats,
  input: {
    directionLabel: DirectionLabel;
    parserConfidence: number;
    reviewOutcome?: TemplateReviewOutcome | undefined;
    driftStatus?: 'stable' | 'minor_drift' | 'major_drift' | 'critical_drift' | undefined;
  }
): TemplateLearningStats {
  const next: TemplateLearningStats = {
    ...stats,
    seenCount: stats.seenCount + 1,
    parserConfidenceTotal: stats.parserConfidenceTotal + clamp(input.parserConfidence, 0, 1),
    unknownCount: stats.unknownCount + (input.directionLabel === 'unknown' || input.directionLabel === 'unknown_ambiguous_direction' ? 1 : 0),
    driftCriticalCount: stats.driftCriticalCount + (input.driftStatus === 'critical_drift' ? 1 : 0)
  };

  if (input.reviewOutcome === 'human_verified') {
    next.humanVerifiedCount += 1;
  }

  if (input.reviewOutcome === 'false_positive') {
    next.falsePositiveCount += 1;
  }

  if (input.reviewOutcome === 'shadow_agreed' || input.reviewOutcome === 'shadow_disagreed') {
    next.shadowPredictionsCount += 1;
  }

  if (input.reviewOutcome === 'shadow_agreed') {
    next.reviewerAgreementCount += 1;
  }

  return next;
}

export function recommendTemplateLifecycleStatus(input: {
  currentStatus: BankTemplateStatus;
  stats: TemplateLearningStats;
}): TemplateLifecycleRecommendation {
  if (input.currentStatus === 'disabled') {
    return recommendation('disabled', false, ['template_disabled']);
  }

  if (input.stats.falsePositiveCount > 0) {
    return recommendation('review_only', false, ['template_false_positive', 'requires_review']);
  }

  if (input.stats.driftCriticalCount > 0) {
    return recommendation('review_only', false, ['critical_drift_detected', 'requires_review']);
  }

  if (unknownRate(input.stats) > 0.15) {
    return recommendation('degraded', false, ['unknown_rate_spike', 'template_degraded']);
  }

  if (canBecomeTrusted(input.stats)) {
    return recommendation('trusted', true, ['template_trusted_evidence_met']);
  }

  if (canBecomeTrustedLowAmount(input.stats)) {
    return recommendation('trusted_low_amount', true, ['template_trusted_low_amount_evidence_met']);
  }

  if (canEnterShadowTesting(input.stats)) {
    return recommendation('shadow_testing', false, ['template_shadow_testing_evidence_met']);
  }

  return recommendation('learning', false, ['template_learning', ...missingEvidenceReasonCodes(input.stats)]);
}

export function calculateTemplateReliabilityScore(stats: TemplateLearningStats): number {
  if (stats.seenCount === 0) {
    return 0;
  }

  const confidence = averageParserConfidence(stats);
  const verificationRate = stats.humanVerifiedCount / stats.seenCount;
  const shadowAgreementRate =
    stats.shadowPredictionsCount === 0 ? 0 : stats.reviewerAgreementCount / stats.shadowPredictionsCount;
  const falsePositivePenalty = stats.falsePositiveCount > 0 ? 0.6 : 0;
  const unknownPenalty = unknownRate(stats) * 0.4;
  const driftPenalty = stats.driftRate7d * 0.3 + (stats.driftCriticalCount > 0 ? 0.3 : 0);

  return clamp(confidence * 0.45 + verificationRate * 0.25 + shadowAgreementRate * 0.2 - falsePositivePenalty - unknownPenalty - driftPenalty, 0, 1);
}

export function predictTemplateMutations(canonicalTemplate: string): TemplateMutationCandidate[] {
  const normalized = canonicalizeLearningTemplate(canonicalTemplate);
  const candidates: TemplateMutationCandidate[] = [];

  candidates.push(mutation('amount_currency_format', normalized.replaceAll('<CURRENCY>', 'руб.')));
  candidates.push(mutation('phone_removed_or_masked', normalized.replaceAll('<PHONE>', '<PHONE_MASKED>')));
  candidates.push(mutation('phone_removed_or_masked', normalized.replaceAll(' <PHONE>', '')));
  candidates.push(mutation('reference_removed_or_truncated', normalized.replaceAll('<REFERENCE>', '<REFERENCE_TRUNCATED>')));
  candidates.push(mutation('reference_removed_or_truncated', normalized.replaceAll(' <REFERENCE>', '')));
  candidates.push(mutation('balance_suffix_added', `${normalized} баланс <AMOUNT> <CURRENCY>`));
  candidates.push(mutation('promo_text_added', `${normalized} акция банка`));

  return dedupeMutations(candidates);
}

function createEmptyTemplateStats(): TemplateLearningStats {
  return {
    seenCount: 0,
    humanVerifiedCount: 0,
    falsePositiveCount: 0,
    shadowPredictionsCount: 0,
    reviewerAgreementCount: 0,
    unknownCount: 0,
    parserConfidenceTotal: 0,
    driftCriticalCount: 0,
    driftRate7d: 0
  };
}

function canEnterShadowTesting(stats: TemplateLearningStats): boolean {
  return stats.seenCount >= 10 && stats.humanVerifiedCount >= 3 && stats.falsePositiveCount === 0;
}

function canBecomeTrustedLowAmount(stats: TemplateLearningStats): boolean {
  return (
    stats.seenCount >= 30 &&
    stats.humanVerifiedCount >= 15 &&
    stats.falsePositiveCount === 0 &&
    averageParserConfidence(stats) >= 0.9 &&
    unknownRate(stats) <= 0.08 &&
    stats.shadowPredictionsCount >= 30 &&
    reviewerAgreementRate(stats) >= 0.95
  );
}

function canBecomeTrusted(stats: TemplateLearningStats): boolean {
  return (
    stats.seenCount >= 100 &&
    stats.humanVerifiedCount >= 40 &&
    stats.falsePositiveCount === 0 &&
    averageParserConfidence(stats) >= 0.93 &&
    stats.driftRate7d <= 0.05 &&
    stats.shadowPredictionsCount >= 30 &&
    reviewerAgreementRate(stats) >= 0.95
  );
}

function recommendation(
  status: BankTemplateStatus,
  autoConfirmAllowedByTemplate: boolean,
  reasonCodes: string[]
): TemplateLifecycleRecommendation {
  return {
    status,
    autoConfirmAllowedByTemplate,
    reasonCodes
  };
}

function missingEvidenceReasonCodes(stats: TemplateLearningStats): string[] {
  const codes: string[] = [];

  if (stats.humanVerifiedCount < 3) {
    codes.push('insufficient_human_verification');
  }

  if (stats.seenCount < 10) {
    codes.push('insufficient_seen_count');
  }

  if (stats.shadowPredictionsCount < 30) {
    codes.push('insufficient_shadow_predictions');
  }

  return codes;
}

function mutation(family: TemplateMutationCandidate['family'], canonicalTemplate: string): TemplateMutationCandidate {
  return {
    mutationId: `mutation_${family}_${hashCanonicalTemplate(canonicalTemplate).slice(0, 12)}`,
    family,
    canonicalTemplate,
    status: 'new',
    allowAutoConfirmCandidate: false,
    reasonCodes: ['mutation_prediction', 'shadow_test_before_trust']
  };
}

function dedupeMutations(candidates: TemplateMutationCandidate[]): TemplateMutationCandidate[] {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    if (seen.has(candidate.mutationId)) {
      return false;
    }

    seen.add(candidate.mutationId);
    return true;
  });
}

function averageParserConfidence(stats: TemplateLearningStats): number {
  return stats.seenCount === 0 ? 0 : stats.parserConfidenceTotal / stats.seenCount;
}

function reviewerAgreementRate(stats: TemplateLearningStats): number {
  return stats.shadowPredictionsCount === 0 ? 0 : stats.reviewerAgreementCount / stats.shadowPredictionsCount;
}

function unknownRate(stats: TemplateLearningStats): number {
  return stats.seenCount === 0 ? 0 : stats.unknownCount / stats.seenCount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value * 1000) / 1000));
}
