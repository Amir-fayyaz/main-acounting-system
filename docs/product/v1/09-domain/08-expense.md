# دامنه هزینه

## 1. هدف

مدیریت هزینه‌های شرکت، چه دارای سند و چه بدون سند، پرداخت‌شده یا پرداخت‌نشده، همراه با Cost Center و ارتباط با Payable، Treasury و Accounting.

## 2. مفاهیم اصلی

- Expense
- ExpenseLine
- CostCenter Reference
- ExpenseDocument Reference
- Payable Reference
- Payment Reference
- Recurrence Rule
- PettyCash Reference

## 3. وضعیت

```text
Draft → Validated → Approved → Recorded → Settled/Completed
```

## 4. Invariants

- حساب و Cost Center انتخاب‌شده بخشی از Plan/Approval یا عملیات دستی هستند.
- Agent در MVP مالک پیشنهاد Account یا Cost Center نیست؛ انتخاب با حسابدار است.
- هزینه ثبت‌شده قابل حذف/ویرایش پنهانی نیست.
- هزینه می‌تواند بدون سند باشد ولی وضعیت مستندی باید واضح باشد.

## 5. Commands

CreateExpense، AttachExpenseDocument، ValidateExpense، ApproveExpense، RegisterPaidExpense، CreatePayableExpense، RecordPettyCashExpense، CreateRecurringExpense

## 6. Events

ExpenseCreated، ExpenseValidated، ExpenseApproved، ExpenseRecorded، ExpenseBecamePayable، ExpensePaid
