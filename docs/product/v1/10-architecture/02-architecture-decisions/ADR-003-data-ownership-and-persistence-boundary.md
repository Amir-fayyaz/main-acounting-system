# ADR-003 — مالکیت داده و مرز Persistence

- شناسه: ADR-003
- وضعیت: پذیرفته‌شده
- نسخه: v1
- تاریخ: 2026-09-27
- حوزه: Data Ownership / Persistence Boundary

---

## 1. تصمیم

هر Business Data دقیقاً یک **Owner Module** دارد.

هر Module:

- مالک داده‌های Domain خود است.
- مسئول تغییر وضعیت داده خود است.
- فقط از طریق Contractهای منتشرشده با سایر Moduleها تعامل می‌کند.
- جزئیات Persistence خود را به Moduleهای دیگر expose نمی‌کند.

### قانون طلایی

> **A Module owns its data, controls its mutations, and exposes only contracts—not persistence internals—to other Modules.**

یعنی:

> هر Module مالک داده خودش است، تغییرات آن را خودش کنترل می‌کند و به سایر Moduleها فقط Contract ارائه می‌دهد، نه جزئیات Persistence.

---

## 2. مالکیت داده

نمونه مالکیت‌ها:

| Module            | داده‌های اصلی تحت مالکیت                                |
| ----------------- | ------------------------------------------------------- |
| Company & Access  | شرکت، عضویت، تنظیمات دسترسی                             |
| Party             | طرف‌حساب و اطلاعات پایه طرف‌حساب                        |
| Accounting        | حساب‌ها، سند حسابداری، خطوط حسابداری، دفتر، دوره مالی   |
| Inventory         | موجودی، انبار، گردش موجودی، وضعیت موجودی                |
| Purchase          | چرخه خرید و اسناد عملیاتی خرید                          |
| Sales             | چرخه فروش و اسناد عملیاتی فروش                          |
| Bank & Treasury   | حساب بانکی، دریافت، پرداخت، تطبیق خزانه                 |
| Expense           | چرخه هزینه و اطلاعات عملیاتی هزینه                      |
| Payroll           | حقوق، دوره حقوق، محاسبات و وضعیت نهایی حقوق             |
| Tax               | صورتحساب و وضعیت مالیاتی، پرونده/ثبت‌های مالیاتی        |
| Fixed Assets      | دارایی ثابت، استهلاک و چرخه عمر دارایی                  |
| Agent & Plans     | مشاهده‌ها، پیشنهادها، Planها، تأیید و Trace اجرای Agent |
| Documents & Files | فایل، Metadata فایل و وضعیت پردازش فایل                 |
| Reporting         | Projection/Read Modelهای گزارش‌گیری                     |
| Notification      | اعلان‌ها و وضعیت آن‌ها                                  |

این فهرست در آینده قابل تکامل است، اما هر داده کسب‌وکاری باید یک Owner مشخص داشته باشد.

---

## 3. Database مشترک، مالکیت جدا

در MVP یک Database برای هر Installation وجود دارد، اما Database مشترک به معنی مالکیت مشترک داده نیست.

هر Module باید محدوده Persistence مستقل خود را داشته باشد.

مثال:

```text
Accounting
  ├── accounting_documents
  ├── accounting_lines
  └── accounting_postings

Sales
  ├── sales_documents
  ├── sales_lines
  └── receivable_links
```

Sales حق ندارد جدول‌های Accounting را تغییر دهد و Accounting نیز حق ندارد داده داخلی Sales را تغییر دهد.

---

## 4. دسترسی به داده Module دیگر

دسترسی مستقیم به Persistence Module دیگر ممنوع است؛ هم برای Read و هم برای Write.

### ممنوع

```text
Sales
  ↓
SELECT ... FROM party_table
```

یا:

```text
Sales
  ↓
PartyRepository
```

### مجاز

```text
Sales
  ↓
Party Query Contract / Port
  ↓
Party
```

برای Write نیز فقط Command / Service Contract مجاز است.

---

## 5. Cross-Module Reference

Moduleها می‌توانند شناسه مرجع Domainهای دیگر را نگهداری کنند، اما Entity آن Domain را داخل خود Duplicate نمی‌کنند.

مثلاً Sales می‌تواند داشته باشد:

```text
CustomerId
ProductId
WarehouseId
```

اما مجاز نیست Model کامل Customer، Product یا Warehouse را مالک شود.

اعتبارسنجی Reference باید از طریق Contract رسمی انجام شود.

---

## 6. Read Model / Projection

برای مصرف زیاد یا نیاز به Queryهای ترکیبی، Read Model / Projection مجاز است.

الگو:

```text
Source Module
      ↓
Domain Event / Contract
      ↓
Read Model / Projection
      ↓
Consumer
```

### اصل مهم

Read Model مالک حقیقت کسب‌وکار نیست.

ممکن است داده آن از Source Domain مشتق شده باشد و در صورت نیاز قابل Rebuild باشد.

---

## 7. Snapshot برای اسناد تاریخی

در عملیات مالی و Business Documentهای حساس به تاریخچه، Snapshot الزامی است.

برای مثال:

```text
CustomerId
CustomerNameSnapshot
ProductId
ProductNameSnapshot
UnitPriceSnapshot
```

### دلیل

اگر Master Data بعداً تغییر کند، سند قبلی نباید تغییر تاریخی کند.

بنابراین:

- Reference به Entity اصلی حفظ می‌شود.
- اطلاعات تاریخی لازم Snapshot می‌شوند.
- Snapshot جای Source of Truth اصلی را نمی‌گیرد.

---

## 8. قانون عمومی Snapshot

هر Business Document که برای Audit، گزارش، اسناد قانونی یا بازسازی رخداد به وضعیت تاریخی نیاز دارد، باید Snapshot لازم را ذخیره کند.

این موضوع مخصوصاً برای:

- خرید
- فروش
- رسید/پرداخت
- مالیات
- حقوق
- دارایی ثابت
- اسناد حسابداری

ضروری است.

---

## 9. Master Data و تغییرات آن

تغییر Master Data نباید تاریخچه اسناد قبلی را تغییر دهد.

مثلاً تغییر نام مشتری نباید نام تاریخی یک صورتحساب ثبت‌شده را تغییر دهد.

Master Data جدید برای عملیات جدید قابل استفاده است و Snapshot برای عملیات تاریخی نگهداری می‌شود.

---

## 10. حذف داده

**Hard Delete برای Business Data وجود ندارد.**

قاعده عمومی:

- داده دارای سابقه عملیاتی حذف فیزیکی نمی‌شود.
- به‌جای Delete از وضعیت‌هایی مانند `Inactive`، `Archived` یا Lifecycleهای مناسب استفاده می‌شود.
- حذف فیزیکی فقط برای داده‌های موقت و غیرحیاتی می‌تواند در چارچوب مشخص مجاز باشد.

---

## 11. داده‌های مالی

برای داده‌های مالی و عملیاتی حساس حذف مستقیم مطلقاً ممنوع است.

نمونه:

```text
Accounting Document
Accounting Line
Payment
Receipt
Inventory Movement
Tax Submission Record
Finalized Payroll Record
```

اصلاح فقط از مسیر Domain مجاز انجام می‌شود، مانند:

```text
Correction
Reversal
Replacement
Compensating Transaction
```

---

## 12. Database Constraints

Invariantهای مهم باید تا حد امکان در دو سطح محافظت شوند:

### Domain / Application

- Business Rule
- State Validation
- Authorization
- Domain Invariant

### Database

- Unique Constraint
- Not Null
- Internal Foreign Key
- Check Constraint در موارد مناسب
- سایر Constraintهای Integrity

Database مالک Business Logic کامل نیست، اما نباید اجازه دهد خطای بنیادی داده‌ای رخ دهد.

---

## 13. Foreign Key

### داخل یک Module

Foreign Key مستقیم مجاز است.

مثلاً:

```text
AccountingDocument
    ↓
AccountingLine
```

### بین Moduleها

Foreign Key مستقیم ممنوع است.

Cross-Module Reference باید از طریق ID/Reference + Contract مدیریت شود.

---

## 14. Data Access Layer

هر Module فقط باید از Persistence خود استفاده کند.

الگوی مجاز:

```text
Module Application
      ↓
Module Repository / Query Handler
      ↓
Module Persistence
```

الگوی ممنوع:

```text
Sales
  ↓
GlobalDbContext
  ↓
هر جدول دلخواه سیستم
```

---

## 15. DbContext / Persistence Boundary

با وجود یک Database مشترک، هر Module باید Persistence Boundary مستقل خود را داشته باشد.

مدل پیشنهادی:

```text
AccountingDbContext
SalesDbContext
InventoryDbContext
PurchaseDbContext
TaxDbContext
...
```

هر DbContext فقط مدل‌های Persistence همان Module را می‌شناسد.

این تصمیم برای حفظ مرز Moduleها و جلوگیری از شکل‌گیری یک Global Data Model ضروری است.

---

## 16. ORM Model و Domain Entity

ORM/Persistence Model و Domain Entity کاملاً جدا هستند.

```text
Domain Entity
     ↕
Mapping
     ↕
Persistence Model
```

ORM نباید ساختار Domain را مجبور به تبعیت از Schema کند.

همچنین تغییر Schema نباید Business Rule را به‌صورت مستقیم تغییر دهد.

---

## 17. Migration

Migrationهای هر Module باید مستقل و قابل مالکیت باشند.

مثال:

```text
Accounting.Migrations
Sales.Migrations
Inventory.Migrations
Purchase.Migrations
...
```

همه به همان Database Installation متصل می‌شوند، ولی Ownership Schema مشخص باقی می‌ماند.

Migrationها باید Versioned باشند و در فرآیند Deployment مدیریت شوند.

---

## 18. Transaction بین Moduleها

هیچ Moduleای حق ندارد برای ایجاد یک Transaction بین Moduleها وارد Persistence Module دیگر شود.

اگر یک Use Case چند Module را درگیر کند، هماهنگی باید از طریق Application/Orchestration رسمی انجام شود.

جزئیات دقیق Transaction Boundary در ADR-004 تعریف خواهد شد.

---

## 19. Event و Read Model

Event می‌تواند باعث ساخت یا به‌روزرسانی Projection در Module دیگر شود.

مثلاً:

```text
Sales
  ↓
SalePosted
  ↓
Reporting Projection
```

Projection فقط Read Model است و Source of Truth محسوب نمی‌شود.

---

## 20. Agent Data Ownership

Agent مالک داده کسب‌وکار نیست.

Agent Module فقط مالک داده‌های مربوط به خود Agent است، مانند:

- Observation
- Context عملیاتی
- Proposal
- Plan
- Confidence
- Approval State
- Execution Trace
- Outcome

Agent نباید Snapshot کامل Entityهای Business را به‌عنوان Source of Truth مستقل نگهداری کند.

اگر Agent برای Trace به بخشی از داده تاریخی نیاز دارد، باید آن را با هدف مشخص و قابل ردیابی نگهداری کند و مالکیت Business Data همچنان نزد Domain اصلی باقی بماند.

---

## 21. Audit Ownership

Audit یک قابلیت Cross-Cutting است و یک Module مرکزی دارد.

```text
Business Module
      ↓
Audit Contract
      ↓
Audit Module
```

Audit Module مالک Audit Recordهای مرکزی است.

Audit باید حداقل بتواند مشخص کند:

- چه کسی
- برای کدام شرکت
- در چه زمانی
- چه عملیاتی
- روی چه Objectی
- از چه وضعیتی
- به چه وضعیتی
- با چه دلیل/Approvalی
- با چه نتیجه‌ای

عملیات Agent نیز باید Traceهای مرتبط خود را در Audit قابل ردیابی کند.

---

## 22. File Ownership

File/Document Module مالک فایل و Metadata فایل است.

Business Module مالک رابطه کسب‌وکاری با فایل است.

مثال:

```text
Purchase
  └── DocumentId
```

و:

```text
Documents & Files
  ├── File
  ├── FileMetadata
  ├── ProcessingStatus
  └── Version / Hash
```

فایل نباید بدون دلیل در Business Moduleها کپی شود.

---

## 23. Backup و Restore

Backup در سطح کل Installation انجام می‌شود، چون Database در سطح Installation مشترک است.

### الزامات

- Backup سازگار با کل سیستم باشد.
- Backup رمزنگاری شود.
- وضعیت Backup قابل مشاهده باشد.
- Restore فرآیند مشخص و قابل تست داشته باشد.
- Restore باید کل سیستم را به یک Snapshot سازگار برگرداند.
- Moduleها مسئول Backup مستقل داده خود نیستند.

---

## 24. Tenant Isolation

Shared Database نباید باعث Shared Data Access شود.

حداقل مسیر کنترل:

```text
Request
  ↓
Authenticated User
  ↓
Company / Tenant Context
  ↓
Application Contract
  ↓
Domain
  ↓
Persistence
```

تمام Queryها و Commandهای Business باید Company Scope معتبر داشته باشند.

هیچ مسیر داخلی نباید Tenant Context را دور بزند.

---

## 25. قوانین ممنوع

موارد زیر ممنوع هستند:

- دسترسی مستقیم به Table Module دیگر
- استفاده مستقیم از Repository Module دیگر
- استفاده مستقیم از DbContext Module دیگر
- Cross-Module Foreign Key
- تغییر داده Module دیگر با ORM داخلی آن
- Duplicate کردن Source of Truth بین Moduleها
- Hard Delete داده مالی
- استفاده از Read Model به‌عنوان Source of Truth
- نگهداری Business Truth مستقل در Agent
- دور زدن Contractهای Moduleها برای راحتی توسعه

---

## 26. پیامدهای مثبت

- مالکیت داده شفاف می‌ماند.
- تغییرات Schema کنترل‌شده‌تر می‌شوند.
- Moduleها کمتر به یکدیگر وابسته می‌شوند.
- استخراج Read Model ساده‌تر است.
- Audit و Traceability قابل اتکاتر می‌شود.
- تاریخچه مالی پایدار می‌ماند.
- Multi-Tenant Isolation قابل کنترل‌تر می‌شود.
- امکان تغییر Infrastructure بدون تغییر Domain بیشتر می‌شود.

---

## 27. هزینه‌ها و Trade-offها

- Mapping بین Domain و Persistence لازم است.
- DbContextهای متعدد نیازمند Discipline هستند.
- Cross-Module Query ساده نیست و باید Contract داشته باشد.
- Read Model ممکن است نیازمند نگهداری Projection باشد.
- توسعه‌دهنده نمی‌تواند برای Shortcut مستقیماً به جدول دیگری دسترسی پیدا کند.
- طراحی Contractها زمان بیشتری می‌برد، ولی این هزینه برای حفظ مرزهای معماری پذیرفته شده است.

---

## 28. ADRهای وابسته

این ADR بر موارد زیر اثر دارد:

- ADR-004 — Transaction Boundary و Consistency Model
- ADR-005 — Command / Query / Domain Event Model
- ADR-007 — Adapter / Provider Architecture
- ADR-008 — Job / Queue Architecture
- ADR-009 — Reporting / Read Model Architecture
- ADR-010 — Security Architecture
- ADR-011 — Deployment / Offline Architecture
- ADR-012 — File Processing Architecture
- ADR-014 — Testing Architecture
- ADR-015 — Observability و Recovery

---

## 29. معیار پذیرش معماری

این ADR زمانی رعایت شده است که:

- هر Business Data یک Owner Module داشته باشد.
- هیچ Moduleای به Persistence داخلی Module دیگر دسترسی نداشته باشد.
- Cross-Module Foreign Key وجود نداشته باشد.
- Foreign Key داخل Module مجاز و کنترل‌شده باشد.
- هر Module Persistence Boundary مستقل داشته باشد.
- ORM Model و Domain Entity جدا باشند.
- Master Data حذف فیزیکی نشود.
- داده مالی حذف فیزیکی نشود.
- Snapshot لازم در اسناد تاریخی ثبت شود.
- Audit مالک مشخص و مرکزی داشته باشد.
- Tenant Isolation در تمام مسیرهای داده اعمال شود.

---

## 30. جمع‌بندی

```text
One Business Data
        ↓
One Owner Module
        ↓
Owned Persistence Boundary
        ↓
Published Contract
        ↓
Cross-Module Access
```

و قانون اصلی:

> **Module owns the data, controls its mutations, and exposes contracts—not persistence internals.**
