'use client';

import { useEffect, useState } from 'react';

import type { DashboardSnapshot } from '../assets/@types';
import type { Cheque, Invoice } from '../../panel/assets/@types/finance';
import { getDashboardSnapshot } from '../lib/dashboard-api';
import { listCheques } from '../../panel/lib/cheques-api';
import { listInvoices } from '../../panel/lib/invoices-api';

export type DashboardState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; snapshot: DashboardSnapshot; invoices: Invoice[]; cheques: Cheque[] };

export function useDashboard() {
  const [state, setState] = useState<DashboardState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getDashboardSnapshot(),
      listInvoices({ page: 1, limit: 5 }),
      listCheques({ noPage: true }),
    ])
      .then(([snapshot, invoiceResponse, chequeResponse]) => {
        if (isMounted) {
          setState({
            status: 'success',
            snapshot,
            invoices: invoiceResponse.data,
            cheques: chequeResponse.data,
          });
        }
      })
      .catch(() => {
        if (isMounted) setState({ status: 'error' });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
