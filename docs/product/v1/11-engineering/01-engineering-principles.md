# 01 — Engineering Principles

- وضعیت: پذیرفته‌شده
- نسخه: v1

## 1. هدف

Engineering باید طوری تعریف شود که Developer یا Developer Agent بتواند بدون حدس‌زدن، معماری تصویب‌شده را به کد قابل نگهداری، قابل تست، امن و قابل استقرار تبدیل کند.

## 2. اصول قطعی

1. منطق کسب‌وکار در Domain قرار می‌گیرد.
2. مرز Moduleها مطلق است و برای سرعت توسعه دور زده نمی‌شود.
3. Domain به Framework، ORM، Redis، Queue، HTTP یا Provider خارجی وابسته نیست.
4. هر Use Case قابل توجه قرارداد و نقطه ورود مشخص دارد.
5. خطا باید صریح و قابل ردیابی باشد.
6. عملیات حساس باید Idempotent یا Duplicate-aware باشند.
7. Data Integrity بر سرعت توسعه مقدم است.
8. تغییرات قابل تست باید با Test مناسب همراه باشند.
9. Infrastructure مالک Business Logic نیست.
10. Secret در Source Code یا Image قرار نمی‌گیرد.
11. عملیات سنگین در Request اصلی اجرا نمی‌شوند.
12. Contractهای پایدار Versionable هستند.
13. Security و Observability از ابتدا ساخته می‌شوند.
14. Shared/Common فقط برای مفاهیم واقعاً عمومی است و به محل Business Logic تبدیل نمی‌شود.
15. تغییرات Schema، API و قراردادهای بین Moduleها باید قابل ردیابی باشند.

## 3. اولویت در تعارض

1. Data Integrity
2. Security
3. Reliability
4. Correctness
5. Performance
6. Maintainability
7. Development Speed

## 4. قواعد ممنوع

- دسترسی مستقیم به Persistence یک Module دیگر
- Business Logic در Controller
- Business Logic در ORM Model
- وابستگی Domain به Infrastructure
- Hard Delete برای Business Data
- Retry کورکورانه عملیات مالی
- Catch و Ignore کردن خطا
- اجرای Job طولانی به‌صورت Synchronous
- Secret داخل Repository
- استفاده از Shared/Common برای دور زدن مرز Domain

## 5. حداقل انتظار از Developer Agent

Agent توسعه‌دهنده قبل از تغییر کد باید Story، Acceptance Criteria، Domain، ADR مرتبط و Engineering Rules را بررسی کند و بعد از تغییر، Test و اثر Migration/Recovery را نیز بررسی کند.
