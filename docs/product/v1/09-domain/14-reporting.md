# دامنه گزارش‌گیری

## 1. هدف

ارائه Read Model و گزارش برای استفاده عملیاتی و مدیریتی بدون مالکیت حقیقت کسب‌وکاری.

## 2. اصل مالکیت

Reporting مالک Domain Entityهای اصلی نیست. داده‌ها را از Domain Eventها و قراردادهای خواندن معتبر دریافت می‌کند و Projection/Read Model می‌سازد.

## 3. دسته گزارش‌ها

- گزارش‌های عملیاتی هر Golden Flow
- گزارش‌های کنترلی
- گزارش‌های مدیریتی پایه
- وضعیت Exceptionها
- وضعیت Agent Plans
- گزارش‌های Audit قابل مشاهده برای نقش مجاز

## 4. Invariants

- گزارش نباید حقیقت کسب‌وکاری مستقلی ایجاد کند.
- عددهای حساس مالی باید قابل Trace به داده منبع باشند.
- دسترسی گزارش تابع Company Context و Role است.

## 5. Commands / Queries

ReadModelRefresh، GenerateOperationalReport، GenerateManagementReport، ExportReport، QueryDashboard

## 6. Events مصرفی نمونه

AccountingDocumentPosted، StockReceived، StockIssued، PaymentCreated، ReceiptCreated، TaxInvoiceAccepted، PayrollFinalized، AssetDepreciationPosted
