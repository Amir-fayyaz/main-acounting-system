# TECH-007 — Redis

- وضعیت: پذیرفته‌شده

## استفاده در MVP

Redis برای موارد زیر استفاده می‌شود:

- Internal Event Bus
- Queue/Job Infrastructure
- Cacheهای کنترل‌شده
- Coordination محدود در صورت نیاز
- وضعیت‌های موقت

## قانون سخت

Redis هرگز Source of Truth برای داده مالی یا Business State پایدار نیست.

داده پایدار باید در MySQL یا Storage مالک خودش ثبت شود.
