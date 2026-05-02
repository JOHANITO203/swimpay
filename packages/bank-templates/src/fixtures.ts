import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import type { DirectionLabel } from './types.js';

export interface BankTemplateFixtureExpected {
  direction_label: DirectionLabel;
  amount_present: boolean;
  phone_present: boolean;
  reference_present: boolean;
  auto_confirm_candidate: boolean;
  reason_codes: string[];
}

export interface BankTemplateFixture {
  fixture_id: string;
  bank_profile_id: string;
  locale: string;
  title: string;
  body: string;
  expected: BankTemplateFixtureExpected;
}

export interface LoadedBankTemplateFixture extends BankTemplateFixture {
  sourceFile: string;
  parserText: string;
}

const SAFE_PLACEHOLDERS: Record<string, string> = {
  '<BALANCE_AMOUNT>': '9137',
  '<AMOUNT>': '137',
  '<CURRENCY>': '₽',
  '<PHONE>': '+7 999 123-45-67',
  '<PERSON>': 'Иван',
  '<REFERENCE>': 'SWP-A8K2',
  '<CARD_MASK>': '**1234'
};

const FIXTURE_ENCODING_REPAIRS: Record<string, string> = {
  'ÐŸÐ¾ÑÑ‚ÑƒÐ¿Ð»ÐµÐ½Ð¸Ðµ': 'Поступление',
  'Ð—Ð°Ñ‡Ð¸ÑÐ»ÐµÐ½Ð¸Ðµ': 'Зачисление',
  'Ð’Ð°Ð¼ Ð¿ÐµÑ€ÐµÐ²ÐµÐ»Ð¸': 'Вам перевели',
  'ÐŸÐµÑ€ÐµÐ²Ð¾Ð´ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð»ÐµÐ½': 'Перевод отправлен',
  'ÐŸÐµÑ€ÐµÐ²Ð¾Ð´ Ð¾Ñ‚': 'Перевод от',
  'ÐŸÐµÑ€ÐµÐ²Ð¾Ð´ Ð¿Ð¾Ð»ÑƒÑ‡ÐµÐ½': 'Перевод получен',
  'ÐŸÐ¾Ð»ÑƒÑ‡ÐµÐ½ Ð¿ÐµÑ€ÐµÐ²Ð¾Ð´ Ð¾Ñ‚': 'Получен перевод от',
  'ÐšÐ¾Ð¼Ð¼ÐµÐ½Ñ‚Ð°Ñ€Ð¸Ð¹': 'Комментарий',
  'ÐšÐ¾Ð¼Ð¼ÐµÐ½Ñ‚': 'Коммент',
  'ÐšÑÑˆÐ±ÑÐº': 'Кэшбэк',
  'ÐºÑÑˆÐ±ÑÐº': 'кэшбэк',
  'ÐÐ°Ñ‡Ð¸ÑÐ»ÐµÐ½': 'Начислен',
  'Ð’Ð¾Ð·Ð²Ñ€Ð°Ñ‚': 'Возврат',
  'Ð²Ð¾Ð·Ð²Ñ€Ð°Ñ‚': 'возврат',
  'ÑÑ€ÐµÐ´ÑÑ‚Ð²': 'средств',
  'ÐŸÐ¾ÐºÑƒÐ¿ÐºÐ°': 'Покупка',
  'Ð¿Ð¾ÐºÑƒÐ¿ÐºÑƒ': 'покупку',
  'ÐžÐ¿Ð»Ð°Ñ‚Ð°': 'Оплата',
  'ÐžÐ¿ÐµÑ€Ð°Ñ†Ð¸Ñ': 'Операция',
  'Ð¾Ñ‚ÐºÐ»Ð¾Ð½ÐµÐ½Ð°': 'отклонена',
  'Ð½Ðµ Ð²Ñ‹Ð¿Ð¾Ð»Ð½ÐµÐ½Ð¾': 'не выполнено',
  'Ð½Ðµ Ð²Ñ‹Ð¿Ð¾Ð»Ð½ÐµÐ½': 'не выполнен',
  'Ð¡Ð¿ÐµÑ†Ð¸Ð°Ð»ÑŒÐ½Ð¾Ðµ Ð¿Ñ€ÐµÐ´Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ': 'Специальное предложение',
  'ÐŸÑ€ÐµÐ´Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ': 'Предложение',
  'Ð¡ÐºÐ¸Ð´ÐºÐ°': 'Скидка',
  'Ð±Ð¾Ð½ÑƒÑÑ‹': 'бонусы',
  'Ð´Ð»Ñ ÐºÐ»Ð¸ÐµÐ½Ñ‚Ð¾Ð²': 'для клиентов',
  'ÐÐºÑ†Ð¸Ñ Ð±Ð°Ð½ÐºÐ°': 'Акция банка',
  'Ð‘Ð°Ð»Ð°Ð½Ñ': 'Баланс',
  'Ð’Ñ‹ Ð¿ÐµÑ€ÐµÐ²ÐµÐ»Ð¸ Ð´ÐµÐ½ÑŒÐ³Ð¸': 'Вы перевели деньги',
  'ÐšÐ°Ñ€Ñ‚Ð°': 'Карта'
};

export async function loadJsonlFixturesFromFile(filePath: string): Promise<LoadedBankTemplateFixture[]> {
  const content = await readFile(filePath, 'utf8');
  const lines = content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  return lines.map((line) => {
    const fixture = JSON.parse(line) as BankTemplateFixture;

    return {
      ...fixture,
      sourceFile: filePath,
      parserText: materializeFixtureText(fixture)
    };
  }).map((fixture, index) => validateFixtureShape(fixture, filePath, index + 1));
}

export async function loadAllBankTemplateFixtures(rootDirectory = getDefaultFixturesRoot()): Promise<LoadedBankTemplateFixture[]> {
  const fixtureFiles = [
    path.join(rootDirectory, 'fixtures', 'global_redacted_notifications.jsonl'),
    path.join(rootDirectory, 'fixtures', 'adversarial_notifications.jsonl'),
    ...(await listBankFixtureFiles(path.join(rootDirectory, 'banks')))
  ];

  const loaded = await Promise.all(fixtureFiles.map((filePath) => loadJsonlFixturesFromFile(filePath)));
  return loaded.flat();
}

export function getDefaultFixturesRoot(): string {
  return path.resolve(process.cwd(), 'packages', 'bank-templates');
}

export function materializeFixtureText(fixture: BankTemplateFixture): string {
  const combined = `${fixture.title}\n${fixture.body}`;
  const repaired = repairFixtureEncoding(combined);

  return Object.entries(SAFE_PLACEHOLDERS).reduce(
    (text, [placeholder, replacement]) => text.replaceAll(placeholder, replacement),
    repaired
  );
}

export function repairFixtureEncoding(text: string): string {
  return Object.entries(FIXTURE_ENCODING_REPAIRS).reduce(
    (repaired, [broken, replacement]) => repaired.replaceAll(broken, replacement),
    text
  );
}

async function listBankFixtureFiles(banksDirectory: string): Promise<string[]> {
  const entries = await readdir(banksDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(banksDirectory, entry.name, 'fixtures', 'redacted_samples.jsonl'))
    .sort((left, right) => left.localeCompare(right));
}

function validateFixtureShape<T extends LoadedBankTemplateFixture>(fixture: T, filePath: string, lineNumber: number): T {
  if (!fixture.fixture_id || !fixture.bank_profile_id || !fixture.expected) {
    throw new Error(`Invalid fixture shape in ${filePath}:${lineNumber}`);
  }

  return fixture;
}
