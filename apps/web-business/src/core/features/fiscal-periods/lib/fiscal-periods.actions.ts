'use server';

import { serializeApiError, type ApiErrorData } from '@repo/web/api';

import type { FiscalPeriod, FiscalStats, FiscalYear } from '../assets/@types';
import { resolveFiscalContext } from './fiscal-periods.context';
import { toFiscalPeriodView, toFiscalStats, toFiscalYearView } from './fiscal-periods.mapper';
import {
  fetchFiscalPeriods,
  fetchFiscalYears,
  requestClosePeriod,
  requestReopenPeriod,
} from './fiscal-periods.requests';

export type FiscalYearsResult =
  | { readonly ok: true; readonly years: FiscalYear[] }
  | { readonly ok: false; readonly error: ApiErrorData };

export type FiscalPeriodsResult =
  | { readonly ok: true; readonly periods: FiscalPeriod[]; readonly stats: FiscalStats }
  | { readonly ok: false; readonly error: ApiErrorData };

export type FiscalPeriodResult =
  | { readonly ok: true; readonly period: FiscalPeriod }
  | { readonly ok: false; readonly error: ApiErrorData };

export async function loadFiscalYearsAction(): Promise<FiscalYearsResult> {
  const contextResult = await resolveFiscalContext();
  if (!contextResult.ok) return contextResult;

  try {
    const years = await fetchFiscalYears(
      contextResult.context.token,
      contextResult.context.tenantId,
    );

    return { ok: true, years: years.map(toFiscalYearView) };
  } catch (error: unknown) {
    return { ok: false, error: serializeApiError(error) };
  }
}

export async function loadFiscalPeriodsAction(fiscalYearId: string): Promise<FiscalPeriodsResult> {
  const contextResult = await resolveFiscalContext();
  if (!contextResult.ok) return contextResult;

  try {
    const dtos = await fetchFiscalPeriods(
      contextResult.context.token,
      contextResult.context.tenantId,
      fiscalYearId,
    );
    const periods = dtos.map(toFiscalPeriodView);

    return { ok: true, periods, stats: toFiscalStats(periods) };
  } catch (error: unknown) {
    return { ok: false, error: serializeApiError(error) };
  }
}

export async function closeFiscalPeriodAction(periodId: string): Promise<FiscalPeriodResult> {
  const contextResult = await resolveFiscalContext();
  if (!contextResult.ok) return contextResult;

  try {
    const dto = await requestClosePeriod(
      contextResult.context.token,
      contextResult.context.tenantId,
      periodId,
    );

    return { ok: true, period: toFiscalPeriodView(dto) };
  } catch (error: unknown) {
    return { ok: false, error: serializeApiError(error) };
  }
}

export async function reopenFiscalPeriodAction(
  periodId: string,
  reason: string,
): Promise<FiscalPeriodResult> {
  const contextResult = await resolveFiscalContext();
  if (!contextResult.ok) return contextResult;

  try {
    const dto = await requestReopenPeriod(
      contextResult.context.token,
      contextResult.context.tenantId,
      periodId,
      reason,
    );

    return { ok: true, period: toFiscalPeriodView(dto) };
  } catch (error: unknown) {
    return { ok: false, error: serializeApiError(error) };
  }
}
