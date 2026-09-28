# TECH-010 — API Contract

- وضعیت: پذیرفته‌شده
- انتخاب: REST + OpenAPI

## قواعد

- REST قرارداد اصلی Client/Backend است.
- OpenAPI مرجع رسمی قرارداد API است.
- Versioning از ابتدا در Contract لحاظ می‌شود.
- Error Contract یکنواخت است.
- Validation در Backend اجباری است.
- عملیات حساس Idempotency Key یا معادل لازم دارند.
- Pagination و Filtering برای Collectionها استاندارد است.
- API مستقیماً Schema Database را expose نمی‌کند.
