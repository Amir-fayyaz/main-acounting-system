# ADR-001 — سبک معماری کل سیستم

- شناسه: ADR-001
- وضعیت: پذیرفته‌شده
- نسخه: v1
- تاریخ: 2026-09-27
- حوزه: Architecture Style

---

## 1. تصمیم

سبک معماری محصول **Modular Monolith** است.

سیستم از نظر استقرار یک محصول یکپارچه و Dockerized است، اما از نظر ساختار داخلی به Moduleهای دارای مرز سخت تقسیم می‌شود.

مرز Moduleها از روز اول اجباری است و هیچ Moduleای حق دسترسی مستقیم به Entity، Repository، Table یا جزئیات داخلی Module دیگر را ندارد.

الگوی کلی:

```text
                        Web / REST API
                              |
                              v
                    +-------------------+
                    | Modular Monolith  |
                    |                   |
                    | Company           |
                    | Accounting        |
                    | Party             |
                    | Inventory         |
                    | Purchase          |
                    | Sales             |
                    | Treasury          |
                    | Expense           |
                    | Payroll           |
                    | Tax               |
                    | Fixed Assets      |
                    | Agent             |
                    | Documents         |
                    | Reporting         |
                    | Notification      |
                    +-------------------+
                       |      |      |
                       |      |      |
                  Commands   Queries  Events
                              |
                         Internal Bus
                              |
                            Redis
```

Worker و Scheduler نیز از همان Codebase و Moduleها استفاده می‌کنند، اما به‌صورت Process/Container جدا از Web/API اجرا می‌شوند.

---

## 2. زمینه تصمیم

محصول:

- یک نرم‌افزار مالی و حسابداری حساس به ثبات داده است.
- چند Domain مهم و مستقل دارد.
- Agentها، Importها، پردازش اسناد و Jobهای طولانی دارد.
- باید روی سرور شرکت سازنده یا مشتری نصب شود.
- MVP در مقیاس اولیه حدود 5 شرکت با میانگین 50 تا 100 کاربر برای هر شرکت هدف‌گذاری شده است.
- در MVP نیاز به معماری توزیع‌شده پیچیده وجود ندارد.
- اولویت اصلی محصول به ترتیب شامل Data Consistency، Security، Reliability، Performance، Scalability، Cost و سپس Development Speed است.

در چنین شرایطی، نیاز اصلی ایجاد مرزهای Domain و کنترل وابستگی‌هاست، نه ایجاد شبکه‌ای از سرویس‌های مستقل.

---

## 3. گزینه‌های بررسی‌شده

### گزینه A — Monolith ساده

تمام قابلیت‌ها در یک ساختار مشترک با وابستگی‌های نسبتاً آزاد قرار می‌گیرند.

**مزایا**

- ساده
- سریع برای شروع

**معایب**

- وابستگی‌ها به‌مرور درهم می‌روند.
- مالکیت داده مبهم می‌شود.
- Ruleهای Domain به لایه‌های دیگر نشت می‌کنند.
- جدا نگه‌داشتن Agent، Reporting و Integration سخت‌تر می‌شود.
- تغییرات یک حوزه ریسک بیشتری برای حوزه‌های دیگر دارد.

**نتیجه:** رد شد.

---

### گزینه B — Modular Monolith

یک Deployable اصلی وجود دارد، اما Domainها Moduleهای مستقل با مرز سخت هستند.

**مزایا**

- سادگی Deployment
- Consistency قوی داخل یک Runtime/Database
- مناسب برای تراکنش‌های مالی
- ساده‌تر برای Debugging و Observability
- امکان توسعه مستقل Moduleها
- کاهش Over-engineering
- مناسب با مدل نصب Dockerized
- مسیر رشد معقول بدون پیچیدگی Microservices

**معایب**

- نیازمند Discipline شدید در Dependency Rules
- Database مشترک همچنان خطر ایجاد Coupling دارد و باید با Rules کنترل شود.
- Scale مستقل هر Module در MVP وجود ندارد.

**نتیجه:** انتخاب شد.

---

### گزینه C — Microservices

هر Domain یا گروهی از Domainها به Service مستقل تبدیل شود.

**مزایا**

- استقلال Deployment
- Scale مستقل
- Isolation عملیاتی بیشتر

**معایب**

- پیچیدگی شبکه و ارتباطات
- پیچیدگی Distributed Transaction
- پیچیدگی Observability
- پیچیدگی Deployment و عملیات
- هزینه بیشتر نگهداری
- دشواری Debugging
- افزایش ریسک Inconsistency
- نامتناسب با نیاز MVP

**نتیجه:** عمداً رد شد و قرار نیست به‌عنوان مسیر پیش‌فرض معماری محصول دنبال شود.

---

## 4. مرزهای اجباری Moduleها

Moduleهای اصلی محصول باید بر اساس Domain Model تعریف شوند، از جمله:

- Company & Access
- Party
- Accounting
- Product & Inventory
- Purchase
- Sales
- Bank & Treasury
- Expense
- Payroll
- Tax & Electronic Invoice
- Fixed Assets
- Agent & Plans
- Documents & Files
- Reporting
- Notification

ممکن است در ADRهای بعدی یک Domain به چند Module فنی تقسیم شود یا چند قابلیت در یک Module سازمان‌دهی شوند، ولی مالکیت Domain باید حفظ شود.

---

## 5. قانون اصلی وابستگی

این قانون اجباری است:

> هیچ Moduleای حق دسترسی مستقیم به Entity، Repository، Table، ORM Model یا Internal Service یک Module دیگر را ندارد.

مثال ممنوع:

```text
Sales
  └── مستقیم Inventory.InternalEntity را تغییر می‌دهد
```

مثال مجاز:

```text
Sales
  └── Inventory Contract
          ├── Command
          ├── Query
          └── Event
```

یا:

```text
Sales
  └── Application Service / Domain Service
```

مطابق قرارداد رسمی Module.

---

## 6. Database

### تصمیم

برای هر Installation یک Database مشترک وجود دارد.

Tenant/Company Isolation در سطح Application و Domain اجباری است.

### مالکیت داده

Database مشترک به معنی مالکیت مشترک داده نیست.

هر Module مالک منطقی داده‌های خود است.

مثال:

```text
Accounting → Accounting data
Inventory  → Inventory data
Sales      → Sales data
Tax        → Tax data
```

### قانون

Module دیگر نمی‌تواند برای خواندن یا تغییر داده داخلی یک Module، مستقیماً به Table آن متصل شود.

دسترسی بین Moduleها باید از Contractهای تعریف‌شده انجام شود.

---

## 7. Foreign Key بین Moduleها

Foreign Key مستقیم به جدول داخلی Module دیگر ممنوع است.

در صورت نیاز به Reference بین دو Module:

- از شناسه مرجع دامنه استفاده می‌شود.
- اعتبار رابطه در Boundary مربوطه بررسی می‌شود.
- Contract رسمی برای دسترسی ایجاد می‌شود.
- Referential Integrity بین Moduleها نباید با Coupling دیتابیسی پنهان ایجاد شود.

هدف این تصمیم حفظ مرز Moduleها و کاهش وابستگی به Schema داخلی یکدیگر است.

---

## 8. ارتباط بین Moduleها

چهار ابزار اصلی مجاز هستند:

### Command

برای درخواست انجام یک عملیات.

```text
Purchase
  → Inventory.ReceiveGoods
```

### Query

برای درخواست اطلاعات.

```text
Sales
  → Party.GetCustomer
```

### Domain Service / Application Service

برای orchestration کنترل‌شده در سطح Contract.

### Domain Event

برای اطلاع‌رسانی اینکه یک اتفاق در Domain رخ داده است.

```text
PurchasePosted
SalePosted
PaymentReceived
InventoryIssued
PayrollFinalized
TaxInvoiceAccepted
PeriodClosed
```

هیچ‌کدام مجوز عبور از مرز و دسترسی به Internal Entityهای Module دیگر را ایجاد نمی‌کنند.

---

## 9. Event Bus

### تصمیم

در MVP یک Event Bus داخلی وجود خواهد داشت.

برای پیاده‌سازی آن از Redis استفاده می‌شود و Kafka یا RabbitMQ در MVP وارد محصول نمی‌شود.

### اصل

Domain Event ابتدا در مرز Domain تولید می‌شود و سپس از طریق Bus داخلی در اختیار Consumerهای مجاز قرار می‌گیرد.

### الزامات

- Eventها Contract مشخص داشته باشند.
- Event Version قابل کنترل باشد.
- Consumerها مستقل از Publisher باشند.
- Processing قابل Trace باشد.
- Failure مصرف Event قابل مشاهده باشد.
- Eventهای مهم مالی قابلیت Retry امن داشته باشند.
- اجرای مجدد Consumer نباید به ایجاد Duplicate Business Effect منجر شود.

برای عملیات حساس، مکانیزم انتشار و پردازش باید با Transaction و Idempotency هماهنگ باشد؛ جزئیات آن در ADRهای Transaction و Event Processing تعیین می‌شود.

---

## 10. Web/API و Worker

Codebase یکپارچه است، اما Runtime Processها تفکیک می‌شوند.

مدل MVP:

```text
Docker Deployment
├── Web / REST API
├── Worker
├── Scheduler
└── Database
```

در صورت نیاز می‌توان یک Container یا Worker Pool را به چند Worker عملیاتی تقسیم کرد بدون اینکه Moduleها به Microservice تبدیل شوند.

### Web/API

مسئول:

- Request/Response
- Authentication
- Authorization
- Command Intake
- Query
- نمایش وضعیت Job

### Worker

مسئول:

- Jobهای سنگین
- File Processing
- Import
- Agent Execution
- گزارش سنگین
- Payroll
- Reconciliation
- Notification
- پردازش Eventهای داخلی در صورت نیاز

### Scheduler

مسئول:

- عملیات زمان‌بندی‌شده
- محاسبات دوره‌ای
- کارهای دوره‌ای نگهداری سیستم

---

## 11. مرز Transaction

این ADR اصل معماری را تعیین می‌کند:

> Transaction Boundary باید حول یک Consistency Boundary واقعی در Domain تعریف شود.

Transaction نباید صرفاً بر اساس ساختار UI یا صفحه تعریف شود.

برای مثال در یک عملیات خرید که شامل اثرات متعدد است، Domain باید مشخص کند کدام تغییرات باید اتمیک باشند و کدام اثرات می‌توانند بعداً از طریق Event/Job ایجاد شوند.

جزئیات دقیق Transaction Pattern در ADR مستقل مشخص می‌شود.

---

## 12. Consistency

با توجه به اولویت اول Data Consistency:

- عملیات مالی حساس نباید به حالتی نامشخص رها شوند.
- عملیات تکراری نباید Duplicate Effect ایجاد کنند.
- State انتقال‌ها باید معتبر باشند.
- Cross-Domain Processها باید وضعیت اجرای خود را ثبت کنند.
- شکست مرحله‌ای باید قابل تشخیص و Recovery باشد.

Eventual Consistency فقط جایی مجاز است که از نظر کسب‌وکار قابل قبول و صریحاً طراحی شده باشد.

---

## 13. Multi-Tenancy

Tenant/Company Context باید در تمام لایه‌های ورودی و عملیات لحاظ شود.

حداقل:

```text
Request
  ↓
Authenticated User
  ↓
Company Membership / Context
  ↓
Application Command / Query
  ↓
Domain
  ↓
Persistence
```

هیچ مسیر داخلی نباید بتواند Company Context را دور بزند.

---

## 14. Agent در Modular Monolith

Agent یک Module/Domain مشخص دارد ولی مالک هیچ Business Entity خارجی نیست.

Agent می‌تواند:

- Context دریافت کند.
- Observation ایجاد کند.
- Proposal بسازد.
- Plan بسازد.
- Approval بگیرد.
- Execution را درخواست کند.
- Outcome را ثبت کند.

Agent نمی‌تواند:

- مستقیماً Entityهای Business را تغییر دهد.
- مستقیماً Tableها را Update کند.
- Ruleهای Domain را دور بزند.

در نتیجه:

```text
Agent
  ↓
Application Contract
  ↓
Domain Validation
  ↓
Approval
  ↓
Execution
```

---

## 15. Reporting در Modular Monolith

Reporting یک Module مصرف‌کننده است، نه مالک حقیقت Domain.

برای گزارش‌های سنگین:

```text
Operational Domain
      ↓
Event / Projection Update
      ↓
Reporting Read Model
      ↓
Report / Dashboard
```

Reporting اجازه ندارد برای تولید گزارش، وضعیت Domainهای دیگر را تغییر دهد.

---

## 16. دلیل اصلی عدم انتخاب Microservices

تصمیم محصول این نیست که «Microservices بد است».

تصمیم این است:

> در این محصول، در این مقطع، هزینه و پیچیدگی Microservices ارزش متناسبی ایجاد نمی‌کند.

دلایل:

- Deployment مستقل برای Moduleها در MVP لازم نیست.
- تعداد کاربران و شرکت‌های هدف فعلی محدود است.
- Consistency مالی اولویت بالاتری از Scale مستقل دارد.
- نصب روی سرور مشتری عملیات ساده‌تر می‌خواهد.
- تیم توسعه باید بتواند سریع و قابل اتکا سیستم را بسازد.
- Distributed Transaction و Network Failure ریسک غیرضروری ایجاد می‌کنند.

بنابراین Microservices به‌عنوان الگوی معماری محصول انتخاب نمی‌شود.

---

## 17. Consequences

### مزایا

- مرزهای Domain روشن می‌مانند.
- Deployment ساده باقی می‌ماند.
- Consistency برای عملیات مالی قابل کنترل‌تر است.
- Debugging ساده‌تر است.
- Agent و Jobها می‌توانند Runtime جدا داشته باشند.
- برای نصب On-Premise مناسب است.
- Over-engineering کاهش می‌یابد.
- توسعه آینده Domainها قابل‌کنترل‌تر می‌شود.

### هزینه‌ها

- Discipline شدید در Module Boundary لازم است.
- Database مشترک نیاز به قواعد قوی دارد.
- باید از Shortcutهای تیمی جلوگیری شود.
- Scale مستقل Moduleها محدود است.
- Event Bus داخلی باید با دقت طراحی شود.
- بعضی قابلیت‌ها برای Scale بالا بعداً نیازمند بازطراحی Runtime خواهند بود.

---

## 18. تصمیم‌های صریحاً ردشده

در MVP:

- Monolith بدون مرز پذیرفته نیست.
- Microservices به‌عنوان سبک معماری پذیرفته نیست.
- دسترسی مستقیم Moduleها به Entityهای یکدیگر ممنوع است.
- Foreign Key مستقیم بین داده داخلی Moduleها ممنوع است.
- Kafka در MVP استفاده نمی‌شود.
- RabbitMQ در MVP استفاده نمی‌شود.
- یک Process اجباری برای Web و Worker نداریم.
- Agent اجازه دستکاری مستقیم Domain را ندارد.

---

## 19. ADRهای وابسته

تصمیم‌های بعدی که بر این ADR تکیه می‌کنند:

- ADR-002 — Module Structure و Dependency Rules
- ADR-003 — Data Ownership و Persistence Boundary
- ADR-004 — Transaction Boundary و Consistency Model
- ADR-005 — Command / Query / Domain Event Model
- ADR-006 — Agent Architecture
- ADR-007 — Adapter / Provider Architecture
- ADR-008 — Job / Queue Architecture
- ADR-009 — Reporting / Read Model Architecture
- ADR-010 — Security Architecture
- ADR-011 — Deployment / Offline Architecture
- ADR-012 — File Processing Architecture
- ADR-013 — API Architecture
- ADR-014 — Testing Architecture
- ADR-015 — Observability و Recovery

---

## 20. معیار تأیید

ADR-001 زمانی معتبر است که:

- Moduleهای اصلی مرز مشخص داشته باشند.
- هیچ وابستگی مستقیم به Internal Entity دیگر وجود نداشته باشد.
- Database مشترک با Tenant Isolation اجرا شود.
- Web/API و Worker جدا اجرا شوند.
- Event Bus داخلی مبتنی بر Redis تعریف شده باشد.
- REST API مرجع ارتباط Client/Backend باشد.
- Microservices به‌عنوان مسیر معماری محصول انتخاب نشده باشد.

---

## جمع‌بندی

**انتخاب نهایی: Modular Monolith**

با اصول زیر:

```text
One Product
+
Dockerized Deployment
+
Shared Database per Installation
+
Strict Module Boundaries
+
No Direct Internal Entity Access
+
No Cross-Module Foreign Keys
+
Commands / Queries / Services / Events
+
Internal Redis Event Bus
+
Separate Web / Worker / Scheduler
+
Strong Tenant Isolation
+
No Microservices Strategy
```
