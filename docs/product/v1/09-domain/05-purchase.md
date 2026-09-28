# دامنه خرید

## 1. هدف

مدیریت چرخه خرید از ثبت خرید تا تأثیرهای عملیاتی و مالی، بدون مالکیت مستقیم بر Inventory یا Accounting Entityها.

## 2. مفاهیم اصلی

- Purchase
- PurchaseLine
- Supplier Reference
- Purchase Invoice Reference
- Purchase Status
- Payable Reference

## 3. چرخه وضعیت

```text
Draft → Validated → Approved → Received/Accounted → Completed
```

جزئیات وضعیت ممکن است بر اساس سناریوی خرید متفاوت باشد.

## 4. Invariants

- خرید تأییدنشده نباید اثر قطعی مالی یا موجودی ایجاد کند.
- هر PurchaseLine محصول، مقدار و مبلغ معتبر دارد.
- دریافت کالا از مسیر Inventory Command انجام می‌شود.
- ایجاد بدهی از طریق قرارداد Payable/Accounting انجام می‌شود.
- اطلاعات خرید ثبت‌شده مستقیم حذف نمی‌شود.

## 5. Commands

CreatePurchase، UpdateDraftPurchase، ValidatePurchase، ApprovePurchase، RegisterReceipt، FinalizePurchase، CancelDraftPurchase

## 6. Events

PurchaseCreated، PurchaseValidated، PurchaseApproved، PurchaseReceived، PurchaseFinalized، PurchaseCancelled

## 7. Cross-Domain

```text
Purchase → Inventory Command
Purchase → Payable/Accounting Effect
Purchase → Tax
Purchase → Party
Purchase → Agent Plan
```

هیچ‌یک از این تعامل‌ها با دست‌کاری Entity دامنه مقصد انجام نمی‌شود.
