# قراردادهای تعامل بین دامنه‌ها و Invariantهای مشترک

## 1. هدف

این سند قراردادهای مشترک Cross-Domain را تثبیت می‌کند تا هر دامنه مستقل بماند و هیچ پیاده‌سازی‌ای با دسترسی مستقیم به Entity دامنه دیگر شکل نگیرد.

## 2. قانون طلایی

```text
Domain A
   ↓ Command / Application Service / Domain Event / Query Contract
Domain B
```

هرگز:

```text
Domain A → Direct mutation of Domain B Entity ❌
```

## 3. Purchase نمونه

```text
Purchase
  ├─ CreateInventoryReceipt Command
  ├─ CreatePayable Command
  ├─ CreateAccountingEffect Command
  └─ TaxableTransaction Event/Command
```

## 4. Sales نمونه

```text
Sales
  ├─ IssueStock Command
  ├─ CreateReceivable Command
  ├─ CreateAccountingEffect Command
  └─ TaxableTransaction Event/Command
```

## 5. Bank Reconciliation

```text
Bank Transaction
   ↓ Proposal
Reconciliation Plan
   ↓ Approval
Receipt / Payment / Transfer Commands
   ↓
Accounting Effect
```

## 6. Period Closing

Closing domain از Domainها نتیجه کنترل دریافت می‌کند و حق تغییر مستقیم Entity آنها را ندارد. اصلاحات فقط از طریق مسیر رسمی همان Domain انجام می‌شوند.

## 7. Agent

Agent می‌تواند از Context چند Domain استفاده کند، ولی Execution همیشه از مسیر Commandهای Domain انجام می‌شود.

## 8. Shared Invariants

- Company Context در همه عملیات الزامی است.
- Permission در نقطه اجرای Command مجدداً بررسی می‌شود.
- عملیات ثبت‌شده مالی Immutable است.
- Eventهای مهم باید قابل ردیابی باشند.
- External Status هرگز نباید بدون ذخیره پاسخ بیرونی به وضعیت داخلی تبدیل شود.
- Cross-Domain failure نباید به وضعیت مبهم منجر شود.
