import type { Cheque } from '../assets/@types';
import { createMockCheques } from '../assets/mock/finance';
import { chequeStatusLabel } from '../utils/status-label';
import { createMockResource } from './mock-api-utils';

export type CreateChequeInput = Omit<Cheque, 'id'>;

const chequesApi = createMockResource<Cheque, CreateChequeInput>({
  initialData: createMockCheques(),
  idPrefix: 'cheque',
  getSearchText: (cheque) =>
    [
      cheque.sayadId,
      cheque.counterparty,
      cheque.bankName,
      cheque.status,
      cheque.direction,
      cheque.dueDate,
      chequeStatusLabel(cheque.status),
    ].join(' '),
  getStatus: (cheque) => cheque.status,
  createEntity: (input, id) => ({ ...input, id }),
});

export const listCheques = chequesApi.list;
export const createCheque = chequesApi.create;
