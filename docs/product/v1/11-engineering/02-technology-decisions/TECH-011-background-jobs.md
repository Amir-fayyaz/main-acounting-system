# TECH-011 — Background Jobs

- وضعیت: پذیرفته‌شده

## تصمیم

Background Jobها با Redis-backed Queue و Workerهای جدا از Web/API اجرا می‌شوند.

## کاربردها

- File Import
- Extraction
- OCR
- Agent Execution
- Payroll
- Reconciliation
- Tax Preparation
- گزارش‌های سنگین
- Notification
- Projection rebuild

هر Job باید State، Retry Policy، Error و Result قابل مشاهده داشته باشد.
