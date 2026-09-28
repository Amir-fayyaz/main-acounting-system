# ADR-013 — معماری API

- شناسه: ADR-013
- وضعیت: پذیرفته‌شده
- نسخه: v1
- تاریخ: 2026-09-27
- حوزه: API

## 1. تصمیم

API اصلی Client/Backend در MVP، **REST** است.

GraphQL و RPC عمومی در MVP استفاده نمی‌شوند.

## 2. Module Ownership

Endpointها در Presentation همان Module قرار دارند.

Controller مرکزی همه Domainها ممنوع است.

## 3. Resource vs Use Case

API صرفاً CRUD روی Entityها نیست.

برای عملیات مهم کسب‌وکاری، Endpointهای Use Case/Command محور مجاز و ترجیحی هستند.

مثال:

```text
POST /purchases/{id}/approve
POST /plans/{id}/execute
POST /payments/{id}/reverse
```

## 4. Versioning

API عمومی Versioned است تا تغییرات Breaking کنترل شوند.

## 5. Authentication

Authentication قبل از Authorization انجام می‌شود.

## 6. Authorization

Endpoint باید:

- Identity
- Company Context
- Permission
- Object Access

را بررسی کند.

## 7. Validation

Request Validation در Presentation/Application انجام می‌شود؛ Business Invariant در Domain مرجع نهایی است.

## 8. Error Contract

خطاها ساختار استاندارد دارند و حداقل شامل:

- Error Code
- Message مناسب UI
- Correlation ID
- Validation Details در صورت نیاز

هستند.

Business Error و Technical Error باید قابل تفکیک باشند.

## 9. Idempotency

Endpointهای حساس Command محور باید Idempotency Key یا مکانیزم معادل داشته باشند.

## 10. Pagination

Listهای بزرگ باید Pagination داشته باشند.

## 11. Filtering / Sorting

Filtering و Sorting باید محدود و Contract-based باشند و نباید امکان Query دلخواه به Database بدهند.

## 12. File Upload

Upload فایل از API به File Module می‌رود و بعد Processing Job ایجاد می‌شود.

## 13. Async Response

برای Jobهای Async، API باید:

- Job ID
- Current Status
- Result Reference

را در اختیار Client قرار دهد.

## 14. API Contract

API DTOها از Domain Entity جدا هستند.

ORM/Domain Model مستقیماً به JSON API تبدیل نمی‌شود.

## 15. اصول قطعی

- REST
- Versioned Contracts
- DTO ≠ Domain Entity
- No Direct DB Query API
- Idempotency برای عملیات حساس
- Standard Error Contract
