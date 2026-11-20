import type { PaginatedResponse } from '@repo/web';

import type {
  CreatePosTerminalRequest,
  PosTerminal,
  PosTerminalDto,
  PosTerminalListParams,
} from '../assets/@types/pos-terminal.types';
import { createMockPosTerminalDtos } from '../assets/mock/pos-terminals.mock';
import {
  mapCreatePosTerminalRequestToDto,
  mapPosTerminalDtoToPosTerminal,
} from './pos-api.mapper';
import {
  filterPosTerminalDtos,
  toPosTerminalsPage,
} from './pos-api.query';
import { createPosTerminalStore } from './pos-api.store';
import { assertValidPosTerminalPayload, validatePosTerminalPayload } from './pos-api.validation';
import { findDuplicateTerminal } from './pos-terminal.conflicts';

export interface PosApi {
  list(params?: PosTerminalListParams): Promise<PaginatedResponse<PosTerminal>>;
  findByTerminalNumber(terminalNumber: string): Promise<PosTerminal | null>;
  create(payload: CreatePosTerminalRequest): Promise<PosTerminal>;
}

export interface PosApiOptions {
  /** در تست‌ها صفر می‌شود تا پاسخ‌ها فوری باشند. */
  latencyMs?: number;
  initialDtos?: PosTerminalDto[];
}

function waitForMockResponse(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createPosApi(options: PosApiOptions = {}): PosApi {
  const latencyMs = options.latencyMs ?? 0;
  const store = createPosTerminalStore(options.initialDtos ?? createMockPosTerminalDtos());

  const list = async (
    params: PosTerminalListParams = {},
  ): Promise<PaginatedResponse<PosTerminal>> => {
    await waitForMockResponse(latencyMs);
    const filteredDtos = filterPosTerminalDtos(store.all(), params);

    return toPosTerminalsPage(filteredDtos, params.page, params.limit);
  };

  const findByTerminalNumber = async (terminalNumber: string): Promise<PosTerminal | null> => {
    await waitForMockResponse(latencyMs);
    const found = findDuplicateTerminal(store.all(), terminalNumber);

    return found ? mapPosTerminalDtoToPosTerminal(found) : null;
  };

  const create = async (payload: CreatePosTerminalRequest): Promise<PosTerminal> => {
    await waitForMockResponse(latencyMs);
    const validation = validatePosTerminalPayload(payload, store.all());
    assertValidPosTerminalPayload(validation);

    const dto = mapCreatePosTerminalRequestToDto(payload, store.nextId());
    store.prepend(dto);

    return mapPosTerminalDtoToPosTerminal(dto);
  };

  return { list, findByTerminalNumber, create };
}

export const posApi = createPosApi({ latencyMs: 250 });
