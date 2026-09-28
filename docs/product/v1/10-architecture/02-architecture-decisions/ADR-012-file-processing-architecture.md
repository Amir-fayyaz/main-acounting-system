# ADR-012 — معماری فایل و پردازش اسناد

- شناسه: ADR-012
- وضعیت: پذیرفته‌شده
- نسخه: v1
- تاریخ: 2026-09-27
- حوزه: Files / Documents / Extraction

## 1. تصمیم

File Storage و File Processing از Business Domain جدا هستند.

File/Document Module مالک:

- File Blob
- File Metadata
- Version
- Hash
- Processing Status
- Extraction Artifact

است.

Business Domain مالک رابطه کسب‌وکاری با فایل است.

## 2. File Reference

Business Entity به‌جای نگهداری Blob، به Document/File ID اشاره می‌کند.

```text
Purchase
  └── DocumentId
```

## 3. حجم فایل

حداکثر حجم فایل MVP: 20MB.

اگر در آینده نیاز به فایل‌های بزرگ‌تر ایجاد شد، باید تصمیم جداگانه معماری اتخاذ شود.

## 4. فایل Immutable

فایل ثبت‌شده به‌صورت تاریخی Immutable است.

ویرایش فایل به‌صورت overwrite انجام نمی‌شود؛ نسخه جدید ایجاد می‌شود.

## 5. Hash

برای فایل‌های مهم Hash/Checksum ثبت می‌شود تا:

- تشخیص Duplicate
- Integrity
- Trace

ممکن شود.

## 6. Processing Pipeline

```text
Upload
  ↓
Validation
  ↓
Persist File
  ↓
Create Processing Job
  ↓
Extract / Parse
  ↓
Validate Extraction
  ↓
Store Extraction Result
  ↓
Business Review / Agent Plan
```

## 7. Async

Extraction، Parsing، OCR و Import فایل‌های سنگین Async هستند.

## 8. Extraction Result

نتیجه استخراج از فایل اصلی جدا ذخیره می‌شود و می‌تواند شامل:

- Raw Extraction
- Normalized Data
- Confidence
- Warnings
- Errors

باشد.

## 9. Reprocessing

فایل باید قابلیت Reprocess داشته باشد بدون اینکه Result قبلی از بین برود.

## 10. Confidence

Field-level یا Document-level Confidence در صورت استفاده از AI/OCR قابل نگهداری است.

Low Confidence باید به مسیر Review هدایت شود، نه تبدیل به Truth خودکار.

## 11. Security

File Access با Company و Permission کنترل می‌شود.

## 12. Duplicate Detection

Hash و Business Context می‌توانند برای تشخیص Duplicate Candidate استفاده شوند؛ تشخیص Duplicate نهایی باید طبق Domain Rule انجام شود.

## 13. Malformed/Unsafe Files

فایل نامعتبر یا ناسالم نباید وارد Extraction Business Pipeline شود.

## 14. اصول قطعی

- File ≠ Business Entity
- File Metadata ≠ Business Truth
- File Versioning اجباری است.
- Processing Async است.
- Result قبلی نباید silent overwrite شود.
