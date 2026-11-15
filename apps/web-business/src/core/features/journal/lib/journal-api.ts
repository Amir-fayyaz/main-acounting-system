import type { PaginatedResponse } from '@repo/web';
import type { JournalEntry, JournalStats, ListJournalParams } from '../assets/@types';
import { createInitialJournalEntries } from '../assets/mock/journal';

let memoryEntries: JournalEntry[] = createInitialJournalEntries();

export function resetJournalStore(): void {
  memoryEntries = createInitialJournalEntries();
}

function filterEntries(params: ListJournalParams): JournalEntry[] {
  let filtered = [...memoryEntries];

  if (params.status && params.status !== 'all') {
    filtered = filtered.filter((entry) => entry.status === params.status);
  }

  if (params.search && params.search.trim() !== '') {
    const term = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (entry) =>
        entry.number.toLowerCase().includes(term) ||
        entry.description.toLowerCase().includes(term) ||
        entry.date.includes(term),
    );
  }

  return filtered;
}

export async function listJournalEntries(
  params: ListJournalParams = {},
): Promise<PaginatedResponse<JournalEntry>> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, Math.min(100, params.limit ?? 10));

  const filtered = filterEntries(params);
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const data = filtered.slice(startIndex, startIndex + limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function getJournalStats(
  params: Pick<ListJournalParams, 'search' | 'status'> = {},
): Promise<JournalStats> {
  const filtered = filterEntries(params);

  const totalCents = filtered.reduce((acc, entry) => {
    const intPart = BigInt(entry.amount.split('.')[0] || '0');
    return acc + intPart;
  }, BigInt(0));

  const draftCount = filtered.filter((entry) => entry.status === 'draft').length;

  return {
    count: filtered.length,
    totalAmount: `${totalCents.toString()}.00`,
    draftCount,
  };
}

export function getNextJournalNumber(): string {
  const highest = memoryEntries.reduce((max, entry) => {
    const num = parseInt(entry.number, 10);
    return Number.isFinite(num) && num > max ? num : max;
  }, 1405000);

  return String(highest + 1);
}

export async function createJournalEntry(entry: Omit<JournalEntry, 'id'>): Promise<JournalEntry> {
  const newEntry: JournalEntry = {
    ...entry,
    id: `journal-${Date.now()}`,
  };

  memoryEntries = [newEntry, ...memoryEntries];
  return newEntry;
}
