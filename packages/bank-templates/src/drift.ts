import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

import type { BankTemplateStatus, DirectionLabel } from './types.js';
import { repairFixtureEncoding } from './fixtures.js';

export type TemplateDriftStatus = 'stable' | 'minor_drift' | 'major_drift' | 'critical_drift';

export interface KnownBankTemplate {
  templateId: string;
  bankProfileId: string;
  status: BankTemplateStatus;
  directionLabel: DirectionLabel;
  patterns: string[];
}

export interface TemplateObservation {
  observationId: string;
  bankProfileId: string;
  text: string;
  directionLabel: DirectionLabel;
  signalQuality: number;
  amountPresent: boolean;
  phonePresent: boolean;
  referencePresent: boolean;
}

export interface NewTemplateCandidate {
  observationId: string;
  bankProfileId: string;
  canonicalTemplate: string;
  bestTemplateId: string | null;
  similarityToBestTemplate: number;
  status: 'new';
  recommendedStatus: 'learning';
  allowAutoConfirmCandidate: false;
  reasonCodes: string[];
}

export interface BankTemplateDriftMetrics {
  totalObserved: number;
  unknownCount: number;
  unknownRate24h: number;
  parserConfidenceMedian24h: number;
  amountExtractionSuccessRate24h: number;
  phoneVisibilityRate24h: number;
  referenceVisibilityRate24h: number;
  phoneOrReferenceVisibilityRate24h: number;
  newTemplateCount24h: number;
  similarityToBestTemplate: number;
}

export interface BankTemplateDriftEvaluation {
  bankProfileId: string;
  status: TemplateDriftStatus;
  metrics: BankTemplateDriftMetrics;
  newTemplateCandidates: NewTemplateCandidate[];
  recommendedBankAutoConfirmStatus: 'unchanged' | 'shadow_testing' | 'review_only';
  autoConfirmAllowedForBank: boolean;
  reasonCodes: string[];
}

export interface TemplateDriftEvent {
  eventType: 'template.drift_detected';
  eventId: string;
  version: 1;
  occurredAt: string;
  bankProfileId: string;
  data: {
    bankProfileId: string;
    status: TemplateDriftStatus;
    recommendedBankAutoConfirmStatus: BankTemplateDriftEvaluation['recommendedBankAutoConfirmStatus'];
    autoConfirmAllowedForBank: boolean;
    reasonCodes: string[];
    metrics: BankTemplateDriftMetrics;
    newTemplateCandidates: NewTemplateCandidate[];
  };
}

export interface EvaluateBankTemplateDriftInput {
  bankProfileId: string;
  knownTemplates: KnownBankTemplate[];
  observations: TemplateObservation[];
}

const NEW_TEMPLATE_SIMILARITY_THRESHOLD = 0.78;
const TEMPLATE_DRIFT_DETECTED_EVENT_TYPE = 'template.drift_detected' as const;

export function evaluateBankTemplateDrift(input: EvaluateBankTemplateDriftInput): BankTemplateDriftEvaluation {
  const observations = input.observations.filter((observation) => observation.bankProfileId === input.bankProfileId);
  const templates = input.knownTemplates.filter((template) => template.bankProfileId === input.bankProfileId);
  const newTemplateCandidates = detectNewTemplateCandidates(observations, templates);
  const metrics = calculateDriftMetrics(observations, templates, newTemplateCandidates);
  const status = classifyDriftStatus(metrics);
  const reasonCodes = buildDriftReasonCodes(status, metrics, newTemplateCandidates);

  return {
    bankProfileId: input.bankProfileId,
    status,
    metrics,
    newTemplateCandidates,
    recommendedBankAutoConfirmStatus: recommendedAutoConfirmStatus(status),
    autoConfirmAllowedForBank: status !== 'critical_drift',
    reasonCodes
  };
}

export function detectNewTemplateCandidates(
  observations: TemplateObservation[],
  knownTemplates: KnownBankTemplate[]
): NewTemplateCandidate[] {
  return observations
    .map((observation) => {
      const bestMatch = findBestTemplateMatch(observation.text, knownTemplates);
      const isUnknown = observation.directionLabel === 'unknown' || bestMatch.similarityToBestTemplate < NEW_TEMPLATE_SIMILARITY_THRESHOLD;

      if (!isUnknown) {
        return null;
      }

      return {
        observationId: observation.observationId,
        bankProfileId: observation.bankProfileId,
        canonicalTemplate: canonicalizeTemplateText(observation.text),
        bestTemplateId: bestMatch.bestTemplateId,
        similarityToBestTemplate: bestMatch.similarityToBestTemplate,
        status: 'new' as const,
        recommendedStatus: 'learning' as const,
        allowAutoConfirmCandidate: false as const,
        reasonCodes: [
          'new_template_candidate',
          bestMatch.similarityToBestTemplate < NEW_TEMPLATE_SIMILARITY_THRESHOLD
            ? 'low_template_similarity'
            : 'unknown_direction_detected'
        ]
      };
    })
    .filter((candidate): candidate is NewTemplateCandidate => candidate !== null);
}

export function calculateTemplateSimilarity(left: string, right: string): number {
  const leftTokens = tokenizeCanonicalText(canonicalizeTemplateText(left));
  const rightTokens = tokenizeCanonicalText(canonicalizeTemplateText(right));

  if (leftTokens.size === 0 && rightTokens.size === 0) {
    return 1;
  }

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = Math.min(leftTokens.size, rightTokens.size);

  return union === 0 ? 0 : roundMetric(intersection / union);
}

export function canonicalizeTemplateText(text: string): string {
  return repairFixtureEncoding(text)
    .normalize('NFKC')
    .toLocaleLowerCase('ru-RU')
    .replace(/\bSWP-[A-Z0-9]{3,12}\b/giu, '<reference>')
    .replace(/(?:\+7|8)?[\s(.-]*\d{3}[\s).-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/gu, '<phone>')
    .replace(/(?<=от\s)[а-яё]+(?=\s+<phone>)/giu, '<person>')
    .replace(/\d[\d\s]*(?:[,.]\d{1,2})?\s*(?:₽|руб\.?|RUB)/giu, '<amount> <currency>')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function createTemplateDriftEvent(input: {
  eventId: string;
  occurredAt: string;
  evaluation: BankTemplateDriftEvaluation;
}): TemplateDriftEvent {
  return {
    eventType: TEMPLATE_DRIFT_DETECTED_EVENT_TYPE,
    eventId: input.eventId,
    version: 1,
    occurredAt: input.occurredAt,
    bankProfileId: input.evaluation.bankProfileId,
    data: {
      bankProfileId: input.evaluation.bankProfileId,
      status: input.evaluation.status,
      recommendedBankAutoConfirmStatus: input.evaluation.recommendedBankAutoConfirmStatus,
      autoConfirmAllowedForBank: input.evaluation.autoConfirmAllowedForBank,
      reasonCodes: input.evaluation.reasonCodes,
      metrics: input.evaluation.metrics,
      newTemplateCandidates: input.evaluation.newTemplateCandidates
    }
  };
}

export async function loadBankTemplatesFromDirectory(directory = getDefaultBankTemplatesDirectory()): Promise<KnownBankTemplate[]> {
  const bankEntries = await readdir(directory, { withFileTypes: true });
  const templates: KnownBankTemplate[] = [];

  for (const bankEntry of bankEntries) {
    if (!bankEntry.isDirectory()) {
      continue;
    }

    const templatesDirectory = join(directory, bankEntry.name, 'templates');
    const templateEntries = await readdir(templatesDirectory, { withFileTypes: true });

    for (const templateEntry of templateEntries) {
      if (templateEntry.isFile() && templateEntry.name.endsWith('.yml')) {
        const templatePath = join(templatesDirectory, templateEntry.name);
        const document = parseYaml(await readFile(templatePath, 'utf8')) as unknown;
        templates.push(validateTemplateDocument(document, templatePath));
      }
    }
  }

  return templates.sort((left, right) => left.templateId.localeCompare(right.templateId));
}

export function getDefaultBankTemplatesDirectory(): string {
  return resolve(fileURLToPath(new URL('../banks', import.meta.url)));
}

function calculateDriftMetrics(
  observations: TemplateObservation[],
  templates: KnownBankTemplate[],
  newTemplateCandidates: NewTemplateCandidate[]
): BankTemplateDriftMetrics {
  const totalObserved = observations.length;
  const unknownCount = observations.filter((observation) => observation.directionLabel === 'unknown').length;
  const similarities = observations.map((observation) => findBestTemplateMatch(observation.text, templates).similarityToBestTemplate);
  const phoneOrReferenceVisible = observations.filter((observation) => observation.phonePresent || observation.referencePresent).length;

  return {
    totalObserved,
    unknownCount,
    unknownRate24h: totalObserved === 0 ? 0 : roundMetric(unknownCount / totalObserved),
    parserConfidenceMedian24h: median(observations.map((observation) => observation.signalQuality / 100)),
    amountExtractionSuccessRate24h:
      totalObserved === 0 ? 1 : roundMetric(observations.filter((observation) => observation.amountPresent).length / totalObserved),
    phoneVisibilityRate24h:
      totalObserved === 0 ? 1 : roundMetric(observations.filter((observation) => observation.phonePresent).length / totalObserved),
    referenceVisibilityRate24h:
      totalObserved === 0 ? 1 : roundMetric(observations.filter((observation) => observation.referencePresent).length / totalObserved),
    phoneOrReferenceVisibilityRate24h: totalObserved === 0 ? 1 : roundMetric(phoneOrReferenceVisible / totalObserved),
    newTemplateCount24h: newTemplateCandidates.length,
    similarityToBestTemplate: similarities.length === 0 ? 1 : Math.max(...similarities)
  };
}

function classifyDriftStatus(metrics: BankTemplateDriftMetrics): TemplateDriftStatus {
  if (metrics.unknownRate24h > 0.25 && metrics.amountExtractionSuccessRate24h < 0.8) {
    return 'critical_drift';
  }

  if (metrics.unknownRate24h > 0.12 || metrics.parserConfidenceMedian24h < 0.85) {
    return 'major_drift';
  }

  if (metrics.unknownRate24h > 0.05 || metrics.newTemplateCount24h > 0) {
    return 'minor_drift';
  }

  return 'stable';
}

function buildDriftReasonCodes(
  status: TemplateDriftStatus,
  metrics: BankTemplateDriftMetrics,
  newTemplateCandidates: NewTemplateCandidate[]
): string[] {
  const codes = new Set<string>();
  codes.add(`${status}_detected`);

  if (newTemplateCandidates.length > 0) {
    codes.add('new_template_candidate');
  }

  if (metrics.unknownRate24h > 0.05) {
    codes.add('unknown_rate_elevated');
  }

  if (metrics.amountExtractionSuccessRate24h < 0.8) {
    codes.add('amount_extraction_drop');
  }

  if (metrics.phoneOrReferenceVisibilityRate24h < 0.5) {
    codes.add('phone_or_reference_visibility_drop');
  }

  if (status === 'critical_drift') {
    codes.add('auto_confirm_disabled_for_bank');
  }

  return [...codes];
}

function recommendedAutoConfirmStatus(status: TemplateDriftStatus): BankTemplateDriftEvaluation['recommendedBankAutoConfirmStatus'] {
  if (status === 'critical_drift' || status === 'major_drift') {
    return 'review_only';
  }

  if (status === 'minor_drift') {
    return 'shadow_testing';
  }

  return 'unchanged';
}

function findBestTemplateMatch(text: string, templates: KnownBankTemplate[]): {
  bestTemplateId: string | null;
  similarityToBestTemplate: number;
} {
  let bestTemplateId: string | null = null;
  let bestSimilarity = 0;

  for (const template of templates) {
    for (const pattern of [template.patterns.join(' '), ...template.patterns]) {
      const similarity = calculateTemplateSimilarity(pattern, text);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestTemplateId = template.templateId;
      }
    }
  }

  return {
    bestTemplateId,
    similarityToBestTemplate: bestSimilarity
  };
}

function validateTemplateDocument(document: unknown, templatePath: string): KnownBankTemplate {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error(`Bank template document must be an object: ${templatePath}`);
  }

  const record = document as Record<string, unknown>;
  const match = asRecord(record.match);
  const patterns = [
    ...arrayOfStrings(match.title_any),
    ...arrayOfStrings(match.body_any),
    ...arrayOfStrings(record.positive_keywords),
    ...arrayOfStrings(record.negative_keywords)
  ].map((pattern) => repairFixtureEncoding(pattern));

  return {
    templateId: requireString(record.template_id, 'template_id'),
    bankProfileId: requireString(record.bank_profile_id, 'bank_profile_id'),
    status: requireTemplateStatus(record.status),
    directionLabel: requireDirectionLabel(record.direction_label),
    patterns
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Bank template field ${field} must be a non-empty string.`);
  }

  return value.trim();
}

function requireTemplateStatus(value: unknown): BankTemplateStatus {
  const status = requireString(value, 'status');
  if (!['new', 'learning', 'shadow_testing', 'trusted_low_amount', 'trusted', 'degraded', 'review_only', 'disabled'].includes(status)) {
    throw new Error(`Bank template status is invalid: ${status}`);
  }

  return status as BankTemplateStatus;
}

function requireDirectionLabel(value: unknown): DirectionLabel {
  const label = requireString(value, 'direction_label');
  if (
    ![
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
      'unknown_ambiguous_direction'
    ].includes(label)
  ) {
    throw new Error(`Bank template direction_label is invalid: ${label}`);
  }

  return label as DirectionLabel;
}

function tokenizeCanonicalText(text: string): Set<string> {
  return new Set(text.split(/[^a-zа-яё0-9<>_]+/iu).filter((token) => token.length > 0));
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 1;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return roundMetric(sorted[middle] ?? 0);
  }

  return roundMetric(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
}

function roundMetric(value: number): number {
  return Math.round(value * 1000) / 1000;
}
