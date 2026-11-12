import {
  CHEQUE_CURRENCY,
  type Cheque,
  type ChequeFormValues,
  type CreateChequeRequest,
  type UpdateChequeRequest,
} from '../assets/@types/cheque.types';
import { addJalaliDaysToDate, todayJalali } from '../utils/jalali';
import { normalizeMoneyInput } from '../utils/money';

/** مقدار اولیه‌ی فرم؛ تاریخ‌ها در کلاینت و بعد از mount پر می‌شوند. */
export function createEmptyChequeFormValues(): ChequeFormValues {
  return {
    number: '',
    sayadId: '',
    direction: 'received',
    counterparty: '',
    bank: '',
    amount: '',
    registeredDate: '',
    dueDate: '',
  };
}

export function createChequeFormValues(cheque: Cheque | null | undefined): ChequeFormValues {
  if (!cheque) return createEmptyChequeFormValues();

  return {
    number: cheque.number,
    sayadId: cheque.sayadId,
    direction: cheque.direction,
    counterparty: cheque.counterparty,
    bank: cheque.bank,
    amount: cheque.amount.amount,
    registeredDate: cheque.registeredDate,
    dueDate: cheque.dueDate,
  };
}

/** تاریخ پیش‌فرض ثبت/سررسید برای فرم ایجاد؛ در effect کلاینتی استفاده می‌شود. */
export function createDefaultChequeDates(
  today: string = todayJalali(),
): Pick<ChequeFormValues, 'registeredDate' | 'dueDate'> {
  return {
    registeredDate: today,
    dueDate: addJalaliDaysToDate(today, 30) ?? today,
  };
}

export function mapChequeFormValuesToCreateRequest(values: ChequeFormValues): CreateChequeRequest {
  return {
    number: values.number.trim(),
    sayadId: values.sayadId.trim(),
    direction: values.direction,
    counterparty: values.counterparty.trim(),
    bank: values.bank.trim(),
    amount: {
      amount: normalizeMoneyInput(values.amount) ?? values.amount,
      currency: CHEQUE_CURRENCY,
    },
    registeredDate: values.registeredDate,
    dueDate: values.dueDate,
  };
}

export function mapChequeFormValuesToUpdateRequest(
  values: ChequeFormValues,
  cheque: Pick<Cheque, 'id' | 'revision'>,
): UpdateChequeRequest {
  return {
    ...mapChequeFormValuesToCreateRequest(values),
    id: cheque.id,
    expectedRevision: cheque.revision,
  };
}
