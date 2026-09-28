# TECH-004 — Frontend Stack

- وضعیت: پذیرفته‌شده
- انتخاب: Next.js + TypeScript
- تجربه: Desktop-first Web UI

## تصمیم

Frontend با Next.js و TypeScript ساخته می‌شود.

MVP اپلیکیشن Native Desktop یا Mobile جداگانه ندارد. تمرکز روی تجربه دسکتاپِ حسابدار و مدیر مالی است.

## قواعد

- Backend API مرجع Business Operation است.
- Next.js نباید Business Rule یا Accounting Logic را کپی کند.
- ارتباط اصلی با Backend از REST API انجام می‌شود.
- Componentها باید از Design System داخلی استفاده کنند.
- Stateهای فرایندی حساس باید از Backend گرفته شوند، نه از State محلی به‌عنوان Source of Truth.
- UI باید برای صفحات پرتراکم مالی، جدول‌ها، فیلترها، Approval و Exception Handling بهینه باشد.
