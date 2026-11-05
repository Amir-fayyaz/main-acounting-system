import type { Invoice } from '../assets/@types';
import { createMockInvoices } from '../assets/mock/finance';
import { createMockResource } from './mock-api-utils';

export type CreateInvoiceInput = Omit<Invoice, 'id'>;

const invoicesApi = createMockResource<Invoice, CreateInvoiceInput>({
  initialData: createMockInvoices(),
  idPrefix: 'invoice',
  getSearchText: (invoice) => [invoice.number, invoice.customerName, invoice.status].join(' '),
  createEntity: (input, id) => ({ ...input, id }),
});

export const listInvoices = invoicesApi.list;
export const createInvoice = invoicesApi.create;
