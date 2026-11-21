import { normalizeMoneyInput } from '../../shared';
import {
  CHEQUE_CURRENCY,
  type Cheque,
  type ChequeFormValues,
  type CreateChequeRequest,
  type UpdateChequeRequest,
} from '../assets/@types/cheque.types';

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
