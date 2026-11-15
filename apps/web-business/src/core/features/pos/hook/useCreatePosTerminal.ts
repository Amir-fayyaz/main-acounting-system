'use client';

import { useCallback } from 'react';

import type {
  CreatePosTerminalRequest,
  PosTerminal,
} from '../assets/@types/pos-terminal.types';
import { posApi } from '../lib/pos-api';

export type CreatePosTerminal = (payload: CreatePosTerminalRequest) => Promise<PosTerminal>;

export function useCreatePosTerminal(): CreatePosTerminal {
  return useCallback<CreatePosTerminal>((payload) => posApi.create(payload), []);
}
