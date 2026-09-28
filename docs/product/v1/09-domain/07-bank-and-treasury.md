# دامنه بانک و خزانه

## 1. هدف

مدیریت حساب‌های بانکی، عملیات نقدی و تراکنش‌های مالی جاری شرکت و تطبیق تراکنش‌های بانکی.

## 2. مفاهیم اصلی

- BankAccount
- CashAccount
- BankTransaction
- Payment
- Receipt
- Transfer
- Reconciliation
- Settlement Reference

## 3. Reconciliation

Reconciliation وضعیت تطبیق یک BankTransaction با یک یا چند رخداد داخلی را مدیریت می‌کند.

## 4. وضعیت تطبیق

```text
Unmatched → Proposed → Matched → Finalized
                 ↘ Rejected / Needs Review
```

## 5. Invariants

- هر BankTransaction به یک BankAccount مشخص تعلق دارد.
- تطبیق قطعی فقط پس از اعتبارسنجی و تأیید لازم انجام می‌شود.
- یک تراکنش نباید بدون کنترل دوباره به دو رخداد مالی تخصیص یابد.
- تطبیق نباید سند مالی را بدون مجوز ایجاد/تغییر کند.

## 6. Commands

ImportBankTransactions، CreateBankTransaction، CreateReceipt، CreatePayment، CreateTransfer، ProposeReconciliation، ConfirmReconciliation، RejectReconciliation

## 7. Events

BankTransactionImported، ReceiptCreated، PaymentCreated، TransferCreated، ReconciliationProposed، ReconciliationConfirmed، ReconciliationRejected

## 8. Cross-Domain

درخواست ایجاد Receipt/Payment از این دامنه به قراردادهای Receivable/Payable/Expense/Accounting ارجاع می‌شود، نه Entity مستقیم.
