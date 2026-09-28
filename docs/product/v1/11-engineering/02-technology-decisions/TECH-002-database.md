# TECH-002 — Database

- وضعیت: پذیرفته‌شده
- انتخاب: MySQL
- خط مبنا: MySQL 8.4 LTS family در شروع پیاده‌سازی، با آخرین patch پشتیبانی‌شده زمان استقرار

## تصمیم

MySQL Database اصلی محصول است.

MySQL تراکنش‌های استاندارد START TRANSACTION/COMMIT/ROLLBACK و Constraintهایی مانند CHECK را پشتیبانی می‌کند و برای Consistency موردنیاز محصول مناسب است. citeturn487286search3turn487286search6

## قواعد

- Database یکی از Sourceهای فنی Truth است، اما Domain Source of Business Truth باقی می‌ماند.
- Invariantهای حساس علاوه بر Domain تا حد مناسب در Database نیز enforce می‌شوند.
- Engine و Transaction configuration باید با نیازهای مالی انتخاب و تست شوند.
- Schema تغییرپذیر است ولی داده مالی حذف نمی‌شود.
