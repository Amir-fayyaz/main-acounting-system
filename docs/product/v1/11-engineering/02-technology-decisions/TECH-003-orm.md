# TECH-003 — ORM / Data Access

- وضعیت: پذیرفته‌شده
- انتخاب: Drizzle ORM + mysql2

## تصمیم

برای Persistence از Drizzle ORM همراه با mysql2 استفاده می‌کنیم.

Drizzle به‌صورت رسمی MySQL را با mysql2 پشتیبانی می‌کند و رویکرد TypeScript-first آن با جداسازی Domain Entity از Persistence Model سازگار است. citeturn487286search2turn487286search7

Slonik انتخاب نشد چون برای PostgreSQL طراحی شده و با MySQL مقصد ما هم‌خوان نیست.

## قواعد

- Domain Entity هرگز ORM Model نیست.
- Schema و Migration در Persistence Layer هر Module قرار می‌گیرد.
- Queryهای پیچیده فقط در Persistence Layer باقی می‌مانند.
- Business Rule داخل Drizzle Schema یا Repository قرار نمی‌گیرد.
- Transactionهای لازم از طریق Unit of Work/Transaction Contract مدیریت می‌شوند و API حساس نباید مستقیماً به ORM وابسته شود.
