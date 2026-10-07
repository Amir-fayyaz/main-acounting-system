# 23 — Authorization

- وضعیت: پذیرفته‌شده
- نسخه: v1
- مرجع اجرا: `apps/backend/src/modules/identity/` (IAM-006)
- مبنای تصمیم: ADR-010 (بخش‌های ۲–۴، ۹ و ۱۳)، ADR-002 (بخش‌های ۸ و ۱۲)، ADR-003 (بخش ۲۴)،
  ADR-013 (بخش ۸)، سند ۲۱ (Tenant Context)، سند ۰۶ (Security Engineering)،
  قواعد IAM-003/۰۴/۰۵

## 1. هدف

این سند **Authorization** را ثبت می‌کند: لایه‌ای که تصمیم می‌گیرد آیا یک Principalِ
احرازشده مجاز به اجرای یک عملیات است یا نه — بر پایهٔ **Membership فعال** در Tenantِ
هدف و **Permissionهای مؤثر** نقش‌های همان Membership. تصمیم از Authentication جدا است،
در لایهٔ Application اجرا می‌شود، در نبودِ هر پیش‌شرطی **Fail-Closed** رد می‌کند و به هیچ
لایه‌ای اجازه نمی‌دهد Tenant یا مجوز را از ورودی Client بگیرد.

**خارج از محدوده:** احراز هویت (IAM-005)، مدیریت Credential، تعریف نقش و مجوز (IAM-004)،
مدیریت Membership (IAM-003)، UI مجوزدهی Frontend، SSO/OIDC/LDAP، قواعد تجاری
اختصاصیِ هر Business Module، Audit Storage (AUD-001) و Super-Admin.

## 2. مالکیت — مسیرِ تصمیم

```text
Client (بدونِ اعتماد)        tenantId در Path/Body/Query = فقط «ادعا»
    │
Presentation (Guard)         AuthenticationContext → Authorization requirement
    │                        (Principal از Token، ادعای Tenant از Route Param)
Application (Contract)       authorize(principal, permission, targetTenantId)
    │                        ← Membership + Permissionهای مؤثر + تصمیم
Domain (Policy)              decideAuthorization(requirement, evidence) — تابع خالص
    │
Presentation (Handler)       فقط پس از allow؛ TenantScope از همان Tenantِ تأییدشده
```

- **Domain مالک «قاعده» است:** تنها یک تابع خالص — `decideAuthorization` — تصمیم را
  می‌گیرد؛ نه Repository، نه ساعت، نه Context محیطی.
- **Application مالک «حل» است:** `AuthorizeActionUseCase` واقعیت‌ها را از پورت‌های
  IAM-003/۰۴ و وضعیت جاریِ User (IAM-002/۰۵) می‌خواند و تصمیم را برمی‌گرداند.
- **Presentation مالک «اعلام و ترجمه» است:** Endpoint اعلام می‌کند چه می‌خواهد
  (`@Public` / `@RequiresAuthentication` / `@Authorize`) و Guard آن را به ۴۰۱/۴۰۳ ترجمه
  می‌کند — بدون اینکه تصمیم به HTTP وابسته شود.

## 3. قرارداد — سه لایه، یک تصمیم

| قرارداد | نقش | مصرف‌کننده |
| --- | --- | --- |
| `AuthorizationRequirement` (`domain/authorization/`) | capability + `tenantScoped` | Policy |
| `AuthorizationEvidence` | Tenantِ هدف، Membership، Permissionهای مؤثر | Policy |
| `decideAuthorization(requirement, evidence)` | تصمیم خالص: allow یا ردِ دلیل‌دار | Application |
| `permits(permissions, key)` | پرسشِ درون‌حافظه‌ای پس از حلِ Context | Application / ماژول‌ها |
| `Authorization` (پورت، توکن `AUTHORIZATION`) | `authorize(request)` + `permits(context, key)` | Application / Presentation / ماژول‌های بعدی |
| `AuthorizationContextView` | `userId`، `tenantId?`، `membershipId?`، `membershipStatus?`، `permissions[]` | مصرف‌کنندهٔ عملیات |
| `AuthorizationGuard` | مرزِ HTTP + Deny-by-Default | کل Process (Global) |
| `@Public` / `@RequiresAuthentication` / `@Authorize` | اعلامِ Endpoint (`src/infrastructure/api/authorization/`) | همهٔ Controllerها |

## 4. مدلِ تصمیم — نه ردِ قطعی، یک allow

```text
tenant-scoped؟
  ├─ Tenant معتبر نیست        → TENANT_CONTEXT_REQUIRED
  ├─ Membership ندارد        → MEMBERSHIP_REQUIRED      (ادعای جعلیِ Tenant هم همین)
  ├─ Membership جای دیگری است → AUTHORIZATION_CONTEXT_INVALID
  └─ Membership فعال نیست     → MEMBERSHIP_INACTIVE
Permission در دست است؟
  ├─ نه                      → AUTHORIZATION_DENIED
  └─ بله                     → allow
```

- **ترتیب، معنا دارد:** رد، *اولین* پیش‌شرطِ ناموجود را نام می‌برد؛ پس «مجوز ندارم» با
  «عضویت ندارم» و «عضویتم فعال نیست» قابلِ تفکیک می‌ماند (الزام Issue).
- **deny by default:** هر مسیری که «بلهٔ قطعی» نیست، رد است؛ حالتِ `unknown` وجود ندارد
  (ADR-010 بخش ۱۳).
- **بدونِ افشا:** نداشتنِ Membership، Membership غیرفعال و Tenantِ جعلی همگی یک‌سان رد
  می‌شوند و پیام هرگز نمی‌گوید Tenant یا رکورد برای دیگری وجود دارد یا نه.

## 5. زمینهٔ عملیات (Authorization Context)

- **حل‌شده، نه ادعاشده:** `tenantId` همان Tenantِ Membership است؛ `permissions` همان
  مجموعهٔ مؤثرِ نقش‌های فعالِ آن Membership (IAM-004). هیچ ورودیِ Client به Context راه
  پیدا نمی‌کند (سند ۲۱، بخش ۸).
- **بدونِ راز:** هویت، Tenant، Membership و کلیدهای Capability — بدون Credential، Token،
  Hash یا Digest؛ پس Context برای Log و Audit بی‌خطر است.
- **دادهٔ ساده:** هیچ Aggregate‌ای داخل آن نیست؛ مصرف‌کننده نمی‌تواند از طریق آن وضعیت
  هویت/عضویت/نقش را تغییر دهد.

## 6. احراز هویت در برابر مجوز

| وضعیت | کد | HTTP |
| --- | --- | --- |
| بدون Authentication یا حالتِ نامعتبر | `AUTHENTICATION_REQUIRED` / `AUTHENTICATION_STATE_REJECTED` / `SESSION_*` | 401 |
| Authentication معتبر، بدون مجوز | `AUTHORIZATION_DENIED` | 403 |
| عملیات Tenant-Scoped بدونِ Tenantِ معتبر | `TENANT_CONTEXT_REQUIRED` | 403 |
| بدونِ Membership در Tenantِ هدف | `MEMBERSHIP_REQUIRED` | 403 |
| Membership غیرفعال | `MEMBERSHIP_INACTIVE` | 403 |
| Context ناسازگار/ناقص | `AUTHORIZATION_CONTEXT_INVALID` | 403 |
| عملیاتی که سیاستی اعلام نکرده | `AUTHORIZATION_POLICY_MISSING` | 403 |
| حسابِ غیرقابلِ احراز (غیرفعال‌شده پس از ورود) | `ACCOUNT_NOT_AUTHENTICATABLE` | 401 |

تبدیل به HTTP در `presentation/http/authorization-error.mapper.ts` انجام می‌شود؛ هستهٔ
تصمیم هیچ مفهومی از HTTP نمی‌شناسد.

## 7. ایزولاسیون Tenant

- Tenant از **Membershipِ تأییدشده** می‌آید، نه از Path؛ Path فقط ادعایی است که پیش از
  اجرای Handler صحت‌سنجی می‌شود. `TenantScope` پس از آن روی همان Tenantِ تأییدشده
  Establish می‌شود، پس Scope هرگز به ادعای Client متکی نیست (سند ۲۱).
- تلاشِ Cross-Tenant، مستقل از Endpoint، در **مرز** رد می‌شود: عملیات هرگز اجرا نمی‌شود
  و دادهٔ Tenantِ دیگر خوانده/نوشته نمی‌شود.
- Headerهای Client (مثل `x-tenant-id`) خوانده نمی‌شوند؛ صحت‌سنجیِ مستقل این رفتار در تست
  e2e موجود است و تست‌های IAM-006 آن را دوباره تأیید می‌کنند.

## 8. مرزِ ماژول‌ها و قراردادِ قابلِ استفادهٔ مجدد

- ماژول‌های Business برای محافظت از عملیات خود فقط `AUTHORIZATION` را Inject می‌کنند و
  `AuthorizationRequirement` خود را می‌سازند — مثلاً «نیازمند `purchase.create`» — بدونِ
  هیچ پرس‌وجوی مستقیم از جدول/Repository هویت:
  `module-boundaries.spec.ts` ورود به Persistenceِ ماژول دیگر را رد می‌کند و قرارداد در
  `application/` منتشر می‌شود (ADR-002 بخش ۱۲).
- `AuthorizationModule` به‌صورت `@Global` فقط دو چیز را منتشر می‌کند: قرارداد
  (`AUTHORIZATION`) و مرزِ HTTP (`AuthorizationGuard`). Repositoryها، جدول‌ها و Aggregateها
  بیرون نمی‌آیند.
- Guardِ Global در `AppModule` ثبت می‌شود، پس Deny-by-Default خاصیتِ Process است: هر
  Route که خود را دسته‌بندی نکند رد می‌شود. Endpointهای عملیاتی/مرجع
  (`health`، `examples`) صریحاً `@Public()` هستند و `auth/sign-in` تنها ورودیِ
  بدونِ Authentication است.
- **اعمال در دو مرز:** Guard در Presentation اجرا می‌کند و همان قرارداد در Application هم
  قابلِ فراخوانی است؛ پس Guard تنها نقطهٔ اعمال نیست و یک Use Case، Job یا ماژول دیگر
  می‌تواند همان تصمیم را بگیرد (تست e2e «یک تصمیم، دو ورودی» همین را اثبات می‌کند).

### نقشهٔ Capability روی منابعِ موجود

| منبع | عملیات | Permission | Tenant-Scoped |
| --- | --- | --- | --- |
| `tenants` | read | `company.read` | ✅ (Path) |
| `tenants` | update/status | `company.update` | ✅ |
| `tenants` | create | `company.update` | — (عملیات سطحِ سیستم) |
| `users` | read | `user.read` | — |
| `users` | create/update/status | `user.manage` | — |
| `users/{id}/credential` | set | `user.manage` | — |
| `tenants/{tenantId}/memberships` | read | `user.read` | ✅ |
| `tenants/{tenantId}/memberships` | create/status | `user.manage` | ✅ |
| `users/{userId}/memberships` | read | `user.read` | — |
| `tenants/{tenantId}/roles` | read | `role.read` | ✅ |
| `tenants/{tenantId}/roles` | create/rename/status/permissions | `role.manage` | ✅ |
| `tenants/{tenantId}/memberships/.../roles` | read | `role.read` | ✅ |
| `tenants/{tenantId}/memberships/.../roles` | assign/remove | `role.manage` | ✅ |
| `permissions` | read | `role.read` | — |

Permissionها فقط از **کاتالوگ IAM-004** می‌آیند؛ IAM-006 هیچ Capability جدیدی تعریف
نمی‌کند.

## 9. الگوهای ممنوع

```text
❌ استخراجِ Tenant یا Permission از Body/Query/Header Client به‌عنوان مجوز
❌ اعتماد به Guard یا Frontend به‌عنوان تنها نقطهٔ اعمال
❌ query کردنِ مستقیمِ جدول/Repository هویت از ماژولِ دیگر برای پرسشِ مجوز
❌ تعریفِ Catalog یا Permission جدید در IAM-006
❌ بازگرداندنِ خطای مجوز با پیامی که وجود/عدم‌وجودِ Tenant یا رکورد را افشا کند
❌ اجرای جزئیِ عملیات پیش از تصمیم، یا ادامهٔ کار پس از رد
❌ حالتِ پیش‌فرضِ Allow برای Endpointِ دسته‌بندی‌نشده
```

## 10. تست‌ها

| سطح | فایل | پوشش |
| --- | --- | --- |
| واحد (Domain) | `src/modules/identity/domain/authorization/authorization-policy.spec.ts` | allow، هر شش ردِ متمایز، بی‌اثری Tenantِ اضافی در تصمیمِ Platform، `permits` |
| واحد (Application) | `src/modules/identity/application/authorization.use-cases.spec.ts` | حلِ Membership/Permission، نقش‌های چندگانه، نقش/Assignment غیرفعال، غیرفعال‌بودنِ User، جداسازیِ احراز هویت از مجوز، عدمِ اجرای عمل هنگام رد، `permits` |
| یکپارچه (HTTP) | `test/authorization-api.e2e-spec.ts` | Guardِ واقعی + Controllerهای واقعی: موفقیت، ۴۰۱/۴۰۳ متمایز، ردِ Cross-Tenant، Membershipِ غیرفعال، Tenantِ بدشکل، نادیده‌گرفتنِ Header، Deny-by-Default، یکسانیِ تصمیم از HTTP و Application، عدمِ اجرای عمل |
| کاربردی (e2e موجود) | `test/{tenant,user,membership,role}-api.e2e-spec.ts` | اعلامِ `bearer` روی OpenAPI برای هر عملیاتِ محافظت‌شده |

```bash
pnpm --filter @accounting-saas/backend test
pnpm verify
```

## 11. معیار پذیرش

- Principalِ احرازشده در لایهٔ مجوز قابل شناسایی است و عملیات Tenant-Scoped بدونِ Tenantِ
  معتبر و Membership فعالِ همان Tenant رد می‌شود.
- Permissionهای مؤثر از مدل IAM-004 حل می‌شوند؛ عملیاتِ محافظت‌شده Capability خود را
  اعلام می‌کنند و نبودِ آن رد می‌شود.
- Deny-by-Default برقرار است: عملیاتِ دسته‌بندی‌نشده رد، و ردِ مجوز پیش از اجرای عملِ
  تجاری رخ می‌دهد (بدونِ اجرای جزئی، Escalation یا Fallback).
- ۴۰۱ (احراز هویت) و ۴۰۳ (مجوز) و کدهای Domain آن‌ها قابلِ تفکیک‌اند و تصمیم به HTTP
  وابسته نیست.
- Tenantِ اعلامیِ Client هرگز مجوز نیست؛ تلاشِ Cross-Tenant (شاملِ Path، Header و
  فراخوانی مستقیمِ Use Case) رد می‌شود.
- ماژول‌های Business بدونِ دسترسی به Persistenceِ هویت، فقط از قرارداد
  `AUTHORIZATION` استفاده می‌کنند.
- هیچ Credential/Token/دادهٔ حساسِ مجوزی در پاسخ‌ها یا Logها ظاهر نمی‌شود.
- تست‌های خودکار (واحد + HTTP e2e) و `pnpm verify` سبز است.
