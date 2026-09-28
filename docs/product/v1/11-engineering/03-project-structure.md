# 03 — Project Structure

## اصل

ساختار Repository باید با Moduleهای Domain و ADRهای معماری هم‌راستا باشد.

## Backend

```text
apps/backend/src/
├── modules/
│   ├── company-access/
│   ├── party/
│   ├── accounting/
│   ├── inventory/
│   ├── purchase/
│   ├── sales/
│   ├── treasury/
│   ├── expense/
│   ├── payroll/
│   ├── tax/
│   ├── fixed-assets/
│   ├── agent/
│   ├── documents/
│   ├── reporting/
│   └── notification/
├── shared/
└── infrastructure/
```

هر Module به‌صورت Layer + Feature سازمان‌دهی می‌شود:

```text
module/
├── domain/
├── application/
│   ├── commands/
│   ├── queries/
│   └── event-handlers/
├── infrastructure/
└── presentation/
```

Featureها در هر Layer نزدیک به Use Case خود نگه داشته می‌شوند.

## Frontend

```text
apps/frontend/
├── app/
├── features/
├── components/
├── shared/
├── lib/
└── styles/
```

Business Rule در Frontend قرار نمی‌گیرد.
