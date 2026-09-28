# ADR-010 — معماری امنیت

- شناسه: ADR-010
- وضعیت: پذیرفته‌شده
- نسخه: v1
- تاریخ: 2026-09-27
- حوزه: Security Architecture

## 1. تصمیم

امنیت به‌صورت Layered و بر مبنای Least Privilege طراحی می‌شود.

اصول اصلی:

- Authentication
- Authorization
- Company/Tenant Isolation
- Object-level Authorization
- Encryption
- Secret Management
- Audit Security Events
- Secure Backup

## 2. Authentication

احراز هویت یک موضوع Cross-Cutting است و نباید توسط Domain انجام شود.

Domain فقط در سطح Application اطلاعات لازم برای Actor/Identity را دریافت می‌کند.

## 3. Authorization

Authorization حداقل در دو سطح:

1. Action-level
2. Object/Company-level

مثلاً داشتن Permission برای ویرایش Purchase به‌تنهایی کافی نیست؛ کاربر باید به Company/Resource مربوطه نیز دسترسی داشته باشد.

## 4. Tenant Isolation

Company Context از مسیر Authentication تا Persistence باید حفظ شود.

هیچ API، Query، Job، Agent یا Report نباید بتواند Scope شرکت را دور بزند.

## 5. Agent Security

Agent ابزار و Permission خودش را دارد و نباید Permission کاربر را کورکورانه افزایش دهد.

اصل:

> Agent cannot exceed the effective permissions of its execution principal.

## 6. Secrets

Secretها در:

- Environment/Secret Store
- Configuration امن

نگهداری می‌شوند و داخل Repository، Database Business Data یا Container Image قرار نمی‌گیرند.

## 7. Encryption

حداقل:

- TLS برای ارتباطات
- Encryption at rest برای داده حساس و Backupها

## 8. File Security

دسترسی به فایل بر اساس Company و Permission کنترل می‌شود.

URL یا Reference فایل نباید به‌تنهایی مجوز دسترسی باشد.

## 9. Audit Security

مواردی مانند:

- Login/Logout
- Permission changes
- Access denials
- Secret/config changes
- Role changes
- Sensitive exports
- Administrative actions

قابل Audit هستند.

## 10. Rate Limiting

برای Endpointهای حساس، Authentication و Integrationها Rate Limit مناسب وجود خواهد داشت.

## 11. Session / Token

Tokenها کوتاه‌عمر و Refresh/Session با قواعد مشخص مدیریت می‌شوند. جزئیات فنی در Engineering استاندارد می‌شود.

## 12. Data Minimization

Agent، Reporting و Integration فقط داده موردنیاز را دریافت می‌کنند.

## 13. Security Failure

خطای Authorization باید Fail Closed باشد.

در حالت نامعلوم، دسترسی اعطا نمی‌شود.

## 14. اصول قطعی

- Least Privilege
- Fail Closed
- Tenant Isolation
- No Secret in Code
- No Direct File Access Bypass
- Agent cannot elevate privilege
