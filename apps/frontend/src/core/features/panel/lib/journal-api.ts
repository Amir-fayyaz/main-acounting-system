import type { JournalEntry } from '../assets/@types';
import { createMockJournalEntries } from '../assets/mock/finance';
import { journalStatusLabel } from '../utils/status-label';
import { createMockResource } from './mock-api-utils';

export type CreateJournalEntryInput = Omit<JournalEntry, 'id'>;

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
