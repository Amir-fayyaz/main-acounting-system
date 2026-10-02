# 18 — Repository و Persistence Ports

- وضعیت: پذیرفته‌شده
- نسخه: v1
- مرجع اجرا: `apps/backend/src/shared/persistence/` (SHR-004)

## 1. هدف

این سند قرارداد دسترسی به داده را ثبت می‌کند تا Domain و Application بدون اتکا به MySQL،
Drizzle، ORM یا هر پیاده‌سازی دیگری به داده‌ی متعلق به خودشان دسترسی داشته باشند و
تعویض Adapter بعدی، رفتار Domain را تغییر ندهد. مبنا ADR-002 (ساختار و Dependency)،
ADR-003 (مالکیت داده و مرز Persistence)، ADR-004 (مرز Transaction و Concurrency)،
ADR-009 (Read Model) و قواعد Engineering 01/03/07/12 است.

**خارج از محدوده:** پیاده‌سازی MySQL/Drizzle، Schema و Migration، Repositoryهای تجاری،
پیاده‌سازی Concrete، دسترسی Cross-Module به دیتابیس، Read Model گزارش‌گیری،
پیاده‌سازی Transaction و Outbox، رفتار Persistence در سطح API.

## 2. مالکیت

هر داده دقیقاً یک Owner Module دارد؛ Repository هم همین‌طور:

```text
Module (مالک داده)
  └── domain/            رابطهٔ Repository (Port)
  └── infrastructure/persistence/   پیاده‌سازی آن رابطه
```

- رابطه در `domain/` همان ماژول تعریف می‌شود؛ پیاده‌سازی در `infrastructure/persistence/`
  همان ماژول (ADR-002، بخش ۸).
- ماژول دیگر حق استفاده از آن رابطه، Adapter آن، ORM Model آن یا جدول آن را ندارد —
  نه برای Read و نه برای Write (ADR-003، بخش ۴).
- دسترسی Cross-Module از مسیر Contract مجاز (Command / Query / Service / Domain Event /
  Projection) انجام می‌شود.

## 3. مرز Aggregate و ممنوعیت Repository عمومی

- هر Repository برای یک Aggregate/Entityِ تحت مالکیت همان ماژول است، نه دروازه‌ی جدول‌ها.
- **`GenericRepository<T>` ممنوع است** و در Kernel هم وجود ندارد: نه Criteria Builder،
  نه Expression Tree، نه Query دلخواه، نه SQL. قرارداد از capabilityهای کوچکِ بخش ۴
  + متدهایی با Criteria بستهٔ خود ماژول ساخته می‌شود.
- اگر Read پیش‌بینی‌نشده لازم شد، باید Typeِ Criteria جدید + متد Portِ جدید با Review
  اضافه شود — یعنی Port با تصمیم رشد می‌کند، نه با کنجکاوی.

## 4. قرارداد Repository — Capabilityها

منبع: `shared/persistence/repository-ports.ts`

| Capability | متد | معنی |
| --- | --- | --- |
| `LoadsById<TId, T>` | `get(id)` | خواندن Aggregate + `revision` آن؛ نبودِ رکورد = `undefined` |
| `ChecksExistence<TId>` | `exists(id)` | بررسی وجود، بدون بارگذاری Aggregate |
| `AddsAggregate<T>` | `add(aggregate)` | ایجاد رکورد جدید از `Revision.initial()` |
| `UpdatesAggregate<T>` | `update(aggregate, expectedRevision)` | نوشتن فقط اگر رکورد هنوز همان `expectedRevision` باشد |
| `FindsByCriteria<C, T>` | `find(criteria)` | جست‌وجو با Criterionِ بستهٔ متعلق به ماژول |
| `ReadPort<C, R>` (بخش ۶) | `read(criteria)` | خواندنِ Read Model، سمت Read |

```ts
export interface AccountingDocumentsRepository
  extends LoadsById<EntityId, AccountingDocument>,
    AddsAggregate<AccountingDocument>,
    UpdatesAggregate<AccountingDocument> {
  findByNumber(criteria: DocumentNumberQuery): Promise<readonly Loaded<AccountingDocument>[]>;
}
```

سه امتناع عمدی:

- **نبودِ رکورد خطا نیست:** `get` برمی‌گرداند `undefined`؛ اینکه نبودِ رکورد
  `NotFoundError` باشد یا مجوز ایجاد، تصمیم Use Case است (سند ۱۶ — شکستِ منتظر
  را Domain تصمیم می‌گیرد، نه Storage).
- **Upsert ممنوع است:** ایجاد با `add` و تغییر با `update`؛ ترکیبِ آن‌ها مجبور است
  بی‌صدا تصمیم بدهد که درج است یا بازنویسی — همان ابهامی که سند مالی تحمل نمی‌کند.
- **همه‌چیز Async و Framework-free:** پیاده‌سازی با MySQL/Drizzle، Map در تست، یا هر
  چیز دیگری، بدون تغییر یک خط Domain ممکن است.

## 5. Revision — همزمانی و تاریخچه

منبع: `shared/persistence/revision.ts` (ADR-004، بخش ۲۷)

```text
load  →  aggregate + revision (مثلاً 10)
change →  Domain تصمیم می‌گیرد
update →  با expectedRevision = 10
             ├── رکورد هنوز 10 است → موفق، revision به 11 می‌رود
             └── کس دیگری نوشته   → PersistenceError(CONFLICT) بدون اثر
```

- پارامتر `expectedRevision` **اجباری** است؛ مسیری برای Last-Write-Wins در قرارداد
  وجود ندارد.
- Kernel نوع `Revision` را دارد (عدد صحیح `1..2147483647`)؛ اینکه revision کجا نگه
  داشته شود (کنار Aggregate، در Read Model یا در Use Case) تصمیم ماژول است — Domain
  مجبور نیست فیلد revision داشته باشد.
- همین توکن، تاریخچه را حفظ می‌کند (ADR-003، بخش‌های ۷–۹): اصلاحِ سند به‌صورتِ نوشتنِ
  جدید انجام می‌شود، نه بازنویسی بی‌صدا؛ و تغییر Master Data به سندِ ثبت‌شدهٔ قبلی
  برنمی‌گردد.

## 6. Read / Query Port

منبع: `shared/persistence/read-port.ts`

- سمت Command و سمت Read می‌توانند Port متفاوت داشته باشند؛ Read Port مستقل تعریف
  می‌شود (کنار Queryِ مربوطه در `application/` یا در `reporting/` برای Projection).
- **فقط‌خواندنی:** سطحِ قرارداد یک متد `read` است — بدون save/update/delete/transaction؛
  تا Query نتواند از مسیرِ جایگزین از Domain عبور کند.
- **خروجی دادهٔ ساده است:** Read Model سریالی‌شونده، نه Aggregate و نه Entity؛ چون
  شیءِ زنده برنمی‌گردد، نمی‌توان با آن Invariant را دور زد (ADR-003، بخش ۱۶).
- **Criteria بسته و دارای Scope:** Typeِ متعلق به ماژول؛ Company/Tenant Scope را
  Application از Principal احرازشده پر می‌کند، هرگز از Client (ADR-003، بخش ۲۴).

## 7. خطای Persistence

منبع: `shared/persistence/persistence-error.ts`

```text
Domain/Application خواست  →  Adapter خطای Driver را ترجمه می‌کند  →  مرز تصمیم می‌گیرد
```

Adapter — و فقط Adapter — آنچه Driver گزارش کرده را به یکی از پنج `kind` تبدیل می‌کند:

| kind | retryable | outcomeKnown | معنی |
| --- | --- | --- | --- |
| `UNAVAILABLE` | بله | بله | دسترسی ممکن نبود؛ چیزی انجام نشد |
| `CONFLICT` | نه | بله | نوشتنِ دیگری برنده شد (revision کهنه یا تکراری) |
| `REJECTED` | نه | بله | ذخیره رد شد؛ چیزی اعمال نشد |
| `TIMEOUT` | نه | **خیر** | دیتابیس بی‌صدا ماند؛ نوشتن شاید اعمال شده باشد |
| `UNKNOWN` | نه | **خیر** | طبقه‌بندی‌نشده، مثل Outcome نامعلوم |

- `TIMEOUT` هرگز Blind Retry نمی‌شود: Outcome نامعلوم است و تکرار می‌تواند Effect
  تجاری تکرار کند (ADR-004، بخش‌های ۱۳ و ۳۱) — اول با Idempotency Key / Execution
  Record بررسی می‌شود.
- **ساختِ آن فقط در Adapter است** و هرگز داخل `Result` برنمی‌گردد؛ شکستِ منتظر
  `DomainError` است (سند ۱۶)، این شکستِ فنی است که مرز آن را catch می‌کند.
- **جزئیات Driver سوار نمی‌شود:** `operation` نامِ موقعیت (`AccountingDocuments.update`)
  است، نه SQL؛ متن Driver در `cause` می‌ماند و `toJSON()` آن را کنار می‌گذارد.
- `toDomainError()` فقط `CONFLICT` را به `ConflictError` مشترک ترجمه می‌کند (تنها موردی
  که Client می‌تواند به آن واکنش بدهد: بارگذاری دوباره)؛ بقیه فنی می‌مانند تا مرز
  Retry کند، برای Review نگه دارد یا `INTERNAL_ERROR` بسازد.

## 8. حذف و دادهٔ تاریخی

- **هیچ متد `delete` در قرارداد وجود ندارد** و `persistence-conventions.spec.ts` این
  را روی کدِ منتشرشده اجرا می‌کند.
- دادهٔ دارای سابقهٔ عملیاتی حذف فیزیکی نمی‌شود (ADR-003، بخش‌های ۱۰–۱۱؛ قاعدهٔ
  Engineering 4). اصلاح فقط از مسیر Domain است: `Correction`، `Reversal`،
  `Compensating Transaction` یا وضعیت‌های `Inactive` / `Archived`.
- حذفِ فیزیکی فقط برای دادهٔ موقت و غیرحیاتی، با تعریفِ صریحِ همان ماژول، مجاز است —
  نه به‌عنوان قابلیتِ عمومیِ Port.

## 9. مرز Infrastructure

- پیاده‌سازی در `infrastructure/persistence/` همان ماژول؛ هر ماژول مرز Persistence
  مستقلِ خودش را دارد — `AccountingDbContext`، `SalesDbContext`، ... و هیچ Contextِ
  سراسری به‌عنوان لایهٔ دسترسی آزاد بین ماژول‌ها وجود ندارد (ADR-003، بخش‌های ۱۴–۱۵).
- **Domain Entity و Persistence Model جداست** و فقط با Mapping به هم می‌رسند؛ تغییر
  Schema نباید Rule تجاری را تغییر کند (ADR-003، بخش ۱۶).
- خطاهای Driver فقط در همین لایه به `PersistenceError` ترجمه می‌شوند؛ Domain هرگز
  نامِ Driver یا Constraint را نمی‌بیند.
- Transaction، Outbox و مکانیزم‌های تحویل، طبق ADR-004 در همین لایه و در Scopeِ جدا
  پیاده‌سازی می‌شوند — خارج از این قرارداد.

## 10. جداسازی ماژول‌ها — الگوهای ممنوع

```text
❌  Module A ← Repository/Adapter/ORM Model داخلی Module B
❌  Module A ← جدول‌های Module B
❌  Domain ← Drizzle / mysql2 / SQL / Pool / GlobalDbContext
❌  یک Global Repository سراسری برای کل سیستم
❌  Read Port که Aggregate یا Entity برمی‌گرداند
```

این‌ها فقط با Review کنترل نمی‌شوند؛ دو گارد ساختاری در تست هستند:

- `src/shared/persistence/persistence-conventions.spec.ts` — واژگان مجاز عملیات،
  نبودِ `delete`/`query`/`GenericRepository`، نبودِ توکنِ پیاده‌سازی و Async بودن هر متد.
- `src/modules/module-boundaries.spec.ts` — پاکیِ Domain و نبودِ دسترسی Cross-Module
  به `infrastructure/` / `persistence/` / `repositor(y|ies)`.

## 11. استفادهٔ نمایندگی

```ts
// application/use-cases/rename-sample.ts
const loaded = await repository.get(id);
if (loaded === undefined) {
  return Result.fail(new NotFoundError('No such sample.'));
}

try {
  await repository.update({ ...loaded.aggregate, name }, loaded.revision);
} catch (error) {
  if (error instanceof PersistenceError) {
    const domainError = error.toDomainError();
    if (domainError !== undefined) {
      return Result.fail(domainError); // CONFLICT → قابل واکنش برای Client
    }
    throw error; // UNAVAILABLE / TIMEOUT … فنی می‌ماند
  }
  throw error;
}
```

نمونهٔ کامل و اجرایی در `src/shared/persistence/repository-ports.spec.ts` است.

## 12. معیار پذیرش

- قرارداد Repository و Portهای Persistence تعریف شده و حول Aggregate و نیازِ Domain
  طراحی شده‌اند، نه قابلیت‌های ORM.
- قراردادها از MySQL و Drizzle مستقل‌اند و با یک Adapter آیندهٔ Drizzle بدون تغییر
  Domain قابل پیاده‌سازی‌اند.
- مالکیت Repository با ماژولِ مالک است؛ دسترسی Cross-Module ساختاراً مسدود شده است.
- هیچ Repository عمومی و بدون محدودیتی معرفی نشده است.
- Read/Query Port مستقل قابل تعریف است و به Domain اجازهٔ عبور نمی‌دهد.
- خطاهای خاصِ زیرساخت به Domain نشت نمی‌کنند و مرز ترجمه‌شان مشخص است.
- نیازهای دادهٔ تاریخی در قرارداد بازتاب دارند (Revision + نبودِ بازنویسی بی‌صدا).
- هیچ عملیات Hard-Delete عمومی برای دادهٔ حاملِ سابقه ارائه نمی‌شود.
- `pnpm verify` (typecheck، lint، format، test، build) سبز است.
