import type { JournalEntry, ListParams, Money } from '../assets/@types';
import { createMockJournalEntries } from '../assets/mock/finance';
import { journalStatusLabel } from '../utils/status-label';
import { createMockResource } from './mock-api-utils';

export type CreateJournalEntryInput = Omit<JournalEntry, 'id'>;

/** Filters accepted by the journal statistics aggregate (always pre-pagination). */
export type JournalStatsParams = Pick<ListParams, 'search' | 'status'>;

export interface JournalStats {
  /** Number of entries matching the filters, ignoring pagination. */
  count: number;
  /** Sum of the matching entry amounts, as a money string. */
  totalAmount: Money;
  /** Number of matching entries still in draft. */
  draftCount: number;
}

const journalApi = createMockResource<JournalEntry, CreateJournalEntryInput>({
  initialData: createMockJournalEntries(),
  idPrefix: 'journal',
  getSearchText: (entry) =>
    [
      entry.number,
      entry.description,
      entry.status,
      entry.date,
      journalStatusLabel(entry.status),
    ].join(' '),
  getStatus: (entry) => entry.status,
  createEntity: (input, id) => ({ ...input, id }),
});

export const listJournalEntries = journalApi.list;
export const createJournalEntry = journalApi.create;

const MONEY_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/;

/**
 * Adds money strings with exact decimal alignment: values are scaled to the
 * longest fraction length and summed as BigInt, so no float rounding occurs
 * and no primitive number ever represents money. Malformed amounts are skipped.
 */
function sumMoney(values: readonly Money[]): Money {
  let fractionLength = 0;
  const parts: { negative: boolean; digits: string; wholeLength: number }[] = [];

  for (const value of values) {
    const match = MONEY_PATTERN.exec(value.trim());
    if (!match) continue;
    const [, sign, whole, fraction = ''] = match;
    fractionLength = Math.max(fractionLength, fraction.length);
    parts.push({ negative: sign === '-', digits: whole + fraction, wholeLength: whole.length });
  }

  if (parts.length === 0) return '0';

  const zero = BigInt(0);
  let total = zero;
  for (const part of parts) {
    const scaled = BigInt(part.digits.padEnd(part.wholeLength + fractionLength, '0'));
    total += part.negative ? -scaled : scaled;
  }

  const negative = total < zero;
  const absolute = negative ? -total : total;
  const digits = absolute.toString().padStart(fractionLength + 1, '0');
  const whole = digits.slice(0, digits.length - fractionLength);
  const fraction = digits.slice(digits.length - fractionLength);
  return `${negative ? '-' : ''}${whole}${fractionLength > 0 ? `.${fraction}` : ''}`;
}

/**
 * Prototype stats source (`R.table` `c.stats(a)`): aggregates the FULL set
 * matching the current search/status filters, before pagination.
 */
export async function getJournalStats(params: JournalStatsParams = {}): Promise<JournalStats> {
  const { data } = await journalApi.list({ ...params, noPage: true });

  let draftCount = 0;
  for (const entry of data) {
    if (entry.status === 'draft') draftCount += 1;
  }

  return {
    count: data.length,
    totalAmount: sumMoney(data.map((entry) => entry.amount)),
    draftCount,
  };
}
