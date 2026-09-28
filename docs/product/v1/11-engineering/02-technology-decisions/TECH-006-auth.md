# TECH-006 — Authentication / Authorization

- وضعیت: پذیرفته‌شده

## تصمیم

Authentication داخلی محصول در MVP پیاده می‌شود و طوری طراحی می‌شود که Providerهای خارجی مانند OIDC/LDAP/SSO در آینده قابل اضافه‌شدن باشند.

## اجزای پایه

- User
- Credential
- Session / Token
- Role
- Permission
- Company Membership / Context

## قواعد

- Authentication هویت را تأیید می‌کند؛ Authorization مجوز عملیات و Object را تعیین می‌کند.
- Company/Tenant Context همیشه پس از احراز هویت کنترل می‌شود.
- Object-level authorization برای داده مالی الزامی است.
- Passwordها با الگوریتم امن و تنظیمات استاندارد زمان پیاده‌سازی ذخیره می‌شوند؛ Secret خام هرگز ذخیره نمی‌شود.
- Permission Check فقط در UI انجام نمی‌شود و Backend مرجع نهایی است.
