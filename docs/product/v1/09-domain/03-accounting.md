# دامنه حسابداری

## 1. هدف

Accounting مرجع نهایی اثر مالی ثبت‌شده در سیستم است. این دامنه مالک سند حسابداری، حساب، دوره مالی، ابعاد تحلیلی و دفتر مالی است ولی مالک فرآیندهای کسب‌وکار Purchase، Sales و غیره نیست.

## 2. مفاهیم اصلی

- ChartOfAccounts
- Account Group
- Ledger Account
- Subledger / Detail
- Accounting Document
- Accounting Line
- Accounting Effect
- FiscalYear
- FiscalPeriod
- Financial Dimension
- Money
- Posting Rule reference
- Reversal / Correction relationship

## 3. ساختار حساب

ساختار سلسله‌مراتبی به‌صورت پایه مدل می‌شود:

```text
Account Group
  ↓
Ledger Account
  ↓
Subledger / Detail
```

مدل باید از ابتدا ظرفیت توسعه سطح تحلیلی بیشتر را داشته باشد، بدون اجبار به فعال کردن همه سطوح در MVP.

## 4. ابعاد مالی

ابعاد مالی برای طبقه‌بندی تحلیلی اثرهای مالی هستند و با حساب اصلی یکی نیستند. در MVP حداقل این ابعاد در نظر گرفته می‌شوند:

- مرکز هزینه
- واحد/بخش سازمانی

ساختار Dimension به‌صورت قابل‌توسعه است تا در آینده پروژه، مرکز درآمد یا Dimensionهای سفارشی اضافه شوند.

## 5. Fiscal Year و Fiscal Period

```text
Fiscal Year
  └── Fiscal Period
```

Period وضعیت مستقل دارد و بسته بودن آن روی تمام عملیات مالی اثر می‌گذارد.

چرخه مفهومی:

```text
Open → Review → Closing → Closed → Reopened (controlled)
```

## 6. Money

```text
Amount + Currency + Precision/Rounding Policy
```

MVP فقط IRR را فعال می‌کند اما Domain به یک Currency محدود نیست.

## 7. تاریخ‌ها

برای عملیات مالی از هم تفکیک می‌شوند:

- Business Date
- Accounting Date
- Created At
- Posted At

## 8. Accounting Effect

دامنه‌های دیگر اثر مالی را به Accounting ارائه می‌کنند. Accounting سند نهایی را بر اساس قواعد Posting معتبر تولید و ثبت می‌کند.

## 9. Invariants

- سند Posted باید متوازن باشد.
- سند Posted مستقیماً ویرایش یا حذف نمی‌شود.
- Accounting Date باید با Fiscal Period سازگار باشد.
- تغییر در Period بسته بدون مسیر کنترل‌شده مجاز نیست.
- Reversal باید به سند اصلی مرتبط باشد.
- Correction باید دلیل و رابطه با عملیات اصلی داشته باشد.
- اثر معکوس باید منطق و ابعاد مالی عملیات اصلی را به‌درستی بازتاب دهد.

## 10. Reverse و Correction

محصول از سه الگوی اصلاح پشتیبانی می‌کند:

1. Reversal کامل
2. Correction مبتنی بر اصلاح
3. Compensating Transaction

Reversal یک عملیات مالی جدید ایجاد می‌کند و رکورد اصلی را دست‌کاری نمی‌کند. قابلیت Reverse در ERPهای سازمانی مانند Dynamics 365 Finance نیز وجود دارد و حتی در سناریوهای مختلف برای Journal و Voucher قابل اجرا است. برای محصول ما Reverse باید تابع Ruleهای دامنه و سطح دسترسی باشد. citeturn288300search0turn288300search6

## 11. Commands

- OpenFiscalPeriod
- CloseFiscalPeriod
- ReopenFiscalPeriod
- CreateAccountingEffect
- PostAccountingDocument
- ReverseAccountingDocument
- CreateCorrection
- ConfigureChartOfAccounts
- ConfigureDimension

## 12. Events

- AccountingDocumentPosted
- AccountingDocumentReversed
- CorrectionPosted
- FiscalPeriodClosed
- FiscalPeriodReopened
- DimensionConfigured

## 13. Cross-Domain

هیچ دامنه دیگری Accounting Entity را مستقیم تغییر نمی‌دهد.
