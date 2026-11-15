import {
  CHEQUE_CURRENCY,
  type Cheque,
  type ChequeDto,
  type CreateChequeRequest,
  type UpdateChequeRequest,
} from '../assets/@types/cheque.types';
import { toAsciiDigits } from '../utils/format';
import { normalizeJalaliDate } from '../utils/jalali';
import { normalizeMoneyInput } from '../utils/money';
import { ChequeApiError } from './checks-api.errors';

function normalizeDigits(value: string): string {
  return toAsciiDigits(value).trim();
}

function normalizeRequestDates(payload: CreateChequeRequest): {
  registeredDate: string;
  dueDate: string;
} {
  return {
    registeredDate: normalizeJalaliDate(payload.registeredDate) ?? '',
    dueDate: normalizeJalaliDate(payload.dueDate) ?? '',
  };
}

export function mapChequeDtoToCheque(dto: ChequeDto): Cheque {
  const amount = normalizeMoneyInput(dto.amount.amount);
  const registeredDate = normalizeJalaliDate(dto.registeredDate);
  const dueDate = normalizeJalaliDate(dto.dueDate);

  if (!amount || !registeredDate || !dueDate) {
    throw new ChequeApiError({
      message: 'داده‌ی چک از سرور با قرارداد پول/تاریخ سازگار نیست.',
      code: 'MALFORMED_RESPONSE',
      status: 500,
    });
  }

  return {
    id: dto.id,
    revision: dto.revision,
    number: normalizeDigits(dto.number),
    sayadId: normalizeDigits(dto.sayadId),
    direction: dto.direction,
    counterparty: dto.counterparty.trim(),
    bank: dto.bank.trim(),
    amount: {
      amount,
      currency: dto.amount.currency,
    },
    registeredDate,
    dueDate,
    status: dto.status,
  };
}

export function mapChequeDtoListToCheques(dtos: readonly ChequeDto[]): Cheque[] {
  return dtos.map(mapChequeDtoToCheque);
}

export function mapCreateChequeRequestToDto(
  payload: CreateChequeRequest,
  id: string,
): ChequeDto {
  const { registeredDate, dueDate } = normalizeRequestDates(payload);

  return {
    id,
    revision: 1,
    number: normalizeDigits(payload.number),
    sayadId: normalizeDigits(payload.sayadId),
    direction: payload.direction,
    counterparty: payload.counterparty.trim(),
    bank: payload.bank.trim(),
    amount: {
      amount: payload.amount.amount,
      currency: CHEQUE_CURRENCY,
    },
    registeredDate,
    dueDate,
    status: 'pending',
  };
}

export function mapUpdateChequeRequestToDto(
  payload: UpdateChequeRequest,
  current: ChequeDto,
): ChequeDto {
  const { registeredDate, dueDate } = normalizeRequestDates(payload);

  return {
    ...current,
    revision: current.revision + 1,
    number: normalizeDigits(payload.number),
    sayadId: normalizeDigits(payload.sayadId),
    direction: payload.direction,
    counterparty: payload.counterparty.trim(),
    bank: payload.bank.trim(),
    amount: {
      amount: payload.amount.amount,
      currency: CHEQUE_CURRENCY,
    },
    registeredDate,
    dueDate,
  };
}
