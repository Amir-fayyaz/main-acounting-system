# 21 — Tenant Context

- وضعیت: پذیرفته‌شده
- نسخه: v1
- مرجع اجرا: `apps/backend/src/shared/tenant/` (SHR-007)
- مبنای تصمیم: ADR-001 (بخش ۱۳)، ADR-002 (بخش‌های ۱۰–۱۱)، ADR-003 (بخش ۲۴)،
  ADR-008 (بخش‌های ۱۲ و ۱۴)، ADR-010 (بخش‌های ۴ و ۱۳)، قواعد Engineering 01/06/12

## 1. هدف

این سند **Tenant Context** را ثبت می‌کند: یک Abstraction مستقل از Framework که مرزِ
Companyِ جاریِ یک عملیات را معرفی می‌کند، از نقطهٔ موردِ اعتماد به زیرِ آن منتشر می‌شود
(HTTP، Command، Query، Job، رویداد) و در نبودش با Fail-Closed رد می‌شود — بی‌آنکه
هیچ لایه‌ای به HTTP، NestJS، Redis یا دیتابیس وابسته شود و بی‌آنکه یک Client بتواند
با دادنِ شناسه، Tenant خودش را انتخاب کند (ADR-001، بخش ۱۳؛ سند ۱۷، بخش ۸).

**خارج از محدوده:** مدیریت Company، کاربر، Membership، Authentication، Authorization،
نقش و دسترسی، ساختِ دیتابیسِ Tenant، پیکربندی تجاریِ Tenant، Entityهای دامنه،
UI انتخاب Tenant، Middleware احراز هویتِ HTTP، پیاده‌سازی JWT، Session — همگی
 Issuesهای بعدی‌اند؛ این سند فقط مرز و مکانیزم انتشار را می‌بندد تا آن‌ها بیایند، Context
را از همین حالا Establish و Validate کنند، بی‌آنکه Abstraction بازطراحی شود.

## 2. مالکیت — مسیرِ Context

```text
Client (بدونِ اعتماد)          هیچ‌وقت tenantId نمی‌دهد — Header/Body/Query خوانده نمی‌شود
    │
Trusted entry (آینده: Auth)     TenantScope.run(context, work)  ← تنها نقطهٔ Establish
Worker (امروز)                  TenantScope.run از envelope.companyId
    │
Application (Use Case)          TenantScope.require() / tenantScopedMessageOptions()
    │                           ← tenant به پیام‌ها و Criteria از همین‌جا می‌رود
Infrastructure (Adapter)        Dispatcher استcope را حولِ اجرای Job بازسازی می‌کند
    │
Domain                          همیشه وریفای صریح — Context را Ambient نمی‌خواند
```

- **Application مالک «چه کسی» است:** Context را از Principal احرازنشده (Issues بعدی)
  یا از JobEnvelope می‌سازد و `run` می‌کند؛ تصمیمِ «این عملیات برای کدام Company است»
  هرگز در Shared Kernel گرفته نمی‌شود (ADR-010).
- **Shared Kernel مالک «فرم» است:** فقط شناسه، State و انتشار — نه قاعدهٔ تجاری، نه
  Membership، نه Permission (ADR-002، بخش ۱۱؛ سند ۱۵).
- **Domain صریح می‌گیرد:** `module-boundaries.spec.ts` واردشدنِ `shared/tenant/` را در
  `domain/` رد می‌کند — دامنه بدونِ هیچ Stateِ محیطی‌ای قابلِ تست می‌ماند (ADR-002، بخش ۵).

## 3. قرارداد — یک Abstraction، سه State

منبع: `src/shared/tenant/`

| قرارداد | نقش | مصرف‌کننده |
| --- | --- | --- |
| `TenantContext` (`available \| system \| missing`) | مدلِ Context: شناسه + `correlationId` + State | همهٔ لایه‌ها |
| `createTenantContext(tenantId, {correlationId?})` | ساختِ `available` با اعتبارسنجی — خطا `InvalidPrimitiveError` | نقاطِ موردِ اعتماد |
| `TenantScope.current()` | خواندنِ Ambient: همیشه یکی از سه State | Application / Adapter |
| `TenantScope.require()` | فقط `available` — وگرنه `TenantContextMissingError` | عملیاتِ Tenant-Scoped |
| `TenantScope.run(ctx, work)` / `runAsSystem(work)` | Establish دورِ کار؛ Nested بازیابی می‌شود | Trusted entry / Worker / تست |
| `tenantScopedMessageOptions(overrides?)` | انتخابِ Scope به `MessageOptions` پیامِ در حالِ ساخت | سازندهٔ Command/Query/Event |
| `TenantContextMissingError` (`TENANT_CONTEXT_MISSING` + `state`) | ردِ Fail-Closed؛ خطای پیش‌شرط، نه Resultِ تجاری | مصرف‌کنندهٔ `require` |

## 4. مدل — سه State، یک ردِ قطعی

| State | معنا | رفتار |
| --- | --- | --- |
| `available` | عملیات زیرِ یک Company است (`tenantId` + `correlationId` اختیاری) | `require()` موفق، پیام‌ها مُهر می‌خورند |
| `system` | صریحاً بدونِ Tenant: کارِ سطحِ سیستم (Jobهای زیرساختی) | اجرا آزاد؛ `require()` و پیامِ Tenant-Scoped رد |
| `missing` | هیچ Scopeی Establish نشده — نه خطا، نه اجازهٔ اجرا | عملیاتِ Tenant-Scoped با `TenantContextMissingError` رد (Fail-Closed) |

شناسه با همان قاعدهٔ `MessageMetadata` اعتبارسنجی می‌شود (Opaque، حداکثر ۱۲۸ نویسه)؛
شناسهٔ خالی، فاقد‌فضا یا Non-String خطای برنامه‌نویسی است و همان‌جا — نه سه لایه
پایین‌تر — می‌شکست. Context منجمد (Frozen) است: مرزِ یک اجرا در میانهٔ کار بازنویسی
نمی‌شود.

## 5. انتشار — همان مِکانیزمِ تراکنش

```ts
// application/commands/post-invoice.ts
await TenantScope.run(principalContext, async () => {
  return this.transactions.execute(async () => {
    const invoice = await this.invoices.add(command);          // Scope Ambient در دسترس
    await this.outbox.record(
      new InvoicePosted(data, tenantScopedMessageOptions(causedBy(command))),
    );
    return Result.ok(invoice);
  });
});
```

- **`node:async_hooks`، بدونِ Framework:** Scope از `await` به `await` منتشر می‌شود —
  نه Middleware، نه Redis Key، نه Containerِ Request-Scoped (همان قاعدهٔ
  `TransactionContext` — سند ۱۹).
- **Nested بازیابی می‌شود:** Scopeِ داخلی فقط داخلِ `run` خودش دیده می‌شود؛ پس از
  برگشتن، Scopeِ والد دقیقاً همان است که بود — عملیاتِ تو در تو نه به بیرون نشت
  می‌کند و نه والد را بازنویسی می‌کند.
- **دامنهٔ Scope = کارِ پیچیده‌شده:** Workِ Fire-and-Forget که داخلِ Scope شروع شود،
  بیرونِ آن اجرا می‌شود و Scopeِ خودش را باید Establish کند.

## 6. پیام‌ها — اتصالِ Context به Command / Query / Event

- **اجباری نیست، انتخابی است که فراموش نمی‌شود:** `metadata.tenantId` از SHR-003
  وجود دارد؛ `tenantScopedMessageOptions()` راهِ موردِ تأییدِ پُرکردنش است — پس هیچ
  متدِ تجاری شناسه را از پارامترِ نامربوط عبور نمی‌دهد.
- **اولویت صریح > Ambient:** اثرِی که از Cause خود `tenantId`/`correlationId` به
  ارث می‌برد (`causedBy`) هرگز به Scopeِ جاریِ Handler اشاره نمی‌شود — دقیقاً همان
  قاعدهٔ سند ۱۷، بخش ۸.
- **نبودِ هر دو = رد:** پیامِ Tenant-Scoped بیرونِ هیچ Scopeی با
  `TenantContextMissingError` رد می‌شود؛ فیلدِ خالی جایگزین نمی‌شود.

## 7. Background Jobs — بازیابی از Envelope

- **`JobEnqueuer`:** `companyId` و `correlationId` از Scopeِ Ambient پیش‌فرض می‌شوند
  (مقدارِ صریح همیشه برنده است) — Use Case شناسه‌ای را که یک‌بار حل کرده دوباره
  از صفر نمی‌دهد.
- **`JobDispatcher`:** پیش از اجرای Definition، `envelope.companyId` را به‌صورتِ
  `TenantScope.run` (و نبودِ آن را `runAsSystem`) بازسازی می‌کند — شناسه از Envelopeِ
  غیرقابلِ تغییر می‌آید، نه از Stateِ بیرونیِ Mutable.
- **`tenantScoped: true`:** Jobهای تجاری Declare می‌کنند که متعلقِ یک Tenant‌اند؛
  بدونِ `companyId` اصلاً اجرا نمی‌شوند و به‌صورتِ Terminal پارک می‌شوند (شکستِ
  Unknown، قابلِ تکرار نیست — هیچ تلاشی بدونِ Context درست نمی‌شود). این همان
  «Job بدونِ Owner Context اجرا نمی‌شود» است (ADR-008، بخش ۱۴).

## 8. مرزِ امنیتی — Client هرگز Tenant را انتخاب نمی‌کند

- **هیچ ورودیِ Client خوانده نمی‌شود:** نه Header (مثلِ `x-tenant-id`)، نه Query، نه
  Body — e2e این را روی Requestِ واقعی اثبات می‌کند: Header می‌رسد، شنیده می‌شود و
  نادیده گرفته می‌شود؛ Scope بی‌صدا `missing` می‌ماند.
- **فقط نقطهٔ موردِ اعتماد Establish می‌کند:** امروز Worker (از Envelope) و تست؛
  فردا Guardِ احراز هویت (از Principal) — همان `TenantScope.run`، بدونِ بازطراحی.
- **Fail-Closed:** ناشناخته یا غایب یعنی «بدونِ اجرا»، نه «بدونِ فیلتر» (ADR-010،
  بخش ۱۳). ردِ اینجا خطای پیش‌شرط است؛ تبدیلِ آن به پاسخِ HTTPِ مناسب بر عهدهٔ
  Issueِ Authentication خواهد بود.

## 9. ایزولاسیون — همزمانی، Nested، رویداد

- **دو Request همزمان:** هر کدام Scopeِ خودش را دارد؛ ALS هیچ Storeای را بینِ
  دو Request به ارث نمی‌گذارد و پس از پایانِ هر Scope، استکِ بیرون `missing` است.
- **دو Job همزمان:** Worker هر Job را در Scopeِ Envelopeِ خودش اجرا می‌کند؛ اجرای
  همزمانِ Jobهای Companyهای متفاوت هیچ Contextی را عوض نمی‌کند.
- **Nested:** Scopeِ داخلی دیده، بازیابی و (در شکست) هم بازیابی می‌شود — پس از خطای
  درونی، Scopeِ والد سالم می‌ماند.
- **رویدادها:** هویتِ Tenant در `metadata.tenantId` می‌نشیند و با `causedBy` به
  اثرها منتقل می‌شود — همان ستونِ `tenant_id` که Outbox از همان Payload بلند می‌کند
  (سند ۲۰، بخش ۴).

## 10. مرزِ ماژول‌ها

- ماژول‌ها Context را **فقط** از همین Abstraction مشترک مصرف می‌کنند؛ پیاده‌سازیِ
  جایگزین، Overrideِ ضمنیِ Scope یا خواندنِ هویت از دادهٔ احراز هویتِ Transport
  ممنوع است.
- `domain/` اصلاً `shared/tenant/` را وارد نمی‌کند — دامنه Scope را به‌عنوانِ ورودیِ
  صریحِ عملیات می‌گیرد؛ گاردِ مکانیکی `module-boundaries.spec.ts` روی کدِ واقعی اجرا
  می‌شود.
- خواندنِ مالکیتِ دادهٔ ماژولِ دیگر مستقیماً همچنان ممنوع است (ADR-003) — Context
  مرزِ عملیات است، نه مجوزِ دسترسی؛ تصمیمِ دسترسیِ شیء، بعدِ احراز هویت است.

## 11. الگوهای ممنوع

```text
❌ خواندنِ tenantId از Body / Query / Header Client — انتخابِ Tenant با ورودیِ غیرقابلِ اعتماد
❌ پیاده‌سازیِ TenantContext یا Scopeِ سفارشی در ماژول — فقط Abstraction مشترک
❌ اجرای عملیاتِ Tenant-Scoped بدونِ Scope یا تحتِ system به‌جایِ ردِ Fail-Closed
❌ واردکردنِ shared/tenant/ از domain/ — دامنه وریفای صریح می‌گیرد (گاردِ مکانیکی)
❌ قراردادنِ دادهٔ تجاری (نام Company، Membership، Permission) داخلِ Context
❌ استفاده از Scopeِ Ambient به‌عنوانِ مجوزِ دسترسی — Authorization Issueِ جدا است
❌ شناسهٔ Company از Stateِ بیرونیِ Mutable در Worker — فقط از Envelope
❌ تکرارِ شناسهٔ Tenant به‌عنوانِ پارامتر در امضای متدهای تجاری، به‌جایِ Scope
```

## 12. تست‌ها

| سطح | فایل | پوشش |
| --- | --- | --- |
| واحد (مدل) | `src/shared/tenant/tenant-context.spec.ts` | ساخت، اعتبارسنجیِ شناسه/Correlation، Freeze، Stateهای missing/system |
| واحد (انتشار) | `src/shared/tenant/tenant-scope.spec.ts` | نبود، ردِ `require`، system، انتشار در Await، ایزولاسیونِ همزمان، Nested و بازیابی پس از شکست |
| واحد (پیام) | `src/shared/tenant/tenant-message-options.spec.ts` | مهر روی Command/Query/Event، ارثِ Cause، اولویتِ صریح، ردِ بدونِ Scope |
| واحد (Job) | `src/infrastructure/jobs/job-{dispatcher,enqueuer}.spec.ts` | بازسازیِ Scope از Envelope، system بدونِ Company، ردِ `tenantScoped` بدونِ Company، پیش‌فرضِ Ambient در صف |
| گارد ساختاری | `src/modules/module-boundaries.spec.ts` | ردِ `shared/tenant/` در `domain/` (+ خودکار روی کدِ واقعی) |
| یکپارچه (HTTP) | `test/tenant-context.e2e-spec.ts` | نادیده‌گرفتنِ Header، Establish داخلِ Request، ایزولاسیونِ دو Request همزمان، نشت‌نکردنِ Scope به Requestِ بعدی |
| گارد وابستگی | `src/shared/framework-independence.spec.ts` | بدونِ هیچ وابستگی به HTTP/NestJS/Redis/DB در `shared/tenant/` |

```bash
pnpm --filter @accounting-saas/backend test
MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test   # کل Suite (شاملِ Outbox/Transaction)
```

## 13. معیار پذیرش

- Abstractionِ مشترکِ Tenant Context وجود دارد و شناسهٔ پایدار + Stateِ در دسترس
  بودن را نگه می‌دارد؛ بدونِ Scope، عملیاتِ Tenant-Scoped رد می‌شود (Fail-Closed) و
  عملیاتِ سطحِ سیستم به‌صورتِ صریحِ `system` آزاد است.
- Context به Command و Query منتشر می‌شود، در رویداد هویتش حفظ می‌شود و Job آن را
  از Envelope بازسازی می‌کند — بدونِ عبوردادنِ شناسه از پارامترهای نامربوط.
- Context روی HTTP (دو Request همزمان)، Job همزمان و عملیاتِ Nested نشت نمی‌کند؛
  پس از Scope، استکِ بیرون دوباره `missing` است.
- هیچ ورودیِ Client به‌عنوانِ هویتِ Tenant خوانده نمی‌شود؛ Authenticationِ آینده با
  همین `TenantScope.run` Context را Establish می‌کند، بی‌آنکه Abstraction بازطراحی
  شود.
- Context هیچ دادهٔ تجاری ندارد و `src/shared/tenant/` هیچ وابستگی به HTTP،
  NestJS، Redis یا دیتابیس ندارد (`framework-independence.spec.ts`).
- `domain/` Contextِ Ambient را نمی‌خواند (گاردِ مکانیکی)؛ Authentication یا
  Authorizationی معرفی نشده است.
- تست‌های خودکار (واحد + HTTP e2e) و `pnpm verify` (typecheck، lint، format، test،
  build) سبز است.
