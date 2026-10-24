# 25 — Validate User Membership in Tenant

- وضعیت: کد و تست‌ها نوشته شده‌اند؛ اجرای Quality Gate و ادغام نهایی با Issue #96 در انتظار است
- مرجع: `[Tenant/Infra] Validate User Membership in Tenant`؛ وابسته به قرارداد مرزی Issue #96
- مالکیت: Identity / Authorization boundary (IAM-006)
- کد مرتبط: `apps/backend/src/modules/identity/`

## 1. هدف و مرز

هر عملیات Tenant-Scoped باید پیش از رسیدن به Handler/Use Case، Membership فعال کاربر در Tenant هدف را تأیید کند. شناسهٔ Route یک claim است، نه Grant. Header متعارض `x-tenant-id` نیز نباید Tenant را انتخاب کند و روی Routeهای Tenant-Scoped باعث رد امن درخواست می‌شود.

این Task نقش‌ها، دعوت‌نامه‌ها، sign-up یا مدیریت Membership را پیاده‌سازی نمی‌کند. Permissionهای فعلی IAM-004 همچنان پس از تأیید Membership اعمال می‌شوند.

## 2. طراحی پیاده‌سازی

- `TenantMembership` یک Port در Application است که Membership فعال زوج `(UserId, TenantReference)` را پیدا می‌کند؛ فقط `membershipId` و `tenantId` را به‌عنوان شواهد حداقلی برمی‌گرداند. Membership ناموجود و غیرفعال هر دو `undefined` می‌شوند؛ aggregate کامل از Port بیرون نمی‌رود.
- `MembershipTenantMembershipAdapter` آن Port را به `MembershipRepository.findByUserAndTenant` متصل می‌کند و وضعیت فعال را بررسی می‌کند.
- `AuthorizeActionUseCase` از این Port برای حل شواهد Authorization استفاده می‌کند؛ query فقط روی زوج کاربر/شرکت اجرا می‌شود و Tenant Directory برای تمایز Tenant ناشناخته از غیرعضو پرس‌وجو نمی‌شود.
- `AuthorizationGuard` پیش از Controller و Use Case، Tenant هدف را از Route policy/convention می‌گیرد، Header متعارض را به‌عنوان claim ناسازگار می‌بیند و همان قرارداد Authorization را فراخوانی می‌کند.
- `TENANT_ACCESS_DENIED` پاسخ عمومی 403 برای Membership ناموجود/غیرفعال و Header متعارض است. خطاهای قدیمی `MEMBERSHIP_REQUIRED` و `MEMBERSHIP_INACTIVE` نیز در mapper به همین پاسخ پایدار نرمال می‌شوند.
- Audit رد دسترسی، `correlationId` را ثبت می‌کند و `claimedTenantId` و هر Tenant ID ادعاشده را از metadata حذف می‌کند.

## 3. ارتباط با B-02 و Issue #96

در snapshot بررسی‌شده، B-02 از نظر persistence پایه حاضر است:

- `apps/backend/src/modules/identity/infrastructure/persistence/drizzle-membership.schema.ts`
- `apps/backend/src/modules/identity/infrastructure/persistence/drizzle-membership.repository.ts`
- `apps/backend/src/modules/identity/domain/repositories/membership.repository.ts`

بنابراین Adapter موقت یا جدول موازی ساخته نشده است. `MembershipTenantMembershipAdapter` آداپتور تولیدی Port جدید روی Repository موجود است؛ اگر B-02 در شاخهٔ اصلی تیم تغییر API دهد، همین اتصال باید در همان تغییر به‌روزرسانی شود.

در ZIP مبنا، Interceptor مستقل Issue #96 دیده نمی‌شد. نسخهٔ فعلی از `AuthorizationGuard` سراسری موجود استفاده می‌کند و Tenant هدف را از route parameter حل‌شده توسط Router می‌گیرد؛ این کنترل پیش از Handler/Use Case اجرا می‌شود. ادغام با Issue #96 هنوز تأیید نشده است: اگر Interceptor آن Issue منبع canonical جدیدی برای Tenant Context ایجاد کند، باید ترتیب lifecycle و منبع Tenant دوباره بررسی شود تا کنترل پیش از resolution یا مسیر بدون محافظ باقی نماند.

## 4. چک‌لیست پیاده‌سازی

- [x] تعریف Port مستقل `TenantMembership`.
- [x] اتصال Port به Membership Repository موجود؛ بدون ساخت جدول یا جریان ثبت‌نام.
- [x] اجرای lookup روی زوج User/Tenant و بررسی active بودن Membership.
- [x] افزودن خطای پایدار `TENANT_ACCESS_DENIED` و نگاشت آن به HTTP 403.
- [x] نرمال‌کردن خطاهای قدیمی Membership در مرز HTTP به `TENANT_ACCESS_DENIED`.
- [x] رد Header متعارض/مبهم روی Route Tenant-Scoped؛ Header هیچ‌وقت Tenant را انتخاب نمی‌کند.
- [x] fail-closed برای Route پارامتری `:tenantId` حتی اگر `tenantParam` از روی اشتباه حذف شود.
- [x] fail-closed برای مسیرهای Root Tenant با پارامتر `:id` که `tenantParam` ندارند.
- [x] جلوگیری از دورزدن کنترل با `@Public()` یا `@RequiresAuthentication()` روی Routeهای Tenant-Scoped.
- [x] ثبت `correlationId` در Audit رد دسترسی.
- [x] حذف Tenant ID ادعاشده از metadata مربوط به رد دسترسی.
- [x] یادداشت پیگیری B-02: چون Repository/Schema موجود است، Adapter موقت لازم نیست.

## 5. چک‌لیست Verification

### تست‌های افزوده‌شده به کد

- [x] Unit test: عضو فعال با Permission لازم مجاز است.
- [x] Unit test: non-member و Membership غیرفعال `TENANT_ACCESS_DENIED` می‌گیرند.
- [x] Unit test: Tenant بدون Membership و شناسهٔ Tenant ناشناخته، کد و پیام Domain یکسان دارند.
- [x] Unit test: رد دسترسی با correlation ID ثبت می‌شود و شناسهٔ Tenant در metadata وجود ندارد.
- [x] HTTP e2e: عضو شرکت A با Tenant شرکت B رد می‌شود.
- [x] HTTP e2e: `x-tenant-id` متعارض رد می‌شود، حتی وقتی مسیر خودش Membership معتبر دارد.
- [x] HTTP e2e: بدنهٔ پاسخ Tenant موجود ولی غیرعضو و Tenant ناشناخته یکسان است.
- [x] HTTP e2e: مسیرهای tenant-scoped بدون `tenantParam` و مسیرهای public/auth-only fail-closed هستند.

### نتایج اجرایی که هنوز تأیید نشده‌اند

- [ ] اجرای واقعی suite تست‌های Unit و HTTP e2e در محیط دارای وابستگی‌های نصب‌شده.
- [ ] اجرای `pnpm verify` و ثبت نتیجهٔ کامل Typecheck/Lint/Format/Test/Build.
- [ ] ادغام و بازبینی lifecycle با Tenant Resolution مربوط به Issue #96.
- [ ] بررسی آماری timing در محیط تست کنترل‌شده؛ تست CI برابری دقیق میلی‌ثانیه را assert نمی‌کند.

## 6. Definition of Done

- [x] Port و Adapter تولیدی روی Repository موجود پیاده‌سازی شده‌اند.
- [x] کنترل مرزی در `AuthorizationGuard` و خطای پایدار `TENANT_ACCESS_DENIED` اضافه شده‌اند.
- [x] تست‌های Unit و HTTP e2e به کد افزوده شده‌اند؛ اجرای موفق آن‌ها هنوز تأیید نشده است.
- [x] یادداشت ردیابی ارتباط با B-02 و Issue #96 ثبت شده است.
- [ ] سازگاری نهایی با lifecycle مربوط به Issue #96 تأیید شده است.
- [ ] تست‌ها و `pnpm verify` در محیط دارای وابستگی نصب‌شده سبز هستند.

> وضعیت Verification: اجرای `corepack pnpm --version` در محیط ساخت به علت نبود دسترسی شبکه برای دریافت `pnpm@12.10.1` ناموفق بود و در این workspace نیز `node_modules` موجود نیست. به همین دلیل تست یا `pnpm verify` را موفق علامت نمی‌زنیم.
