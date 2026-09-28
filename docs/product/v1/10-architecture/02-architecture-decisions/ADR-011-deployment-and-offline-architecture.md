# ADR-011 — Deployment و Offline Architecture

- شناسه: ADR-011
- وضعیت: پذیرفته‌شده
- نسخه: v1
- تاریخ: 2026-09-27
- حوزه: Deployment / Operations

## 1. تصمیم

محصول به‌صورت Dockerized روی سرور شرکت سازنده یا مشتری نصب می‌شود.

MVP یک SaaS اجباری نیست و قابلیت اجرای On-Premise یک جزء رسمی محصول است.

## 2. Deployment Units

الگوی پایه:

```text
App/API Container
Worker Container
Scheduler Container
Redis
Database
File Storage
```

همه این اجزا در یک Installation متعلق به یک محیط عملیاتی هستند، ولی امکان Scale بعضی Runtimeها وجود دارد.

## 3. Desktop Experience

محصول Native Desktop App نیست.

تجربه اصلی MVP یک Web Application برای استفاده روی Desktop است.

## 4. Offline

در محیط On-Premise، قطع اینترنت نباید عملیات داخلی سیستم را متوقف کند مگر عملیاتی که ذاتاً به Provider خارجی وابسته‌اند.

این یعنی:

- Accounting داخلی قابل ادامه است.
- Inventory داخلی قابل ادامه است.
- Purchase/Sales داخلی قابل ادامه‌اند.
- ارسال به Provider بیرونی تا زمان برقراری ارتباط متوقف یا Pending می‌شود.

## 5. External Connectivity State

Providerهای بیرونی باید Connectivity/Health وضعیت خود را داشته باشند و Failure آن‌ها نباید کل سیستم داخلی را Unavailable کند.

## 6. Health Checks

هر Installation باید قابلیت بررسی سلامت:

- API
- Database
- Redis
- Worker
- Scheduler
- File Storage
- External Providers

را داشته باشد.

## 7. Upgrade

Upgrade باید شامل:

- Versioned Image
- Migration
- Backup Check
- Rollback/Recovery Plan

باشد.

## 8. Database Migration

Migration باید قابل تکرار و Versioned باشد.

Upgrade نباید بدون بررسی موفقیت Migration سیستم را در وضعیت نامشخص رها کند.

## 9. Backup

Backup در سطح کل Installation است.

Backup شامل حداقل:

- Database
- فایل‌های کسب‌وکاری لازم
- تنظیمات ضروری و غیرمحرمانه

است.

Secretها طبق سیاست امنیتی جداگانه مدیریت می‌شوند.

## 10. Restore

Restore باید به یک Snapshot سازگار از کل سیستم منجر شود.

Restore باید قابل تست باشد و فقط روی کاغذ وجود نداشته باشد.

## 11. Recovery

هدف RPO تقریباً صفر و RTO سریع‌ترین زمان عملی ممکن است؛ مقدار دقیق عددی در Runbook عملیاتی نهایی می‌شود.

## 12. Offline External Queuing

اگر یک عملیات بیرونی در حالت قطعی اینترنت اجرا شود:

```text
Create Internal State
→ Pending External Submission
→ Queue
→ Submit when Connectivity Returns
```

اما عملیات نباید Success خارجی فرض شود.

## 13. Configuration

Configuration محیطی:

- Deployment-specific
- External Provider-specific
- Secret-specific

است و خارج از Domain قرار دارد.

## 14. اصول قطعی

- Dockerized
- On-Premise First
- Internal Operation Independent from Internet where possible
- External Failure isolated
- Backup + Restore tested
- No Native Mobile/Desktop requirement for MVP
