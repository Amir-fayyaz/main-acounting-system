import { describe, expect, it } from 'vitest';

import type { PosTerminalDto } from '../assets/@types/pos-terminal.types';
import {
  createEmptyPosTerminalFormValues,
  mapPosFormValuesToCreateRequest,
} from '../lib/pos-form.mapper';
import { PosApiError } from '../lib/pos-api.errors';
import { mapPosTerminalDtoToPosTerminal } from '../lib/pos-api.mapper';

function dto(overrides: Partial<PosTerminalDto> = {}): PosTerminalDto {
  return {
    id: 'pos-1001',
    revision: 1,
    title: 'POS دفتر مرکزی',
    terminalNumber: '10000000',
    merchantNumber: '1000000000',
    bank: 'ملی',
    feePercent: '0.70',
    settlementIban: 'IR000001000000000000000000',
    activatedOn: '1404/01/15',
    status: 'active',
    ...overrides,
  };
}

describe('mapPosTerminalDtoToPosTerminal', () => {
  it('maps the API DTO and keeps fee/date canonical', () => {
    const terminal = mapPosTerminalDtoToPosTerminal(dto());

    expect(terminal).toMatchObject({
      id: 'pos-1001',
      revision: 1,
      title: 'POS دفتر مرکزی',
      terminalNumber: '10000000',
      merchantNumber: '1000000000',
      bank: 'ملی',
      feePercent: '0.70',
      settlementIban: 'IR000001000000000000000000',
      activatedOn: '1404/01/15',
      status: 'active',
    });
  });

  it('normalizes Persian digits, fee separators, IBAN and non-padded dates', () => {
    const terminal = mapPosTerminalDtoToPosTerminal(
      dto({
        terminalNumber: '۱۰۰۰۰۰۰۰',
        merchantNumber: '۱۰۰۰۰۰۰۰۰۰',
        feePercent: '۰٫۷',
        settlementIban: 'ir 000001 000000000000000000',
        activatedOn: '۱۴۰۴/۱/۱۵',
        bank: '  ملی  ',
      }),
    );

    expect(terminal.terminalNumber).toBe('10000000');
    expect(terminal.merchantNumber).toBe('1000000000');
    expect(terminal.feePercent).toBe('0.70');
    expect(terminal.settlementIban).toBe('IR000001000000000000000000');
    expect(terminal.activatedOn).toBe('1404/01/15');
    expect(terminal.bank).toBe('ملی');
  });

  it('keeps optional fields empty', () => {
    const terminal = mapPosTerminalDtoToPosTerminal(
      dto({
        merchantNumber: null,
        bank: null,
        feePercent: null,
        settlementIban: null,
        activatedOn: null,
      }),
    );

    expect(terminal.merchantNumber).toBeNull();
    expect(terminal.bank).toBeNull();
    expect(terminal.feePercent).toBeNull();
    expect(terminal.settlementIban).toBeNull();
    expect(terminal.activatedOn).toBeNull();
  });

  it('throws a MALFORMED_RESPONSE API error for broken fee or date', () => {
    expect(() => mapPosTerminalDtoToPosTerminal(dto({ feePercent: 'abc' }))).toThrow(PosApiError);
    expect(() => mapPosTerminalDtoToPosTerminal(dto({ activatedOn: '1404/13/01' }))).toThrow(
      PosApiError,
    );

    try {
      mapPosTerminalDtoToPosTerminal(dto({ feePercent: '0.7.1' }));
    } catch (error) {
      expect(error).toBeInstanceOf(PosApiError);
      expect((error as PosApiError).code).toBe('MALFORMED_RESPONSE');
    }
  });
});

describe('POS form mapper', () => {
  it('creates an empty form by default', () => {
    expect(createEmptyPosTerminalFormValues()).toEqual({
      title: '',
      terminalNumber: '',
      merchantNumber: '',
      bank: '',
      feePercent: '',
    });
  });

  it('builds a canonical create request and nulls optional fields', () => {
    const request = mapPosFormValuesToCreateRequest({
      title: '  POS جدید ',
      terminalNumber: ' 99990000 ',
      merchantNumber: '   ',
      bank: ' ملی ',
      feePercent: '۰٫۷',
    });

    expect(request).toEqual({
      title: 'POS جدید',
      terminalNumber: '99990000',
      merchantNumber: null,
      bank: 'ملی',
      feePercent: '0.70',
    });

    const empty = mapPosFormValuesToCreateRequest({
      ...createEmptyPosTerminalFormValues(),
      title: 'POS',
      terminalNumber: '12345678',
    });

    expect(empty.merchantNumber).toBeNull();
    expect(empty.bank).toBeNull();
    expect(empty.feePercent).toBeNull();
  });
});
