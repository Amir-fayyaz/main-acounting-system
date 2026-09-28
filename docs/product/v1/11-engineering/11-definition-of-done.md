# 11 — Definition of Done

یک Task/Issue زمانی Done است که موارد مرتبط زیر تکمیل شده باشند:

## Product

- Acceptance Criteria اجرا شده‌اند.
- Scope حفظ شده است.

## Domain

- Business Ruleها رعایت شده‌اند.
- Invariantها تست شده‌اند.

## Architecture

- Module Boundary حفظ شده.
- وابستگی ممنوع ایجاد نشده.
- ADR مرتبط رعایت شده.

## Engineering

- Code Review انجام شده.
- Lint/Type Check موفق.
- Testهای لازم موفق.
- Migration در صورت نیاز ثبت شده.
- Observability لازم اضافه شده.
- Security اثر تغییر بررسی شده.

## Operations

- Failure/Retry/Recovery برای عملیات حساس مشخص است.
- Idempotency بررسی شده.
- Documentation لازم به‌روزرسانی شده.

## Release

- CI موفق.
- Artifact قابل ساخت/استقرار است.
