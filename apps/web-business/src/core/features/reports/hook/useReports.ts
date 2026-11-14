'use client';

import { useEffect, useRef, useState } from 'react';

import type { ReportGroup } from '../assets/@types/reports';
import { branches, statuses } from '../assets/mock/reports';
import { findReport, listReportGroups } from '../lib/reports-api';

export type ReportsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; reportGroups: readonly ReportGroup[] };

export function useReports() {
  const [state, setState] = useState<ReportsState>({ status: 'loading' });
  const isMounted = useRef(true);

  const fetchReports = () => {
    listReportGroups()
      .then((reportGroups) => {
        if (isMounted.current) {
          setState({ status: 'success', reportGroups });
        }
      })
      .catch(() => {
        if (isMounted.current) {
          setState({ status: 'error' });
        }
      });
  };

  useEffect(() => {
    fetchReports();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const retry = () => {
    setState({ status: 'loading' });
    fetchReports();
  };

  return {
    state,
    branches,
    statuses,
    findReport: (reportId: string) => {
      if (state.status !== 'success') return null;
      return findReport(state.reportGroups, reportId);
    },
    retry,
  };
}
