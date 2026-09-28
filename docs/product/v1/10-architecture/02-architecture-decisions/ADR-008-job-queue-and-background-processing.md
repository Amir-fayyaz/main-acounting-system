# ADR-008 — Job / Queue و پردازش پس‌زمینه

- شناسه: ADR-008
- وضعیت: پذیرفته‌شده
- نسخه: v1
- تاریخ: 2026-09-27
- حوزه: Async Processing

## 1. تصمیم

MVP یک زیرساخت مشترک برای Job/Queue دارد و عملیات سنگین یا طولانی را از Web/API جدا می‌کند.

Runtime:

```text
Web/API
Worker
Scheduler
Redis
Database
```

برای Queue/Stream داخلی از Redis Streams استفاده می‌شود.

## 2. چه چیزهایی Async هستند؟

نمونه‌ها:

- File Import
- PDF/Document Extraction
- OCR در صورت استفاده
- Agent Execution
- Reconciliation سنگین
- Payroll
- Tax Preparation
- Report Generation
- Notification
- Projection Update

## 3. Sync vs Async

Synchronous برای عملیات:

- کوتاه
- قطعی
- کم‌هزینه
- نیازمند Response فوری

Async برای عملیات:

- طولانی
- قابل Retry
- CPU/IO سنگین
- خارجی
- چندمرحله‌ای

## 4. Job Model

هر Job حداقل:

```text
JobId
Type
CompanyId
PayloadReference
Status
Attempts
CreatedAt
StartedAt
CompletedAt
LastError
CorrelationId
```

را دارد.

## 5. Status

```text
Pending
Running
Completed
Failed
Retrying
DeadLetter / NeedsReview
Cancelled
```

## 6. Retry

- خطای موقت قابل Retry است.
- Business Error دوباره اجرا نمی‌شود.
- Retry با Backoff انجام می‌شود.
- تعداد Retry محدود است.
- Job باید Idempotent یا Duplicate-aware باشد.

## 7. Dead Letter / Needs Review

Jobی که بعد از Retry Policy همچنان شکست خورده باید از چرخه Retry خارج شود و وضعیت قابل بررسی داشته باشد.

این وضعیت نباید حذف یا پنهان شود.

## 8. Cancellation

Jobهای طولانی باید تا حد امکان Cancelable باشند.

Cancellation باید Cooperative باشد و State نهایی Job ثبت شود.

## 9. Scheduler

Scheduler فقط مسئول Trigger کردن Job است.

Business Logic Scheduler نباید Source of Truth باشد.

## 10. Concurrency

برای Jobهای Exclusive از Lock/Lease/Idempotency استفاده می‌شود تا یک Job یکسان به‌صورت همزمان چند بار اجرا نشود.

## 11. Backpressure

سیستم باید در صورت افزایش Queue:

- ظرفیت Worker را مدیریت کند.
- Requestهای جدید را بیش از ظرفیت نپذیرد یا به Queue منتقل کند.
- وضعیت کاربر را شفاف نشان دهد.

## 12. Company Isolation

هر Job باید Company/Tenant Context داشته باشد و Worker هرگز نباید Job یک شرکت را با Context شرکت دیگر اجرا کند.

## 13. Trace

هر Job باید Correlation ID داشته باشد تا از UI/API تا Worker و Event قابل ردیابی باشد.

## 14. اصول قطعی

- عملیات طولانی را در Request باز نگه نمی‌داریم.
- Job بدون Owner Context اجرا نمی‌شود.
- Retry بدون Idempotency ممنوع است.
- Failure پنهان ممنوع است.
