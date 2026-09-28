# دامنه فروش

## 1. هدف

مدیریت صورتحساب و وضعیت فروش از ایجاد تا نهایی‌شدن، با ارتباط کنترل‌شده با Inventory، Receivable، Treasury، Accounting و Tax.

## 2. مفاهیم اصلی

- Sales Invoice
- Sales Line
- Customer Reference
- Discount
- Credit/Cash Terms
- Sales Status
- Receivable Reference

## 3. وضعیت

الگوی مفهومی:

```text
Draft → Validated → Approved → Issued → Settled/Completed
```

## 4. Invariants

- هر فروش فقط یک Warehouse برای خروج موجودی دارد.
- سیاست کمبود موجودی از تنظیمات شرکت می‌آید.
- فروش نقدی و اعتباری هر دو پشتیبانی می‌شوند.
- پرداخت ناقص و چند پرداختی امکان‌پذیر است.
- Discount خطی و فاکتور کلی می‌تواند وجود داشته باشد.
- Sales نباید Accounting Document را مستقیم تغییر دهد.

## 5. Commands

CreateSalesInvoice، AddSalesLine، ApplyDiscount، ValidateSalesInvoice، ApproveSalesInvoice، IssueSalesInvoice، RegisterCashSale، RegisterCreditSale

## 6. Events

SalesInvoiceCreated، SalesInvoiceValidated، SalesInvoiceApproved، SalesInvoiceIssued، SalesCompleted

## 7. Cross-Domain

Sales → Inventory Issue، Sales → Receivable، Sales → Treasury، Sales → Accounting Effect، Sales → Tax.
