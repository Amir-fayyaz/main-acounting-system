'use client';

import { useEffect, useState } from 'react';

import type { ReportGroup } from '../assets/@types/reports';
import { branches, statuses } from '../assets/mock/reports';
import { findReport, listReportGroups } from '../lib/reports-api';

export type ReportsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; reportGroups: readonly ReportGroup[] };

export function useReports() {
  const [state, setState] = useState<ReportsState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;

    listReportGroups()
      .then((reportGroups) => {
        if (isMounted) {
          setState({ status: 'success', reportGroups });
        }
      })
      .catch(() => {
        if (isMounted) setState({ status: 'error' });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    state,
    branches,
    statuses,
    findReport: (reportId: string) => {
      if (state.status !== 'success') return null;
      return findReport(state.reportGroups, reportId);
    },
  };
}
