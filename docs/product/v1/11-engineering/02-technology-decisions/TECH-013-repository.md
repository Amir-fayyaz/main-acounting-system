# TECH-013 — Repository Strategy

- وضعیت: پذیرفته‌شده
- انتخاب: Monorepo

## ساختار سطح بالا

```text
repo/
├── apps/
│   ├── backend/
│   └── frontend/
├── packages/
├── infrastructure/
├── docs/
└── tooling/
```

Backend یک Modular Monolith است و Frontend یک Application مستقل در همان Repository است.

Shared packages فقط برای Contract یا Primitiveهای واقعاً عمومی مجازند.
