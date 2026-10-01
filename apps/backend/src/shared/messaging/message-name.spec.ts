import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { MessageKind } from './message-kind.js';
import { validateMessageName } from './message-name.js';

/** Whether a name is accepted for a kind; the shape of the three-way table below. */
function accepts(kind: MessageKind, name: string): boolean {
  try {
    validateMessageName(kind, name);
    return true;
  } catch {
    return false;
  }
}

describe('command names express imperative intent', () => {
  it.each([
    'CreateFiscalYear',
    'PostAccountingDocument',
    'RecordPurchase',
    'RegisterPurchase',
    'ApprovePayment',
    'ReceiveGoods',
    'ClosePeriod',
    'ApprovePlanCommand',
    'SeedDatabase',
    'ProceedWithPosting',
  ])('accepts %s', (name) => {
    expect(validateMessageName(MessageKind.COMMAND, name)).toBe(name);
  });

  it.each([
    ['GetSupplierBalance', 'a query read verb'],
    ['ListAccounts', 'a query read verb'],
    ['PaymentApproved', 'a past-tense fact'],
    ['FiscalYearCreated', 'a past-tense fact'],
    ['FiscalYearCreatedCommand', 'a fact wearing the command suffix'],
    ['postAccountingDocument', 'a lower-case first letter'],
    ['Post_AccountingDocument', 'a snake_case name'],
    ['Post Accounting Document', 'a spaced name'],
    ['Post-Accounting-Document', 'a hyphenated name'],
    ['', 'an empty name'],
    ['   ', 'a blank name'],
    ['A'.repeat(101), 'a name beyond the length bound'],
    ['Command', 'only the kind suffix'],
  ])('rejects %s (%s)', (name) => {
    expect(() => validateMessageName(MessageKind.COMMAND, name)).toThrow(InvalidPrimitiveError);
  });

  it('says which of the other kinds the name belongs to', () => {
    expect(() => validateMessageName(MessageKind.COMMAND, 'GetPayment')).toThrow(
      'that is a query name (ADR-005, section 5)',
    );
    expect(() => validateMessageName(MessageKind.COMMAND, 'PaymentApproved')).toThrow(
      'that is an event name (ADR-005, section 5)',
    );
    expect(() => validateMessageName(MessageKind.COMMAND, 'PaymentApproved')).toThrow(
      'Command: name must be imperative',
    );
  });
});

describe('query names describe the information requested', () => {
  it.each([
    'GetFiscalYear',
    'ListAccounts',
    'GetSupplierBalance',
    'SearchInvoices',
    'FindReceipt',
    'CountInvoices',
    'SumLineTotals',
    'ExistsOpenPeriod',
    'GetPaymentQuery',
  ])('accepts %s', (name) => {
    expect(validateMessageName(MessageKind.QUERY, name)).toBe(name);
  });

  it.each([
    ['ApprovePayment', 'an imperative command'],
    ['PostAccountingDocument', 'an imperative command'],
    ['PaymentApproved', 'a past-tense fact'],
    ['PaymentBalance', 'no read verb at the front'],
    ['GETPayment', 'shouting capitals instead of PascalCase words'],
    ['Query', 'only the kind suffix'],
  ])('rejects %s (%s)', (name) => {
    expect(() => validateMessageName(MessageKind.QUERY, name)).toThrow(InvalidPrimitiveError);
  });

  it('names the read verbs it accepts', () => {
    expect(() => validateMessageName(MessageKind.QUERY, 'PaymentBalance')).toThrow(
      'Query: name must start with one of Get, List, Search, Find, Count, Sum, Exists',
    );
  });
});

describe('event names are past-tense facts', () => {
  it.each([
    'FiscalYearCreated',
    'AccountingDocumentPosted',
    'PurchaseRecorded',
    'SalePosted',
    'PaymentReceived',
    'PeriodClosed',
    'InventoryIssued',
    'PayrollFinalized',
    'TaxInvoiceAccepted',
    'SaleCorrected',
    'FiscalYearCreatedEvent',
    'PaymentSent',
    'StockBuilt',
  ])('accepts %s', (name) => {
    expect(validateMessageName(MessageKind.EVENT, name)).toBe(name);
  });

  it.each([
    ['CreateFiscalYear', 'a command that has not happened yet'],
    ['PostAccountingDocument', 'a command that has not happened yet'],
    ['RecordPurchase', 'a command that has not happened yet'],
    ['GetPayment', 'a query'],
    ['FiscalYearCreate', 'present tense'],
    ['PaymentApprove', 'present tense'],
    ['Event', 'only the kind suffix'],
  ])('rejects %s (%s)', (name) => {
    expect(() => validateMessageName(MessageKind.EVENT, name)).toThrow(InvalidPrimitiveError);
  });

  it('insists on the fact reading', () => {
    expect(() => validateMessageName(MessageKind.EVENT, 'CreateFiscalYear')).toThrow(
      'DomainEvent: name must be a past-tense fact such as "FiscalYearCreated"',
    );
    expect(() => validateMessageName(MessageKind.EVENT, 'GetPayment')).toThrow(
      'that is a query name (ADR-005, section 5)',
    );
  });
});

describe('one operation keeps three distinct readings', () => {
  it.each([
    { name: 'ApprovePayment', command: true, query: false, event: false },
    { name: 'GetPayment', command: false, query: true, event: false },
    { name: 'PaymentApproved', command: false, query: false, event: true },
  ])('$name is accepted only by its own kind', ({ name, command, query, event }) => {
    expect(accepts(MessageKind.COMMAND, name)).toBe(command);
    expect(accepts(MessageKind.QUERY, name)).toBe(query);
    expect(accepts(MessageKind.EVENT, name)).toBe(event);
  });
});

describe('invalid names are rejected, never repaired', () => {
  it('refuses a non-string name instead of coercing it', () => {
    expect(() => validateMessageName(MessageKind.COMMAND, 42 as unknown as string)).toThrow(
      'Command: name must be a string but received 42',
    );
  });

  it('reports the failure against the kind the caller declared', () => {
    expect(() => validateMessageName(MessageKind.EVENT, 'post_document')).toThrow(
      'DomainEvent: name must be a PascalCase identifier',
    );
  });

  it('keeps the kind suffix when it is part of a longer, valid name', () => {
    expect(validateMessageName(MessageKind.COMMAND, 'PostAccountingDocumentCommand')).toBe(
      'PostAccountingDocumentCommand',
    );
  });
});
