# TECH-001 — Backend Stack

- وضعیت: پذیرفته‌شده
- انتخاب: NestJS + TypeScript

## تصمیم

Backend محصول با NestJS و TypeScript ساخته می‌شود.

NestJS برای Modular Monolith مناسب است چون Moduleها و Providerها را به‌صورت صریح سازمان‌دهی و Encapsulation می‌کند. ساختار Feature Module نیز با مرزهای Domain محصول هم‌راستاست. citeturn487286search0turn487286search1

## قواعد

- Nest Module نباید جای Bounded Context را به‌تنهایی تعریف کند؛ Domain Boundary از Domain Model می‌آید.
- Controller فقط ورودی/خروجی API را مدیریت می‌کند.
- Providerهای Nest مجازند Application/Infrastructure Adapter باشند؛ Domain مستقل می‌ماند.
- Dependency Injection از طریق Contract/Token انجام می‌شود.
- استفاده از Global Module فقط برای زیرساخت‌های واقعاً مشترک مجاز است.

## یادداشت پیاده‌سازی

- پکیج‌های `@nestjs/*` نسخه ۱۲ فقط ESM منتشر می‌شوند؛ بنابراین Backend به‌صورت ESM اجرا می‌شود و Importهای نسبی با پسوند `.js` نوشته می‌شوند.
- TypeScript روی خط نسخه ۵.۹ نگه داشته می‌شود تا با ابزارهای فعلی (typescript-eslint، مولدهای Nest و ابزار تست) سازگار بماند.
- تست Backend با Vitest و کامپایل SWC اجرا می‌شود تا ESM و `emitDecoratorMetadata` هم‌زمان پشتیبانی شوند.

این تصمیم ماهیت فناورانه دارد و مرز Domain یا Module را تغییر نمی‌دهد.
