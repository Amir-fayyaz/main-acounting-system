'use client';

import { useCallback } from 'react';

import type { Account, CreateAccountRequest } from '../assets/@types/account.types';
import { accountsApi } from '../lib/accounts-api';

export type CreateAccount = (payload: CreateAccountRequest) => Promise<Account>;

export function useCreateAccount(): CreateAccount {
  return useCallback<CreateAccount>(
    (payload) => accountsApi.create(payload),
    [],
  );
}
