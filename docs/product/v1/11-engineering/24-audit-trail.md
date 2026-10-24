# 24 — Audit Trail

- وضعیت: پذیرفته‌شده
- نسخه: v1
- مرجع اجرا: `apps/backend/src/modules/audit/` (AUD-001)،
  `apps/backend/src/modules/identity/infrastructure/audit/` (اتصال رخدادهای امنیتی)
- مبنای تصمیم: ADR-003 (بخش‌های ۴، ۱۴، ۱۶، ۲۱ و ۲۴)، ADR-010 (بخش‌های ۶، ۹ و ۱۳)،
  ADR-015 (بخش‌های ۶ و ۱۲)، ADR-002 (بخش‌های ۸ و ۱۲)، سند ۰۶ (Security Engineering)،
  سند ۰۷ (Database & Migrations)، سند ۱۹ (Transaction Boundary)، سند ۲۱ (Tenant Context)

## 1. هدف

این سند **Audit Trail** را ثبت می‌کند: یک قابلیت مرکزی، پایدار و قابل‌پرس‌وجو که برای هر
عملیات حساسِ امنیتی یا مهمِ کسب‌وکاری ثبت می‌کند **چه کسی، در کدام شرکت، چه چیزی، روی چه
منبعی، کِی و با چه نتیجه‌ای** انجام داده است. رکورد Audit دادهٔ حساسِ کسب‌وکار است، نه Log:
Log برای تشخیص فنی است و جای Audit را نمی‌گیرد (ADR-015 بخش ۶).

**خارج از محدوده:** پیاده‌سازی احراز هویت (IAM-005)، سیاست مجوزدهی (IAM-006)، داشبورد
گزارش‌گیری، جست‌وجوی Full-Text روی Logها، Performance Log/Metric/Trace، ذخیرهٔ هر
Credential، Audit خودکارِ هر Query، جایگزینی رخدادهای دامنه و UI تاریخچهٔ کاربر.

## 2. مالکیت — مسیرِ ثبت و مسیرِ خواندن

```text
Business Module                AUDIT_RECORDER (قرارداد منتشرشده)
   │  record(action, outcome, actor?, target?, metadata?, correlation?)
   ▼
Application (Audit)            RecordAuditEntryUseCase
   │                            ├─ Tenant ← فقط از TenantScope محیطی
   │                            ├─ Actor  ← مقدارِ حل‌شده یا «سیستم»
   │                            ├─ زمان   ← اینجا خوانده می‌شود، نه از فراخوان
   │                            └─ context ← پیش از ساخت رکورد Sanitize می‌شود
   ▼
Domain (Audit)                 AuditRecord (تغییرناپذیر، Append-Only)
   ▼
Infrastructure (Audit)         DrizzleAuditRecordRepository → جدول `audit_records`
```

```text
Authorized Consumer            GET /api/v1/tenants/{tenantId}/audit-records
   ▼
Presentation (Guard)           @Authorize({ permission: 'audit.read', tenantParam })
   ▼
Application (Audit)            ListTenantAuditRecordsUseCase
   │                            ├─ ادعای Tenant ↔ TenantScope (عدمِ تطابق → 404)
   │                            └─ اعتبارسنجی Filterها (Result.fail(Validation))
   ▼
Infrastructure (Audit)         DrizzleAuditRecordQuery → یک صفحه + total
```

- **Domain مالک «شکلِ حقیقت» است:** `AuditRecord` فقط با Value Object‌ها ساخته می‌شود و
  هیچ عملیات تغییردهنده‌ای ندارد.
- **Application مالک «تنظیم زمینه» است:** Tenant از Scope، Actor از فراخوانِ حل‌شده،
  زمان از ساعتِ خودِ Use Case و context از Sanitizer.
- **Infrastructure مالک «نگهداری و Read Model» است:** جدول، Indexها، DDL و Adapterها
  درون همان ماژول می‌مانند.

## 3. قراردادها — یک نوشتن، یک خواندن، هیچ چیزِ دیگر

| قرارداد | نقش | مصرف‌کننده | محل |
| --- | --- | --- | --- |
| `AuditRecorder` | ثبتِ یک حقیقت (`record(entry)`) | همهٔ ماژول‌ها (توکن `AUDIT_RECORDER`) | `modules/audit/application/ports/` |
| `AuditEntry` | action، outcome، actor?، target?، metadata?، correlation?، causation? | همان بالا | همان |
| `AuditRecordQuery` | خواندنِ یک صفحه + total با Criteria بسته | `ListTenantAuditRecordsUseCase` (توکن `AUDIT_RECORD_QUERY`، خصوصیِ ماژول) | `modules/audit/application/ports/` |
| `AuditRecordRepository` | فقط `add(record)` (توکن `AUDIT_RECORD_REPOSITORY`، خصوصیِ ماژول) | `RecordAuditEntryUseCase` | `modules/audit/domain/repositories/` |
| `AuditRecordView` | نمای خواندنی: id، tenantId?، actorType، actorUserId?، action، targetType/Id?، outcome، occurredAt، correlationId?، causationId?، metadata | Presentation | `modules/audit/application/views/` |

- **قرارداد نوشتن، Tenant ندارد.** `AuditEntry` هیچ فیلدی برای `tenantId` ندارد؛ چون
  پرسشِ درست «این عملیات در کدام Scope اجرا شد؟» است، نه «فراخوان می‌گوید کدام شرکت است؟»
  (سند ۲۱؛ ADR-010 بخش ۴).
- **قرارداد خواندن، Tenant را الزامی می‌گیرد.** `AuditRecordCriteria.tenantId` اجباری است
  و از Scope پر می‌شود، پس «همهٔ شرکت‌ها» از نظر فیزیکی قابلِ پرسش نیست (ADR-003 بخش ۲۴).
- **ماژول Audit هیچ واژگان کسب‌وکاری نمی‌شناسد:** نام Action برای آن رشتهٔ معنادار است و
  Target ارجاعی تفسیرنشده است (ADR-002 بخش ۱۲).

## 4. مدلِ رکورد

| فیلد | معنا | اجباری |
| --- | --- | --- |
| `id` | هویت پایدارِ rکورد (UUID) — کلید اصلی | ✅ |
| `tenantId` | شرکتِ **حل‌شده**؛ برای حقیقتِ سطحِ سیستم غایب است | — |
| `actor` | `user` با `userId` حل‌شده، یا `system` (هرگز هر دو، هرگز هیچ‌کدام) | ✅ |
| `action` | نام پایدارِ عملیات در واژگان ماژولِ مالک | ✅ |
| `target` | `type` + `id` منبعی که عملیات روی آن انجام شد | — |
| `outcome` | `success` / `failure` / `denied` | ✅ |
| `occurredAt` | لحظهٔ وقوع، UTC با دقت میلی‌ثانیه | ✅ |
| `correlationId` | جریانِ حاوی این حقیقت (پیش‌فرض: Correlationِ Scope) | — |
| `causationId` | علتِ مستقیمِ این حقیقت | — |
| `metadata` | context امنِ Sanitize‌شده (فقط داده) | — |

- **تغییرناپذیری:** نمونه `Object.freeze` می‌شود، هیچ setter و هیچ `update`/`delete`/upsert
  در پورت وجود ندارد؛ رکوردی که پس از واقعه قابلِ بازنویسی باشد، سند امنیتی نیست.
- **کلیت:** مدل هیچ قاعدهٔ کسب‌وکاری ندارد، پس همان رکورد برای Identity، Tenant،
  Accounting، Inventory، Purchase و Agent کار می‌کند.

## 5. Actor و Tenant

- **Actor حل‌شده است، نه ادعاشده:** `actorUserId` مقداری است که Application از مرزِ
  احراز هویت گرفته یا خودش حل کرده؛ هرگز از Body/Query/Header نمی‌آید.
- **نبودِ Actor یعنی «سیستم عمل کرد»:** این خودش یک حقیقت است، نه فیلدِ جاافتاده. پس
  رکورد هیچ‌وقت «بی‌فاعل» نیست.
- **Tenant فقط از `TenantScope` می‌آید:** عملیاتی که بیرون از Scope اجرا شود (ورود،
  تصمیمِ سطحِ سیستم) با `tenantId` **غایب** ثبت می‌شود و در ستون `NULL` می‌نشیند — نه
  رشتهٔ خالی و نه حدس.
- **هرگز افشا/تطبیقِ نادرست:** ادعایِ تأییدنشدهٔ Tenant هرگز Tenantِ رکورد نمی‌شود؛ حداکثر
  به‌عنوان context با کلید صریح (`claimedTenantId`) ثبت می‌شود.

## 6. نام‌گذاری Action

```text
module.verb            user.signed_in
module.entity.verb     accounting.document.posted
```

- حداقل دو بخشِ نقطه‌جداشدهٔ lower-case، هر بخش با حرف شروع می‌شود، `_` مجاز است،
  حداکثر ۱۲۸ کاراکتر؛ نام تک‌بخشی رد می‌شود تا Action مالکش را نام ببرد.
- Audit واژگان را تعریف نمی‌کند و به فهرست محدود نمی‌کند؛ ماژولِ مالک مسئول نام‌ها است.
- نمونه‌ها در MVP: `user.signed_in`، `user.sign_in_failed`، `user.signed_out`،
  `authentication.denied`، `user.credential_changed`، `authorization.denied`،
  `company.created`، `membership.changed`، `purchase.approved`،
  `accounting.document.posted`.

## 7. نتیجهٔ عملیات

| مقدار | معنا |
| --- | --- |
| `success` | عملیات انجام شد |
| `failure` | عملیات تلاش شد و شکست خورد (مثلاً ورود با Credential نادرست) |
| `denied` | عملیات پیش از اجرا رد شد (مجوز/وضعیت) |

## 8. حفاظت از دادهٔ حساس

`metadata` پیش از آنکه رکورد ساخته شود از `sanitizeAuditMetadata` می‌گذرد:

```text
کلید حساس      → مقدار با [redacted] جایگزین می‌شود (کلید می‌ماند، مقدار نه)
مقدار تو در تو → تا عمق ۴ بازگشتی پاک می‌شود، عمیق‌تر → [truncated]
مقدار غیرداده  → حذف می‌شود (تابع، symbol، bigint، نمونهٔ کلاس، Map/Set، NaN/∞)
```

- تطبیقِ کلید روی شکل نرمال‌شده است، پس `password`، `passwordHash`، `access_token`،
  `apiKey` و `api-key` همه شناسایی می‌شوند و فهرست عمداً موسع است.
- نتیجهٔ Sanitize عمیقاً Freeze می‌شود؛ حتی Adapter هم نمی‌تواند پیش از نوشتن آن را تغییر
  دهد.
- در مسیر خواندن هم دادهٔ ذخیره‌شده **دوباره** Sanitize می‌شود، پس رکوردی که با قاعدهٔ قدیمی
  یا توسط چیزی جز این Adapter نوشته شده باشد، Credential را وارد Domain نمی‌کند.
- هیچ فیلدی از رکورد (action، actor، correlation، ...) اصلاً ظرفیت نگه‌داشتن Credential را
  ندارد؛ تنها ظرفِ context همان `metadata` است که پاک‌سازی می‌شود.

## 9. ذخیره‌سازی

- جدول اختصاصی `audit_records` در ماژول Audit؛ هیچ ماژول دیگری اجازهٔ ورود به آن را ندارد
  (`module-boundaries.spec.ts`).
- ستون‌ها: `id`، `tenant_id` (Nullable)، `actor_type` (Enum)، `actor_user_id` (Nullable)،
  `action`، `target_type`/`target_id`، `outcome` (Enum)، `occurred_at` (DATETIME(3))،
  `correlation_id`/`causation_id`، `metadata` (MEDIUMTEXT)، `revision`.
- **بدونِ Foreign Key:** Tenant دادهٔ ماژول دیگری است و FK بین ماژولی ممنوع است
  (ADR-001 بخش ۵).
- **Indexها همان Filterهای قرارداد خواندن‌اند:** tenant+time، actor+time، action+time،
  target+time، outcome+time و correlation — پس خواندن یک اسکنِ کران‌دارِ Index است.
- DDL نسخه‌دار و Idempotent در `audit-record.schema.ts` (`AUDIT_RECORD_DDL` +
  `ensureAuditRecordSchema`) کنار جدولِ Drizzle می‌ماند؛ هیچ `DROP` و هیچ بازنویسیِ داده‌ای
  در آن نیست (سند ۰۷).
- **Append-Only:** تنها عملیات نوشتن `add` است. شناسهٔ تکراری با
  `PersistenceError(CONFLICT)` گزارش می‌شود، چون دو رکورد با یک هویت یعنی یک حقیقت دو بار
  نوشته شده که باید دقیق دیده شود، نه Retry شود.

## 10. معناشناسی Transaction

```text
داخل Boundary فراخوان؟  →  به همان Transaction می‌پیوندد  (تغییر و سندش با هم Commit می‌شوند)
بدونِ Boundary؟          →  یک Transaction کوتاهِ خودش  (ورودِ ناموفق، درخواستِ ردشده)
```

- Adapter هرگز Transaction باز نمی‌کند؛ پیوستن یا باز کردن، تصمیم `RecordAuditEntryUseCase`
  است (سند ۱۹) و هیچ ماژولی رفتار Transaction اختصاصی نمی‌سازد.
- **شکستِ ثبت، شکستِ عملیات است:** رکوردِ نانوشتنی Propagate می‌شود، چون گم‌شدنِ خاموشِ یک
  سند امنیتی بدتر از شکستِ درخواست است (ADR-010 بخش ۱۳ — Fail Closed).

## 11. رخدادهای امنیتی متصل‌شده

Authentication سندِ Audit اختصاصی ندارد: Use Caseهای آن هر حقیقت را به‌شکلِ رخدادِ دامنه
بیان می‌کنند و Adapter `AuditTrailAuthenticationAuditRecorder` آن را به واژگان Audit ترجمه
می‌کند.

| رخداد (Identity) | Action در Audit | Outcome |
| --- | --- | --- |
| `UserAuthenticated` | `user.signed_in` | `success` |
| `SignInFailed` | `user.sign_in_failed` | `failure` |
| `AuthenticationEnded` | `user.signed_out` | `success` |
| `AuthenticationStateRejected` | `authentication.denied` | `denied` |
| `UserCredentialEstablished` | `user.credential_changed` | `success` |
| تصمیمِ ردِ مجوز (IAM-006) | `authorization.denied` | `denied` |

- **نقشهٔ ترجمه در ماژولِ مالکِ حقیقت است**، پس Audit هیچ واژگانِ احراز هویتی یاد نمی‌گیرد
  و نامِ رخداد و نامِ Action قابلِ تطبیق می‌مانند.
- **رخداد ناشناخته خطا می‌دهد، نه اینکه خاموش رد شود:** حقیقتِ امنیتیِ تازه‌ای که کسی
  نقشه‌اش را ننوشته باشد، نباید از سندِ امنیتی ناپدید شود.
- **تصمیمِ مجوز، ماژولِ Audit را وارد منطقِ مجوز نمی‌کند:** رد شدن با همان قرارداد
  منتشرشده ثبت می‌شود و دلیلِ رد به‌صورت کدِ پایدار در context می‌آید.

## 12. خواندنِ کنترل‌شده

| مورد | مقدار |
| --- | --- |
| مسیر | `GET /api/v1/tenants/{tenantId}/audit-records` |
| Capability | `audit.read` — با Membership فعال در همان Tenant |
| فیلترها | `actorUserId`، `action`، `targetType`، `targetId`، `outcome`، `from`، `to` |
| صفحه‌بندی | `page`/`limit` با قرارداد مشترک FND-006 (`{ data, meta }`) |
| ترتیب | `occurred_at DESC, id DESC` — جدیدترین اول، با Tie-Breakerِ قطعی |
| ورودیِ غیرمجاز | `VALIDATION_FAILED` (۴۰۰) با جزئیاتِ فیلدی |
| Tenantِ نامطابق/بدشکل | `NOT_FOUND` (۴۰۴) — بدونِ افشای وجودِ رکورد |
| بدونِ Capability | `AUTHORIZATION_DENIED` (۴۰۳) — و خودِ همین رد ثبت می‌شود |

- **Path فقط ادعا است:** Guard همان Tenant را پیش از اجرای Handler تأیید می‌کند، سپس
  Controller `TenantScope` را روی همان Tenant بسپارد و Use Case دوباره Path را با Scope
  مقایسه می‌کند؛ پس خواندن نمی‌تواند از شرکتِ فراخوان بیرون بزند.
- **فیلترها فقط محدودکننده‌اند:** `tenantId` هیچ‌گاه فیلدِ Query نیست؛ افزودنِ آن به Query
  String مقدارِ ناشناخته است و رد می‌شود، و Headerهای Client (مثل `x-tenant-id`) خوانده
  نمی‌شوند.
- **`total` عددِ فیلترشده است،** نه تعدادِ کلِ جدول و نه طولِ چیزی که در حافظه Slice شده؛
  صفحه و شمارش در SQL انجام می‌شوند.
- **سند فقط خواندنی است:** هیچ Routeی برای ساخت/ویرایش/حذفِ رکورد وجود ندارد؛ اثری که
  Client بتواند بنویسد یا پاک کند، سند نیست.

## 13. مرزِ ماژول‌ها

- `AuditModule` به‌صورت `@Global` **فقط** `AUDIT_RECORDER` را منتشر می‌کند؛ Repository،
  Adapter، جدول، Aggregate و Read Port بیرون نمی‌آیند.
- ماژولِ مصرف‌کننده فقط `AuditRecorder` را Inject می‌کند و یک `AuditEntry` می‌سازد؛ هیچ
  دسترسی مستقیمی به Persistenceِ Audit ندارد (`module-boundaries.spec.ts`).
- نامِ Action، Target و context در اختیار ماژولِ مالک است؛ بنابراین افزودنِ ماژولِ
  کسب‌وکاریِ جدید هیچ تغییری در Audit لازم ندارد.

## 14. الگوهای ممنوع

```text
❌ ثبتِ Tenant یا Actor از Body/Query/Header یا هر مقدار ادعاییِ Client
❌ نوشتنِ مستقیم در جدول/Repository ماژول Audit از ماژولی دیگر
❌ ذخیرهٔ Password، Token، Hash، Key، Salt یا هر Credential در metadata
❌ تعریفِ واژگانِ کسب‌وکاری یا فهرستِ ثابتِ Actionها داخل ماژول Audit
❌ بازنویسی/حذفِ رکورد، یا افزودنِ update/delete/upsert به پورتِ نوشتن
❌ باز کردنِ Transaction اختصاصی در ماژولِ مصرف‌کننده به‌جای پیوستن به Boundary
❌ بلعیدنِ خطای ثبت (رکوردِ گم‌شده) یا نادیده‌گرفتنِ رخدادِ ناشناخته
❌ خواندنِ سند بدونِ `audit.read`، یا خواندنِ آن از Tenantِ دیگر
❌ بارگذاریِ کلِ تاریخچه و Slice کردنِ آن در حافظه به‌جای صفحه‌بندی در Store
```

## 15. تست‌ها

| سطح | فایل | پوشش |
| --- | --- | --- |
| واحد (Domain) | `src/modules/audit/domain/aggregates/audit-record.spec.ts` | ساخت رکورد، Actorِ کاربر/سیستم، Tenantِ غایب، تغییرناپذیری |
| واحد (Domain) | `src/modules/audit/domain/value-objects/audit-action.spec.ts` | شکلِ نام، نرمال‌سازی، ردِ نامِ بدشکل |
| واحد (Domain) | `src/modules/audit/domain/value-objects/audit-metadata.spec.ts` | Redactionِ کلیدهای حساس، عمق، مقادیرِ غیرداده، Freeze |
| واحد (Application) | `src/modules/audit/application/use-cases/record-audit-entry.use-case.spec.ts` | Tenant از Scope، Actorِ سیستم، زمان، Correlation، پیوستن به Transaction، Propagate شدنِ خطا |
| واحد (Application) | `src/modules/audit/application/use-cases/list-tenant-audit-records.use-case.spec.ts` | Scope، عدمِ تطابق، فیلترهای نامعتبر، پنجرهٔ معکوس، صفحه‌بندی |
| واحد (Identity) | `src/modules/identity/infrastructure/audit/audit-trail-authentication-audit-recorder.spec.ts` | ترجمهٔ هر رخداد، بدونِ راز، خطای رخدادِ ناشناخته |
| یکپارچه (HTTP) | `test/audit-api.e2e-spec.ts` | ۴۰۱/۴۰۳، ثبتِ ردِ مجوز، ایزولاسیونِ Tenant، نادیده‌گرفتنِ Header، فیلترها، صفحه‌بندی، `null`ها، Redaction، فقط‌خواندنی بودن |
| یکپارچه (MySQL، اختیاری) | `test/audit-persistence.e2e-spec.ts` | DDL، Round-Trip، `NULL` برای Tenantِ غایب، ایزولاسیون در SQL، فیلتر/`total`، Conflictِ هویت، Transaction، Sanitize در ستون |
| Identity | `test/{authentication-persistence,authorization-api}.e2e-spec.ts` | ثبتِ رخدادهای امنیتی از مسیر واقعی |

```bash
pnpm --filter @accounting-saas/backend test
pnpm infra:up
MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
pnpm verify
```

## 16. معیار پذیرش

- رکوردهای Audit در مدلِ اختصاصی و پایدار ذخیره می‌شوند و تنها از طریق جدول مصرف می‌شوند.
- Actorِ کاربر (وقتی وجود دارد)، Tenant (وقتی وجود دارد)، Action، Target، Outcome، زمان و
  اطلاعاتِ Correlation در رکورد قابلِ بیان‌اند.
- عملیاتِ سیستم‌ساخته بدونِ User ID قابلِ نمایش‌اند و «نبودِ Actor» به‌معنای «سیستم» است.
- هیچ ترتیبِ کدی اجازه نمی‌دهد Actor یا Tenantِ ادعاییِ Client هویتِ سند شود.
- هیچ Credential یا راز در دادهٔ ذخیره‌شدهٔ Audit ظاهر نمی‌شود (هم در ساخت، هم در خواندن).
- رکوردهای Tenant-Scoped ایزوله‌اند و سندِ یک شرکت از شرکتِ دیگر خوانده نمی‌شود.
- رخدادهای امنیتیِ ورود/خروج/شکستِ ورود/ردِ مجوز/تغییرِ Credential ثبت می‌شوند.
- ماژول‌های دیگر فقط از قرارداد `AUDIT_RECORDER` استفاده می‌کنند و به Persistenceِ Audit
  دسترسی ندارند.
- خواندنِ سند با `audit.read` محافظت می‌شود، فیلتر و صفحه‌بندیِ استاندارد دارد و دسترسیِ
  غیرمجاز رد می‌شود.
- رفتار Audit با تست‌های خودکار (واحد + HTTP + MySQLِ اختیاری) پوشش داده شده و
  Typecheck/Lint/Format/Build سبز است.
