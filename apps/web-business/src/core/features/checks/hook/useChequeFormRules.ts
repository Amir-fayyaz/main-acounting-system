'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ChequeFormRules } from '../assets/@types/cheque.types';
import { checksApi } from '../lib/checks-api';
import { resolveChequeErrorMessage } from '../lib/checks-api.errors';

export type UseChequeFormRulesState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; rules: ChequeFormRules };

export interface UseChequeFormRulesResult {
  state: UseChequeFormRulesState;
  retry: () => void;
}

const FALLBACK_ERROR = 'دریافت قواعد فرم چک از سرور امکان‌پذیر نشد.';

/** قواعد Sayad/شماره چک را از API می‌گیرد؛ مرجع اعتبارسنجی سرور است. */
export function useChequeFormRules(): UseChequeFormRulesResult {
  const [state, setState] = useState<UseChequeFormRulesState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let isMounted = true;

    checksApi
      .getFormRules()
      .then((rules) => {
        if (isMounted) setState({ status: 'success', rules });
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setState({
            status: 'error',
            message: resolveChequeErrorMessage(error, FALLBACK_ERROR),
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [version]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setVersion((current) => current + 1);
  }, []);

  return { state, retry };
}
