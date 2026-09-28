# دامنه دارایی ثابت

## 1. هدف

مدیریت چرخه عمر دارایی ثابت از شناسایی و تحصیل تا بهره‌برداری، استهلاک، انتقال، فروش و اسقاط.

## 2. مفاهیم اصلی

- FixedAsset
- AssetGroup
- AssetLocation
- AssetCustodian
- DepreciationPolicy
- DepreciationSchedule
- AssetTransfer
- AssetDisposal
- AssetSale
- AssetUnderConstruction
- Impairment Reference

## 3. روش استهلاک

سازمان بتواند روش استهلاک را تعریف کند. Domain به حداقل یک روش فعال محدود نیست و ظرفیت روش‌های متعدد را دارد.

## 4. Lifecycle

```text
Proposed → Recognized → InService → Depreciating → FullyDepreciated
                                      ↘ Sold / Disposed
```

AssetUnderConstruction:

```text
InProgress → Capitalized → InService
```

در MVP مدیریت پروژه برای دارایی در جریان ساخت وجود ندارد؛ فقط تجمع بهای مرتبط و انتقال به دارایی قابل استهلاک مدل می‌شود.

## 5. Invariants

- شروع استهلاک تابع Company Policy و تاریخ بهره‌برداری است.
- بهای اسقاط پیش‌فرض صفر ولی قابل تغییر است.
- دارایی کاملاً مستهلک‌شده از سوابق اصلی حذف نمی‌شود؛ در نمای عملیاتی می‌تواند Archival شود.
- هزینه‌های بعدی سرمایه‌ای در MVP فقط به‌عنوان قابلیت آینده مدل می‌شوند.
- تجدید ارزیابی در MVP فعال نیست؛ مدل توسعه‌پذیر می‌ماند.
- کاهش ارزش در سطح کنترل‌شده قابل مدل‌سازی است.

## 6. Commands

CreateAsset، RecognizeAsset، PlaceInService، CalculateDepreciation، PostDepreciation، TransferAsset، SellAsset، DisposeAsset، ArchiveAsset

## 7. Events

AssetRecognized، AssetPlacedInService، DepreciationCalculated، DepreciationPosted، AssetTransferred، AssetSold، AssetDisposed، AssetFullyDepreciated
