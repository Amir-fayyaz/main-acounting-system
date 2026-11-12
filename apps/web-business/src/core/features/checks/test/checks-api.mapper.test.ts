import { describe, expect, it } from 'vitest';

import type { ChequeDto } from '../assets/@types/cheque.types';
import { ChequeApiError } from '../lib/checks-api.errors';
import { mapChequeDtoToCheque } from '../lib/checks-api.mapper';
import {
  createChequeFormValues,
  createEmptyChequeFormValues,
  mapChequeFormValuesToCreateRequest,
  mapChequeFormValuesToUpdateRequest,
} from '../lib/cheque-form.mapper';

function dto(overrides: Partial<ChequeDto> = {}): ChequeDto {
  return {
    id: 'cheque-1001',
    revision: 2,
    number: '100000',
    sayadId: '1200000000000000',
    direction: 'received',
    counterparty: 'شرکت آرمان تجارت',
    bank: 'ملی',
    amount: { amount: '125000000.00', currency: 'IRR' },
    registeredDate: '1405/07/27',
    dueDate: '1405/08/27',
    status: 'pending',
    ...overrides,
  };
}

describe('mapChequeDtoToCheque', () => {
  it('maps the API DTO and keeps money as a canonical string', () => {
    const cheque = mapChequeDtoToCheque(dto());

    expect(cheque).toMatchObject({
      id: 'cheque-1001',
      revision: 2,
      number: '100000',
      sayadId: '1200000000000000',
      direction: 'received',
      bank: 'ملی',
      amount: { amount: '125000000.00', currency: 'IRR' },
      registeredDate: '1405/07/27',
      dueDate: '1405/08/27',
      status: 'pending',
    });
  });

  it('normalizes Persian digits, separators and non-padded dates', () => {
    const cheque = mapChequeDtoToCheque(
      dto({
        number: '۱۰۰۰۰۰',
        sayadId: '۱۲۰۰۰۰۰۰۰۰۰۰۰۰۰۰',
        amount: { amount: '۱۲۵٬۰۰۰٬۰۰۰', currency: 'IRR' },
        registeredDate: '۱۴۰۵/۷/۲۷',
        dueDate: '1405-8-7',
      }),
    );

    expect(cheque.number).toBe('100000');
    expect(cheque.sayadId).toBe('1200000000000000');
    expect(cheque.amount.amount).toBe('125000000.00');
    expect(cheque.registeredDate).toBe('1405/07/27');
    expect(cheque.dueDate).toBe('1405/08/07');
  });

  it('throws a MALFORMED_RESPONSE API error for broken money or dates', () => {
    expect(() => mapChequeDtoToCheque(dto({ amount: { amount: 'abc', currency: 'IRR' } }))).toThrow(
      ChequeApiError,
    );
    expect(() => mapChequeDtoToCheque(dto({ dueDate: 'not-a-date' }))).toThrow(ChequeApiError);

    try {
      mapChequeDtoToCheque(dto({ amount: { amount: '12.5', currency: 'IRR' } }));
    } catch (error) {
      expect(error).toBeInstanceOf(ChequeApiError);
      expect((error as ChequeApiError).code).toBe('MALFORMED_RESPONSE');
    }
  });
});

describe('cheque form mappers', () => {
  it('creates empty values for a new cheque', () => {
    expect(createEmptyChequeFormValues()).toEqual({
      number: '',
      sayadId: '',
      direction: 'received',
      counterparty: '',
      bank: '',
      amount: '',
      registeredDate: '',
      dueDate: '',
    });
    expect(createChequeFormValues(null)).toEqual(createEmptyChequeFormValues());
  });

  it('maps a cheque into editable form values without formatting money', () => {
    const values = createChequeFormValues(mapChequeDtoToCheque(dto()));

    expect(values.amount).toBe('125000000.00');
    expect(values.registeredDate).toBe('1405/07/27');
  });

  it('builds canonical create and update requests', () => {
    const values = {
      ...createEmptyChequeFormValues(),
      number: ' 123456 ',
      sayadId: ' 1234567890123456 ',
      counterparty: ' شرکت آرمان ',
      bank: ' ملی ',
      amount: '۱۲۵٬۰۰۰٬۰۰۰',
      registeredDate: '1405/07/27',
      dueDate: '1405/08/27',
    };

    const createRequest = mapChequeFormValuesToCreateRequest(values);
    expect(createRequest).toEqual({
      number: '123456',
      sayadId: '1234567890123456',
      direction: 'received',
      counterparty: 'شرکت آرمان',
      bank: 'ملی',
      amount: { amount: '125000000.00', currency: 'IRR' },
      registeredDate: '1405/07/27',
      dueDate: '1405/08/27',
    });

    const updateRequest = mapChequeFormValuesToUpdateRequest(values, {
      id: 'cheque-1001',
      revision: 4,
    });
    expect(updateRequest).toMatchObject({
      id: 'cheque-1001',
      expectedRevision: 4,
      amount: { amount: '125000000.00', currency: 'IRR' },
    });
  });
});
