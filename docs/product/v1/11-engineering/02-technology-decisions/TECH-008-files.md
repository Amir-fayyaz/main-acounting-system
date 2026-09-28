# TECH-008 — File Storage

- وضعیت: پذیرفته‌شده
- انتخاب MVP: MinIO

## تصمیم

File Storage با یک Storage abstraction پیاده‌سازی می‌شود و Provider پیش‌فرض MVP، MinIO است.

## قواعد

- Domain فقط File/Document Contract را می‌شناسد.
- File Module مالک Object و Metadata فایل است.
- Business Module رابطه فایل با Business Entity را مالک است.
- Object Key و Storage credential خارج از Domain هستند.
- Hash فایل، Size، MIME Type، Version و Processing Status نگهداری می‌شوند.
- سقف فایل در MVP برابر 20MB است.
