import type { Cheque, ChequeFormValues } from '../assets/@types/cheque.types';
import { addJalaliDaysToDate, todayJalali } from '../utils/jalali';

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

export function createDefaultChequeDates(
  today: string = todayJalali(),
): Pick<ChequeFormValues, 'registeredDate' | 'dueDate'> {
  return {
    registeredDate: today,
    dueDate: addJalaliDaysToDate(today, 30) ?? today,
  };
}
