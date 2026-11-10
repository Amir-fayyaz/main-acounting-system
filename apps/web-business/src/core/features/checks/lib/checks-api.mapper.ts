import type { Cheque, ChequeDto } from '../assets/@types/cheque.types';
import { normalizeJalaliDate } from '../utils/jalali';
import { normalizeMoneyInput } from '../utils/money';
import { toAsciiDigits } from '../utils/format';
import { ChequeApiError } from './checks-api.errors';

/**
 * DTO سرور را به مدل نمایش تبدیل و مقادیر پول/تاریخ را canonical می‌کند.
 * داده‌ی ناسازگار با قرارداد به خطای API تبدیل می‌شود تا در حالت error دیده شود.
 */
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
    number: toAsciiDigits(dto.number).trim(),
    sayadId: toAsciiDigits(dto.sayadId).trim(),
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
