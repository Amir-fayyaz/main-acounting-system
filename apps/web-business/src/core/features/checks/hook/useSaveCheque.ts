'use client';

import { useCallback } from 'react';

import type { Cheque, CreateChequeRequest } from '../assets/@types/cheque.types';
import { checksApi } from '../lib/checks-api';

export type SaveChequeMode = 'create' | 'edit';

export type SaveCheque = (
  payload: CreateChequeRequest,
  mode: SaveChequeMode,
  cheque: Cheque | null,
) => Promise<Cheque>;

export function useSaveCheque(): SaveCheque {
  return useCallback<SaveCheque>(
    (payload, mode, cheque) => {
      if (mode === 'edit' && cheque) {
        return checksApi.update({
          ...payload,
          id: cheque.id,
          expectedRevision: cheque.revision,
        });
      }

      return checksApi.create(payload);
    },
    [],
  );
}
