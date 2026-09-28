# 04 — Coding Standards

## TypeScript

- strict mode الزامی است.
- `any` فقط با توجیه مکتوب و نادر مجاز است.
- Type/Interface/Enum naming استاندارد داشته باشد.
- Functionها کوچک و تک‌مسئولیتی باشند.
- Mutationهای پنهان در Domain ممنوع است.

## Domain

- Entity و Value Object خودشان Invariantهایشان را enforce می‌کنند.
- Primitive obsession در مفاهیم مالی تا حد منطقی کاهش یابد.
- Money، Currency و Business Date از Primitive خام مستقل باشند.

## Application

- Handler/Use Case یک هدف مشخص داشته باشد.
- Orchestration در Application انجام شود.
- Business Rule اصلی در Application نوشته نشود.

## Infrastructure

- Adapterها پشت Port قرار می‌گیرند.
- ORM و SDK خارجی به بیرون Infrastructure نشت نمی‌کنند.

## API

- DTO برای API از Domain Entity جدا است.
- Validation در مرز API انجام می‌شود.
- Errorها با Contract مشترک برگردانده می‌شوند.

## Naming

نام‌ها باید از Domain Language استفاده کنند؛ از نام‌های مبهم مانند `DataService`, `CommonManager`, `HelperService` پرهیز شود.
