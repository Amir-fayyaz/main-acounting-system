# 26 — Tenant Isolation

- وضعیت: پذیرفته‌شده
- نسخه: v1
- مرجع اجرا: `apps/backend/src/shared/tenant/`، `apps/backend/src/infrastructure/database/tenant-scoped.ts`،
  `apps/backend/src/infrastructure/api/tenant/` (IAM-007)
- مبنای تصمیم: ADR-001 (بخش ۱۳)، ADR-002 (بخش‌های ۸ و ۱۲)، ADR-003 (بخش ۲۴)، ADR-008 (بخش ۱۴)،
  ADR-010 (بخش‌های ۲–۴، ۹ و ۱۳)، سند ۲۱ (Tenant Context)، سند ۲۳ (Authorization)، سند ۰۶ (Security)

## ۱. هدف

این سند **Tenant Isolation** را ثبت می‌کند: مرزی که هر عملیات — خواندن، نوشتن، انتقال وضعیت،
پردازش پس‌زمینه — در آن اجرا می‌شود و هیچ راهی برای عبور از آن وجود ندارد. مرز در **مرزهای
موردِ اعتماد** ساخته می‌شود (Guard، Interceptor، Application، Repository، Worker) و هرگز به
رفتار Client، به بررسی Frontend یا به شناسه‌ای که Client می‌فرستد وابسته نیست.

**خارج از محدوده:** مدیریت Company و Membership، تعریف Role و Permission، پیاده‌سازی
Authentication، طراحی سیاست عمومی Authorization، قواعد تجاریِ ماژول‌ها، Sharding دیتابیس و
جداسازی زیرساخت بین Tenantها.

## ۲. مالکیت — مسیرِ تصمیم

```text
Client (بدونِ اعتماد)        tenantId در Path/Body/Query/Header = فقط «ادعا»
    │
    Presentation (Guard)     Membership فعال را بررسی می‌کند و Tenantِ *اثبات‌شده* را
    │                        روی Request منتشر می‌کند
    │
    Presentation (Interceptor) همان Tenantِ اثبات‌شده را Scope می‌کند — نه شناسهٔ Route
    │
    Application (Use Case)   Tenant درخواستی را با Scope *مقایسه* می‌کند؛ ناهماهنگی = NotFound
    │
    Persistence (Adapter)    هر Query روی جدولِ Tenant-owned با `tenant_id` فیلتر می‌شود؛
    │                        هر Write مالکیت را پیش از Statement تصدیق می‌کند
    │
    Worker                   `companyId` غیرقابل‌تغییرِ Envelope، Scope را بازسازی می‌کند
```

- **Application مالک «مقایسه» است:** شناسهٔ درخواستی یک ادعاست؛ Scope تنها مرجع است و
  ناهماهنگی به «پیدا نشد» ترجمه می‌شود، نه به «متعلق به شرکت دیگری است».
- **Persistence مالک «اجرا» است:** Adapter نمی‌تواند به حافظهٔ توسعه‌دهنده تکیه کند؛ فیلتر
  Tenant در خودِ `WHERE` بنشسته است و `Write` پیش از اجرا مالکیت را تصدیق می‌کند.
- **Domain هیچ‌چیز از این ماجرا نمی‌داند:** دامنه Context محیطی را نمی‌خواند
  (`module-boundaries.spec.ts` این را مکانیکی نگه می‌دارد).

## ۳. قرارداد — چهار ابزارِ یک مرز

منبع: `apps/backend/src/infrastructure/database/tenant-scoped.ts`

| قرارداد | نقش | شکست |
| --- | --- | --- |
| `tenantEq(column)` | پیشوندِ `WHERE` برای هر جدولِ Tenant-owned | `TenantContextMissingError` |
| `assertTenantOwnership(tenantId, op)` | تصدیق مالکیت پیش از نوشتن | `TenantIsolationViolationError` |
| `assertTenantCriterion(tenantId, op)` | تصدیق اینکه معیارِ Tenant همان Tenant فعال است | `TenantIsolationViolationError` / `TenantContextMissingError` |
| `requireSystemScope(op)` | تصدیق اینکه اجرا *صریحاً* سطحِ سیستم است | `TenantIsolationViolationError` |
| `assertPlatformWrite(op)` | تصدیق اینکه رکوردِ بدون‌Owner زیر Scope Tenant نوشته نمی‌شود | `TenantIsolationViolationError` |

- **مقایسه Canonical است:** دو نگارشِ یک UUID یک Tenant‌اند (`shared/tenant/tenant-identity.ts`)،
  پس نامی که Caller از خودش می‌نویسد هرگز به بهانهٔ «شرکت دیگری» تبدیل نمی‌شود.
- **پیامِ خطا هیچ شناسه‌ای ندارد:** `TenantIsolationViolationError` فقط یک جملهٔ ثابت دارد؛
  نامِ Tenant یا شناسهٔ رکوردِ درخواستی هرگز به Client نمی‌رسد.

## ۴. Context موردِ اعتماد — HTTP

- **Guard و Interceptor یک منبعِ مشترک دارند:** `resolveTenantRouteParam`
  (`infrastructure/api/tenant/tenant-route.ts`) پارامترِ Tenant را یک‌بار تعیین می‌کند؛ پس
  مسیری نمی‌تواند *مجاز* اما *بدون Scope* اجرا شود.
- **Scope از Membershipِ اثبات‌شده ساخته می‌شود:** Guard پس از تأیید Membership فعال،
  Tenantِ خودِ آن Membership را روی Request منتشر می‌کند و Interceptor دقیقاً همان مقدار را
  منتشر می‌کند. شناسهٔ Route فقط *بررسی* می‌شود، هرگز *منبع* نمی‌شود.
- **ناسازگاری = رد:** اگر مسیر Tenant-Scoped باشد و هیچ Tenant اثبات‌شده‌ای در دست نباشد،
  درخواست با `TENANT_REQUIRED` رد می‌شود (Fail-Closed).
- **Controller دوباره Scope نمی‌سازد:** Controller فقط شکلِ شناسه را اعتبارسنجی می‌کند و
  اجازه می‌دهد Scopeِ منتشرشده بایستد.

## ۵. اجرا در Persistence

هر Adapterِ جدولِ Tenant-owned (`memberships`، `roles`، `membership_roles`، `audit_records`)
قاعده‌های زیر را رعایت می‌کند:

| عملیات | قاعده |
| --- | --- |
| خواندن با `id` | `WHERE id = ? AND tenant_id = <scope>` — شناسهٔ شرکت دیگر «پیدا نمی‌شود» |
| خواندن با معیارِ Tenant | معیار با Scope تصدیق می‌شود (`assertTenantCriterion`) |
| نوشتن | مالکیت Aggregate پیش از Statement تصدیق می‌شود (`assertTenantOwnership`) |
| فهرستِ Cross-Tenant | فقط زیر Scope صریحِ سیستم (`requireSystemScope`) |

- **جدولِ ریشه (`tenants`) استثناست:** ستونِ `tenant_id` ندارد، چون کلیدِ اصلیِ خودش *مرز*
  است. `get`/`update` آن Scopeِ فعال را تصدیق می‌کنند و `add` یک عملیات سطحِ سیستم است.
- **`TenantDirectory` فقط وجود را می‌پرسد:** این پرسش از `Repository.get` جدا شده تا
  هیچ مسیری نتواند از راهِ «آیا چنین شرکتی هست؟» به رکوردِ شرکت برسد.
- **Doubleهای تست همان قاعده را اجرا می‌کنند:** تستِ HTTP هم روی قاعدهٔ واقعی می‌ایستد.

## ۶. نوشتن، انتقال وضعیت و اصلاح

جداسازی برای همهٔ این‌ها یکسان است: `create`، `update`، `delete`، انتقال وضعیت، تأیید،
ثبت، اصلاح، برگشت، Import و عملیاتِ گروهی. چون مرز در لایهٔ Persistence اعمال می‌شود، شکلِ
عملیات تفاوتی نمی‌کند: شناسهٔ یک شرکتِ دیگر، یا یک Aggregateِ متعلق به شرکتِ دیگر، در هر
حالت پیش از هر تغییری رد می‌شود و **هیچ نوشتنِ نیمه‌تمامی باقی نمی‌ماند**.

## ۷. بررسی مالکیتِ منبع

```text
Principalِ احرازشده
        ↓
Tenant Contextِ مجاز
        ↓
خواندنِ منبع *درونِ همان Tenant*
        ↓
عملیات تجاری
```

نه این:

```text
tenantIdِ Client
        ↓
خواندنِ سراسریِ منبع
        ↓
عملیات
```

خواندنِ سراسری هیچ‌جا وجود ندارد: Adapter فیلتر Tenant را در `WHERE` می‌گذارد، پس «خواندنِ
سراسری» اصلاً یک مسیرِ قابل‌دسترس نیست.

## ۸. Jobهای پس‌زمینه

- **Envelope تنها منبعِ مالکیت است:** `companyId` غیرقابل‌تغییر Scope را بازسازی می‌کند.
- **Jobِ Tenant-Scoped بدون Owner اجرا نمی‌شود:** `tenantScoped: true` بدون `companyId` پیش از
  هر کاری رد و Terminal پارک می‌شود.
- **Payload هرگز Tenant را انتخاب نمی‌کند:** اگر Payload نامِ Tenantِ دیگری را داشته باشد و با
  Envelope تعارض داشته باشد، Job اصلاً اجرا نمی‌شود (`TenantIsolationViolationError`)؛ اگر
  تعارضی نباشد، باز هم Envelope تعیین‌کننده است و Payload نادیده گرفته می‌شود.

## ۹. رویداد و عملیاتِ ناهمگام

- **Scope از پیام بیرون نمی‌رود:** `tenantScopedMessageOptions` هویتِ Tenant را از Scope
  می‌گیرد و روی `metadata.tenantId` می‌نشاند؛ پیامِ بیرونِ هر Scope با
  `TenantContextMissingError` رد می‌شود.
- **Outbox همان Tenant را حمل می‌کند:** ستونِ `tenant_id` از همان Payload خوانده می‌شود.
- **ترکیبِ Context بین Tenantها یک شکست امنیتی است:** هیچ کدی مسیرِ «Context را از پیام
  بگیر» ندارد؛ پیام فقط *حامل* است، نه *منبع*.

## ۱۰. عملیاتِ صریحِ سطحِ سیستم

بعضی عملیات واقعاً به هیچ شرکتی تعلق ندارند: ساختِ شرکت، کاتالوگِ Permissionها، رخدادهای
ورود، خواندنِ Membershipهای یک شخص (که بین شرکت‌ها پخش است). این‌ها **صریح** اعلام می‌شوند:

- `TenantScope.runAsSystem` یک Scopeِ صریحِ سیستم است — نه «نبودِ Scope».
- **ورود به Scope سیستم از داخلِ Scope Tenant ممنوع است:** `runAsSystem` در حالتِ فعال
  `TenantIsolationViolationError` می‌دهد، پس یک Endpointِ Tenant-Scoped نمی‌تواند نیمهٔ کار
  خود را به دسترسیِ Platform ارتقا دهد.
- **پرسشِ Cross-Tenant فقط زیر Scope سیستم اجرا می‌شود:** `MembershipRepository.findByUserId`
  زیر Scope Tenant یا زیر نبودِ Scope رد می‌شود.
- **Endpoint معمولی نمی‌تواند به دسترسیِ سیستم برسد:** عملیاتِ سطحِ سیستم از مسیرِ خودش
  (Use Caseِ صریح + `runAsSystem`) اجرا می‌شود، نه از دلِ یک Endpointِ Tenant-Scoped.

## ۱۱. مرزِ ماژول‌ها

هیچ ماژولی نمی‌تواند از راهِ `Repository`، `Adapter`، `ORM Model` یا جدولِ داخلیِ ماژولِ دیگر
از مرزِ Tenant عبور کند؛ `module-boundaries.spec.ts` این را روی کدِ واقعی بررسی می‌کند.
دسترسیِ Cross-Module فقط از قراردادهای منتشرشده (Command، Query، Domain Service، Event)
می‌گذرد — و آن قراردادها هم متعهد به همین مرز‌اند.

## ۱۲. رفتارِ شکست

| وضعیت | پاسخ |
| --- | --- |
| نبودِ Context در عملیاتِ Tenant-Scoped | `TenantContextMissingError` → `TENANT_REQUIRED` |
| Context نامعتبر / بی‌اعتبار | `TenantContextMissingError` |
| Tenantِ اثبات‌نشده یا غیرمجاز | `TENANT_ACCESS_DENIED` (۴۰۳) |
| تلاش برای عبور از مرز | `TenantIsolationViolationError` → ۴۰۳ عمومی |
| نوشتنِ Platform زیر Scope Tenant | `TenantIsolationViolationError` → ۴۰۳ عمومی |

هیچ‌کدام از این‌ها «نوشتنِ نیمه‌تمام»، «افتادن به دسترسیِ سراسری»، «تعویضِ خودکارِ Tenant»
یا «افشای داده در متنِ خطا» تولید نمی‌کند.

## ۱۳. الگوهای ممنوع

```text
❌ ساختنِ Scope از Path / Body / Query / Header
❌ خواندنِ سراسریِ یک منبع و سپس بررسیِ Tenant بعد از آن
❌ Adapterِ بدون فیلترِ Tenant برای جدولِ Tenant-owned
❌ نوشتنِ Aggregateِ شرکتِ دیگر (هر شکلی)
❌ پرسشِ Cross-Tenant زیر Scopeِ غیرسیستمی
❌ `runAsSystem` از داخلِ Scopeِ فعالِ Tenant
❌ پذیرفتنِ `tenantId` از Payloadِ Job به‌عنوان مالکِ کار
❌ افشای Tenant یا شناسهٔ رکوردِ دیگری در متنِ خطا
```

## ۱۴. تست‌ها

| سطح | فایل | پوشش |
| --- | --- | --- |
| واحد (هویتِ Tenant) | `src/shared/tenant/tenant-identity.spec.ts` | نگارشِ Canonical، مقایسهٔ دو Tenant |
| واحد (گاردهای داده) | `src/infrastructure/database/tenant-scoped.spec.ts` | مالکیت، معیار، سیستم‌بودن، نوشتنِ Platform، ممنوعیتِ Escalation |
| واحد (HTTP) | `src/infrastructure/api/tenant/tenant-scope.interceptor.spec.ts` | انتشارِ Tenantِ اثبات‌شده، ردِ مسیرِ بدونِ اثبات، استنتاجِ `:tenantId` و `:id` |
| واحد (Job) | `src/infrastructure/jobs/job-dispatcher.spec.ts` | بازسازیِ Scope، ردِ Jobِ بدونِ Owner، ردِ تعارضِ Payload با Envelope |
| یکپارچه (HTTP، خصمانه) | `test/tenant-isolation.e2e-spec.ts` | خواندن/نوشتن/به‌روزرسانی/حذفِ بین‌شرکتی، Header و Route، Escalation به سیستم، Job، مسیرِ غیر HTTP |
| یکپارچه (HTTP) | `test/authorization-api.e2e-spec.ts` | منبعِ شرکتِ دیگر، تلاشِ Escalation از Endpointِ Tenant |
| یکپارچه (Application) | `test/membership-api.e2e-spec.ts` | خواندنِ Membership از طریق شرکتِ دیگر |
| یکپارچه (Persistence) | `test/{tenant,membership,role}-persistence.e2e-spec.ts` | Read/Add/Update/List بین دو شرکت، فیلترِ Assignment، ردِ ساختِ شرکت از Scopeِ Tenant |

```bash
pnpm --filter @accounting-saas/backend test
MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test   # شاملِ Persistence
```

## ۱۵. معیار پذیرش

- عملیاتِ Tenant-Scoped بدونِ Contextِ معتبر رد می‌شود و پیش از هر تغییرِ تجاری.
- هویتِ Tenant هرگز تنها از مقدارِ Client گرفته نمی‌شود؛ Scope از Membershipِ اثبات‌شده
  می‌آید.
- خواندن، نوشتن، به‌روزرسانی و تغییرِ وضعیتِ بین‌شرکتی رد می‌شود و رکوردِ شرکتِ دیگر
  دست‌نخورده می‌ماند.
- Adapterهایِ Tenant-owned مالکیت را در `WHERE` و پیش از نوشتن اعمال می‌کنند؛ هیچ مسیرِ
  خواندنِ سراسری باقی نمی‌ماند.
- عملیاتِ سطحِ سیستم صریحاً اعلام می‌شوند و از Endpointِ Tenant-Scoped قابل‌دسترس نیستند.
- Jobهای Tenant-Scoped مالکیت را حمل و اعتبارسنجی می‌کنند و Payload هرگز مالکیت را تعیین
  نمی‌کند.
- خطاها هیچ اطلاعاتِ حساسِ بین‌شرکتی افشا نمی‌کنند.
- تست‌های خودکار (واحد + HTTP e2e + خصمانه) و `pnpm verify` سبز است.
