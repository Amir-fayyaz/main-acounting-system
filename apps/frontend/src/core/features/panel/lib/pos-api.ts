import type { PosTerminal } from '../assets/@types';
import { createMockPosTerminals } from '../assets/mock/finance';
import { recordStatusLabel } from '../utils/status-label';
import { createMockResource } from './mock-api-utils';

export type CreatePosTerminalInput = Omit<PosTerminal, 'id'>;

const posApi = createMockResource<PosTerminal, CreatePosTerminalInput>({
  initialData: createMockPosTerminals(),
  idPrefix: 'pos',
  getSearchText: (terminal) =>
    [
      terminal.title,
      terminal.terminalNumber,
      terminal.merchantNumber,
      terminal.bankName,
      terminal.status,
      recordStatusLabel(terminal.status),
    ].join(' '),
  getStatus: (terminal) => terminal.status,
  createEntity: (input, id) => ({ ...input, id }),
});

export const listPosTerminals = posApi.list;
export const createPosTerminal = posApi.create;
