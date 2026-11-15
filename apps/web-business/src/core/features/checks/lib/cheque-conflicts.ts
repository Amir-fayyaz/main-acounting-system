import { toAsciiDigits } from '../../shared';
import type { ChequeDto, ChequeFormRules } from '../assets/@types/cheque.types';

export const DUPLICATE_SAYAD_MESSAGE = 'این شناسه صیادی قبلاً ثبت شده است.';

export function duplicateNumberMessage(
  scope: ChequeFormRules['duplicateNumberScope'],
): string {
  return scope === 'global'
    ? 'چکی با این شماره قبلاً ثبت شده است.'
    : 'چکی با این شماره برای همین بانک قبلاً ثبت شده است.';
}

export interface DuplicateChequeMatches {
  number: ChequeDto | null;
  sayadId: ChequeDto | null;
}

interface DuplicateChequeQuery {
  number: string;
  bank: string;
  sayadId: string;
  excludeId?: string;
}

function normalizeDigits(value: string): string {
  return toAsciiDigits(value).trim();
}

export function findDuplicateCheques(
  dtos: readonly ChequeDto[],
  query: DuplicateChequeQuery,
  scope: ChequeFormRules['duplicateNumberScope'] = 'bank',
): DuplicateChequeMatches {
  const number = normalizeDigits(query.number);
  const sayadId = normalizeDigits(query.sayadId);
  const bank = query.bank.trim();
  const candidates = query.excludeId
    ? dtos.filter((dto) => dto.id !== query.excludeId)
    : [...dtos];

  const numberMatch =
    number && (scope === 'global' || bank)
      ? (candidates.find(
          (dto) =>
            normalizeDigits(dto.number) === number &&
            (scope === 'global' || dto.bank.trim() === bank),
        ) ?? null)
      : null;
  const sayadMatch = sayadId
    ? (candidates.find((dto) => normalizeDigits(dto.sayadId) === sayadId) ?? null)
    : null;

  return { number: numberMatch, sayadId: sayadMatch };
}
