# دامنه شرکت و دسترسی

## 1. هدف

مدل کردن شرکت، کاربر، عضویت، نقش و مجوز به‌عنوان پایه هویتی محصول، بدون مالکیت بر منطق مالی سایر دامنه‌ها.

## 2. مفاهیم اصلی

- User
- Company
- Membership
- Role
- Permission
- FiscalYear / FiscalPeriod reference
- Company Settings

## 3. مالکیت

این دامنه مالک هویت، عضویت، نقش، مجوز و تنظیمات سطح شرکت است. داده مالی متعلق به این دامنه نیست.

## 4. چرخه عمر Membership

```text
Invited → Active → Suspended → Revoked
```

## 5. قواعد دامنه

- Membership از User و Company مستقل است.
- غیرفعال‌سازی عضویت نباید سوابق مالی قبلی را حذف کند.
- هر عملیات حساس باید Membership و Permission معتبر داشته باشد.
- در MVP هر کاربر یک شرکت فعال دارد، اما مدل Membership برای چندشرکتی آینده طراحی می‌شود.
- تنظیمات شرکت نباید بتوانند Invariantهای دامنه مالی را دور بزنند.

## 6. Commands

- CreateCompany
- UpdateCompanyProfile
- InviteMember
- ActivateMembership
- SuspendMembership
- RevokeMembership
- AssignRole
- ChangePermissions
- ConfigureCompanySettings

## 7. Domain Events

- CompanyCreated
- MembershipActivated
- MembershipSuspended
- MembershipRevoked
- RoleAssigned
- PermissionChanged
- CompanySettingsChanged

## 8. Cross-Domain

Accounting، Tax، Inventory و سایر دامنه‌ها فقط وضعیت دسترسی را مصرف می‌کنند و نباید Membership را مستقیماً تغییر دهند.
