# TECH-009 — Containers و Local Development

- وضعیت: پذیرفته‌شده

## تصمیم

Production و محیط‌های نزدیک به Production با Docker اجرا می‌شوند.

Local Development از Docker Compose یا معادل سازگار استفاده می‌کند تا سرویس‌های زیر قابل اجرای استاندارد باشند:

- Backend
- Frontend
- MySQL
- Redis
- MinIO
- Worker
- Scheduler

Configuration محیط از Environment/Secret مدیریت می‌شود و نباید داخل Image Hard-code شود.
