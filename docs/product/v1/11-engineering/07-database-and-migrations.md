# 07 — Database و Migrations

## قواعد

- هر Module Persistence Boundary مستقل دارد.
- Migration مالک Module خودش است.
- Migrationها Versioned و Reviewable هستند.
- Schema تغییر می‌کند ولی Business Data مالی حذف نمی‌شود.
- Foreign Key داخل Module مجاز است.
- Foreign Key بین Moduleها ممنوع است.
- Unique، Not Null و Constraintهای مهم در Database نیز enforce می‌شوند.
- Migration مخرب بدون Plan اصلاح/Recovery مجاز نیست.

## تغییرات Schema

برای تغییرات حساس:

1. بررسی Compatibility
2. Migration
3. Backfill در صورت نیاز
4. Verification
5. Application Change
6. Rollback/Recovery Plan

Migration روی داده واقعی Pilot باید قبل از Release نهایی تست شود.
