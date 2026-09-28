# 06 — Security Engineering

## اصول

- Least Privilege
- Defense in Depth
- Secure by Default
- Tenant Isolation
- Server-side Authorization
- Secrets خارج از Source Code

## الزامات

- Authentication در Backend مرجع است.
- Authorization در Endpoint و Use Case اعمال می‌شود.
- Object-level access بررسی می‌شود.
- فایل‌ها فقط از طریق Access Policy مجاز ارائه می‌شوند.
- Audit رویدادهای امنیتی مهم ثبت می‌شود.
- Backup رمزنگاری می‌شود.
- ارتباطات خارج از Process با TLS/HTTPS انجام می‌شود.
- Input Validation در مرزهای Trust انجام می‌شود.
- خروجی Error نباید Secret یا اطلاعات حساس داخلی را افشا کند.
