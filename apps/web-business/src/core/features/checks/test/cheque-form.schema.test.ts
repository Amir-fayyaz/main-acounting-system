import { describe, expect, it } from 'vitest';

import { type ChequeFormValues } from '../assets/@types/cheque.types';
import { MOCK_CHEQUE_FORM_RULES } from '../assets/mock/checks.mock';
import { createChequeFormSchema, mapZodErrorsToChequeFormErrors } from '../lib/cheque-form.schema';

const schema = createChequeFormSchema(MOCK_CHEQUE_FORM_RULES);

function validValues(overrides: Partial<ChequeFormValues> = {}): ChequeFormValues {
  return {
    number: '123456',
    sayadId: '1234567890123456',
    direction: 'received',
    counterparty: 'شرکت آرمان تجارت',
    bank: 'ملی',
    amount: '125000000',
    registeredDate: '1405/07/27',
    dueDate: '1405/08/27',
    ...overrides,
  };
}

describe('createChequeFormSchema', () => {
  it('normalizes Persian digits, separators and canonical money', () => {
    const result = schema.safeParse({
      ...validValues(),
      number: '۱۲۳۴۵۶',
      sayadId: '۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵۶',
      amount: '۱۲۵٬۰۰۰٬۰۰۰',
      registeredDate: '۱۴۰۵/۰۷/۲۷',
      dueDate: '۱۴۰۵/۰۸/۲۷',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.number).toBe('123456');
      expect(result.data.sayadId).toBe('1234567890123456');
      expect(result.data.amount).toBe('125000000.00');
      expect(result.data.registeredDate).toBe('1405/07/27');
      expect(result.data.dueDate).toBe('1405/08/27');
    }
  });

  it('rejects a due date before the registered date with a clear message', () => {
    const result = schema.safeParse(
      validValues({ registeredDate: '1405/08/10', dueDate: '1405/08/09' }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = mapZodErrorsToChequeFormErrors(result.error);
      expect(errors.dueDate).toContain('قبل از تاریخ ثبت');
      expect(errors.dueDate).toContain('۱۴۰۵/۰۸/۰۹');
    }
  });

  it('accepts equal registered and due dates', () => {
    const result = schema.safeParse(
      validValues({ registeredDate: '1405/08/10', dueDate: '1405/08/10' }),
    );

    expect(result.success).toBe(true);
  });

  it('requires exactly sixteen Sayad digits', () => {
    const short = schema.safeParse(validValues({ sayadId: '123456789012345' }));
    const letters = schema.safeParse(validValues({ sayadId: '12345678901234ab' }));

    expect(short.success).toBe(false);
    expect(letters.success).toBe(false);
    if (!short.success) {
      expect(mapZodErrorsToChequeFormErrors(short.error).sayadId).toContain('۱۶ رقم');
    }
  });

  it('requires a 4–12 digit cheque number', () => {
    const result = schema.safeParse(validValues({ number: '123' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = mapZodErrorsToChequeFormErrors(result.error);
      expect(errors.number).toContain('۴');
      expect(errors.number).toContain('۱۲');
    }
  });

  it('rejects invalid Jalali dates and zero amounts', () => {
    const invalidDate = schema.safeParse(validValues({ dueDate: '1405/13/01' }));
    const zeroAmount = schema.safeParse(validValues({ amount: '0' }));

    expect(invalidDate.success).toBe(false);
    expect(zeroAmount.success).toBe(false);
    if (!zeroAmount.success) {
      expect(mapZodErrorsToChequeFormErrors(zeroAmount.error).amount).toContain('بیشتر از صفر');
    }
  });

  it('maps unknown paths without adding unrelated keys', () => {
    const result = schema.safeParse(validValues({ counterparty: '   ' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = mapZodErrorsToChequeFormErrors(result.error);
      expect(errors.counterparty).toBe('طرف حساب را وارد کنید.');
      expect(Object.keys(errors)).toEqual(['counterparty']);
    }
  });
});
