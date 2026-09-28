# ADR-002 — ساختار داخلی Moduleها و قوانین Dependency

- شناسه: ADR-002
- وضعیت: پذیرفته‌شده
- نسخه: v1
- حوزه: Architecture / Module Structure
- تاریخ: 2026-09-27

---

## 1. تصمیم

هر Module در Modular Monolith از دو مفهوم هم‌زمان استفاده می‌کند:

1. **مرزبندی لایه‌ای** برای تفکیک Domain، Application، Infrastructure و Presentation.
2. **مرزبندی Feature-oriented** درون هر لایه برای سازمان‌دهی Use Caseها و قابلیت‌ها.

ساختار مرجع:

```text
Purchase/
├── Domain/
│   ├── Purchase/
│   ├── GoodsReceipt/
│   └── Payable/
├── Application/
│   ├── RegisterPurchase/
│   ├── ReceiveGoods/
│   └── CreatePayable/
├── Infrastructure/
│   ├── Persistence/
│   ├── Messaging/
│   └── External/
└── Presentation/
    ├── Purchase/
    └── GoodsReceipt/
```

Moduleها مرز سخت دارند و هیچ Moduleای حق دسترسی مستقیم به داخلیات Module دیگر را ندارد.

---

## 2. اهداف

این ADR با اهداف زیر اتخاذ شده است:

- حفظ استقلال Domainها
- جلوگیری از Coupling پنهان
- جلوگیری از نشت Business Logic به لایه‌های فنی
- قابل‌فهم بودن ساختار برای انسان و Developer Agent
- امکان توسعه Featureها بدون ایجاد فایل‌های پراکنده و مبهم
- حفظ قابلیت تست Domain بدون Framework
- جلوگیری از تبدیل Shared/Common به محل منطق کسب‌وکار
- فراهم کردن Contractهای روشن بین Moduleها

---

## 3. ساختار داخلی هر Module

### 3.1 Domain

مالک قوانین و مدل کسب‌وکار Module است.

شامل مواردی مانند:

- Entity
- Value Object
- Aggregate
- Domain Service
- Domain Policy / Rule
- Domain Event
- Invariant
- Repository Interface

Domain نباید وابستگی فنی مستقیم داشته باشد.

### 3.2 Application

لایه اجرای Use Case است و مسئول:

- دریافت Command و Query
- اجرای Use Case
- فراخوانی Aggregateها
- هماهنگی Domain Serviceهای لازم
- مدیریت Transaction در مرز مناسب
- استفاده از Contractهای Moduleهای دیگر
- Orchestration
- Dispatch/Publish کردن Event طبق قرارداد
- هماهنگی Approval و Execution در موارد لازم

Application نباید مالک Business Rule اصلی باشد.

### 3.3 Infrastructure

مسئول جزئیات تکنولوژیک است، از جمله:

- ORM / Persistence
- Repository Implementation
- Redis
- Queue / Worker integration
- File Storage
- External Provider integration
- Email/SMS در صورت وجود
- Logging/Observability integration
- Configuration

Infrastructure نباید مالک Domain Logic باشد.

### 3.4 Presentation

مسئول Adapter ورودی/خروجی بیرونی است، از جمله:

- REST Controller / Endpoint
- Request/Response DTO
- Authentication boundary
- Serialization
- Validation ورودی در سطح API

Presentation نباید Business Rule را اجرا کند و باید Use Caseهای Application را فراخوانی کند.

---

## 4. Feature-oriented Structure

درون هر لایه، قابلیت‌های مرتبط باید کنار هم قرار بگیرند.

مثال:

```text
Sales/
├── Domain/
│   ├── Invoice/
│   ├── Receivable/
│   └── SalesReturn/
├── Application/
│   ├── CreateSalesInvoice/
│   ├── FinalizeSalesInvoice/
│   ├── CreateReceivable/
│   └── RegisterSalesReturn/
├── Infrastructure/
│   ├── Persistence/
│   └── Messaging/
└── Presentation/
    ├── SalesInvoice/
    └── SalesReturn/
```

Feature grouping نباید باعث شکستن مرز Domain یا انتقال Ruleها به لایه اشتباه شود.

---

## 5. استقلال Domain

Domain باید تا حد ممکن Pure باشد.

### ممنوع

Domain نباید مستقیماً به موارد زیر وابسته باشد:

- Web Framework
- HTTP
- ORM
- Database Driver
- Redis
- Queue Library
- File Storage SDK
- AI Provider
- External Provider SDK
- UI
- Configuration فنی

### مجاز

Domain می‌تواند به Abstractionهایی وابسته باشد که بخشی از قرارداد Domain هستند، مانند:

- Repository Interface
- Domain Policy
- Domain Service Contract در صورت نیاز
- Domain Event Contract

هدف این است که Domain بدون راه‌اندازی Infrastructure کامل، قابل Unit Test باشد.

---

## 6. Application Layer

Application مالک Use Case است.

یک Use Case باید ترجیحاً Contract مشخص داشته باشد.

مثال:

```text
RegisterPurchaseCommand
RegisterPurchaseHandler

GetPurchaseQuery
GetPurchaseHandler
```

Controller یا Adapter ورودی فقط داده را دریافت و به Application تحویل می‌دهد.

Application نباید تبدیل به محل Business Ruleهای اصلی شود.

---

## 7. Domain Service و Policy

### Domain Service زمانی مجاز است که:

- منطق کسب‌وکار به یک Entity منفرد محدود نباشد.
- منطق به چند Entity یا Aggregate همان Domain مرتبط باشد.
- قرار دادن منطق در Entityها باعث پیچیدگی غیرضروری شود.

### Application Service زمانی استفاده می‌شود که:

- هدف اصلی Orchestration باشد.
- Use Case چند مرحله را هماهنگ کند.
- نیاز به هماهنگی Contractهای دیگر Moduleها وجود داشته باشد.

### Domain Policy / Rule زمانی استفاده می‌شود که:

- Rule مستقل و قابل استفاده مجدد باشد.
- Rule بخشی از هویت و صحت Domain باشد.

ساختن Service صرفاً برای فرار از تصمیم درباره مالکیت منطق ممنوع است.

---

## 8. Repository

Repository به‌صورت Port در Domain تعریف می‌شود و Implementation آن در Infrastructure قرار می‌گیرد.

```text
Domain
  └── Repository Interface
          ↑
Infrastructure
  └── Repository Implementation
```

Domain نباید Implementation مربوط به ORM یا Database را بشناسد.

---

## 9. Domain Entity و Persistence Model

Domain Entity و ORM/Persistence Model **باید جدا باشند**.

این جداسازی مطلق است.

مدل مرجع:

```text
Domain Entity
      ↕
Mapping
      ↕
Persistence Model
```

دلایل:

- جلوگیری از تحمیل Schema به Domain
- حفظ Invariantها در مدل کسب‌وکار
- کاهش وابستگی به ORM
- امکان تغییر Persistence در آینده
- جلوگیری از نشت Lazy Loading و رفتارهای ORM به Domain

---

## 10. Shared Kernel

یک Shared Kernel کوچک مجاز است؛ اما فقط برای مفاهیم واقعاً عمومی و مستقل از Domain.

موارد مجاز شامل:

- Money
- Currency
- Identifier primitives
- Business Date primitives
- Time/Date primitives
- Result / Error primitives
- Tenant/Company context primitive
- Base Domain Event Contract

موارد زیر نباید Shared Kernel باشند:

- Customer
- Supplier
- Product
- Invoice
- Accounting Document
- Agent Plan
- Employee
- Tax Invoice
- هر Business Rule وابسته به یک Domain

Shared Kernel نباید به سطل زباله مشترک پروژه تبدیل شود.

---

## 11. Shared / Common

وجود یک بخش `Shared` یا `Common` مجاز است، اما فقط برای قابلیت‌های واقعاً عمومی و فاقد مالکیت Domain.

نمونه‌های مجاز:

- Primitiveهای عمومی
- Utilityهای بسیار مشخص و مستقل از Domain
- Cross-cutting abstractions
- Error primitives
- Contractهای واقعاً مشترک

### قانون سخت

هر قطعه کدی که Business Meaning یا Business Rule دارد باید داخل Module مالک خودش باشد؛ حتی اگر بیش از یک Module به آن نیاز داشته باشند.

قبل از انتقال چیزی به Shared/Common باید بررسی شود که آیا واقعاً Domain-agnostic است یا فقط «مشترک به نظر می‌رسد».

---

## 12. Cross-Module Dependency

این Rule یک قانون Absolute است.

### مجاز

ارتباط بین Moduleها فقط از طریق Contractهای منتشرشده Module مقصد:

- Command Contract
- Query Contract
- Application Service Contract
- Domain Event
- در موارد مشخص Domain Service Contract

### ممنوع

- Direct Entity Access
- Direct Repository Access
- Direct Table Access
- Direct ORM Access
- دسترسی به Internal Serviceهای Module دیگر
- استفاده از DTO داخلی Module دیگر به‌عنوان Contract پایدار

مثال ممنوع:

```text
Sales
  → InventoryInternalEntity
```

مثال مجاز:

```text
Sales
  → Inventory Contract
      → Command / Query / Event
```

---

## 13. Circular Dependency

Circular Dependency بین Moduleها مطلقاً ممنوع است.

مثال ممنوع:

```text
Sales → Inventory
Inventory → Sales
```

اگر دو طرف نیاز به تعامل داشته باشند، باید از یکی از این راه‌ها استفاده شود:

- Domain Event
- Application Contract
- Query Contract
- یک Abstraction مستقل و بی‌مالکیت مشترک در سطح Shared Kernel، فقط در صورت واجد شرایط بودن

Shared/Common نباید صرفاً برای شکستن Circular Dependency استفاده شود.

---

## 14. Shared Infrastructure

Infrastructure مشترک برای موارد فنی زیر مجاز است:

- Database connectivity
- Redis
- Queue
- File Storage
- Logging
- Observability
- Configuration
- HTTP Client infrastructure

اما Shared Infrastructure:

- مالک Domain نیست.
- Business Rule ندارد.
- نباید Entity کسب‌وکار را تغییر دهد.
- نباید به Gateway مخفی بین Moduleها تبدیل شود.

---

## 15. دسترسی Moduleها به Shared Infrastructure

Moduleها نمی‌توانند به هر SDK یا Client زیرساختی به‌صورت آزاد وابسته شوند.

مدل مجاز:

```text
Module
  ↓
Port / Contract
  ↓
Infrastructure Adapter
```

مثال:

```text
Purchase
  ↓
FileStoragePort
  ↓
FileStorageAdapter
  ↓
Storage Provider
```

این قانون باعث می‌شود Infrastructure قابل تعویض و قابل تست باقی بماند.

---

## 16. Presentation داخل Module

هر Module مالک Endpointها و Adapterهای ورودی مربوط به قابلیت‌های خودش است.

مثال:

```text
Sales/
└── Presentation/
    ├── SalesInvoiceController
    ├── SalesReturnController
    └── ReceiptController
```

یک Controller مرکزی غول‌پیکر برای کل سیستم مجاز نیست.

Presentation فقط Adapter است و نباید منطق اصلی کسب‌وکار را در خود نگه دارد.

---

## 17. Command / Query per Use Case

هر Use Case باید Contract صریح خودش را داشته باشد.

### مثال Command

```text
RegisterPurchaseCommand
RegisterPurchaseHandler
```

### مثال Query

```text
GetPurchaseQuery
GetPurchaseHandler
```

این ساختار باعث می‌شود:

- Use Case قابل ردیابی باشد.
- Test آسان‌تر شود.
- Agent بتواند Contract مشخص را فراخوانی کند.
- Authorization در مرز Use Case قابل اعمال باشد.
- وابستگی Presentation به Domain کاهش یابد.

---

## 18. Aggregate و چند Entity در Use Case

یک Use Case می‌تواند چند Entity را تغییر دهد، اما فقط در محدوده Transaction/Aggregate Boundary تعریف‌شده.

### قانون

- Aggregate Root تنها Entry Point برای تغییر Aggregate است.
- Entityهای داخلی Aggregate نباید از بیرون مستقیماً تغییر کنند.
- یک Use Case نباید صرفاً برای راحتی چند Aggregate نامرتبط را در یک Transaction قرار دهد.
- اگر یک عملیات واقعاً نیازمند چند Aggregate است، Boundary و Consistency آن باید در Domain مشخص باشد.

این تصمیم با اصول Domain Model هماهنگ است.

---

## 19. Domain Event

Domain Event فقط پس از وقوع یک Business Fact تولید می‌شود.

### Event

```text
SalePosted
PurchaseRegistered
PaymentReceived
PeriodClosed
```

### Command

```text
PostSale
RegisterPurchase
ReceivePayment
ClosePeriod
```

Event نباید Command را تقلید کند.

### محل ایجاد

Domain یا Application می‌تواند Event را ایجاد/منتشر کند، مشروط بر اینکه Event نشان‌دهنده یک Fact واقعی باشد و با قوانین Transaction هماهنگ باشد.

Controller و Infrastructure نباید Business Event مصنوعی بسازند.

---

## 20. Event Handler

Event Handler می‌تواند در Application یا Infrastructure قرار بگیرد؛ انتخاب محل بر اساس ماهیت Handler انجام می‌شود.

### مثال Application Handler

وقتی Event نیازمند اجرای یک Use Case کسب‌وکاری باشد.

### مثال Infrastructure Handler

وقتی Event برای یک عملیات فنی مانند Notification، Logging یا Projection استفاده شود.

### قانون

Event Handler هیچ‌وقت مجاز نیست مستقیماً Entity یا Repository داخلی Module دیگر را تغییر دهد.

---

## 21. Configuration

Configuration فنی در Infrastructure نگهداری می‌شود.

مواردی مانند:

- Database
- Redis
- File Storage
- AI Provider
- External Provider
- Timeout
- Retry
- Connection String

Domain نباید از وجود این Configurationهای فنی خبر داشته باشد.

Domain باید فقط با Abstractionهای لازم کار کند.

---

## 22. Dependency Direction

قانون بنیادی Dependency:

```text
Outer layers may depend on inner abstractions.
Inner layers must never depend on outer technical details.
Modules may depend only on published contracts.
No module may depend on another module's internals.
```

به زبان عملیاتی:

```text
Presentation
      ↓
Application
      ↓
Domain

Infrastructure
      ↓
Domain / Application Contracts
```

و در سطح Module:

```text
Module A
   ↓
Published Contract of Module B
```

نه:

```text
Module A
   ↓
Internal implementation of Module B
```

---

## 23. قوانین ممنوعیت Shortcut

Developer و Developer Agent حق ندارند برای سرعت توسعه موارد زیر را دور بزنند:

- Import مستقیم Entity Module دیگر
- دسترسی مستقیم به Repository Module دیگر
- دسترسی مستقیم به Table Module دیگر
- استفاده مستقیم از ORM Model Module دیگر
- ایجاد Circular Dependency
- قرار دادن Business Rule در Controller
- قرار دادن Business Rule در Infrastructure
- قراردادن Domain Rule در Shared/Common صرفاً برای Reuse
- فراخوانی مستقیم SDK خارجی از Domain
- دسترسی مستقیم Agent به Persistence

Shortcutی که مرز معماری را می‌شکند، حتی اگر فعلاً کار کند، نقض Definition of Done معماری محسوب می‌شود.

---

## 24. پیامدهای تصمیم

### مزایا

- Moduleها قابل‌فهم و قابل‌مالکیت هستند.
- Business Logic در جای درست می‌ماند.
- تست Domain ساده‌تر می‌شود.
- ORM قابل تعویض‌تر است.
- Cross-Module Coupling کنترل می‌شود.
- Developer Agent مسیر اجرای استاندارد و قابل پیش‌بینی دارد.
- تغییر یک Integration بیرونی اثر کمتری بر Domain دارد.

### هزینه‌ها

- Mapping بین Domain و Persistence لازم است.
- تعداد فایل و Contract بیشتر از معماری ساده خواهد بود.
- تیم باید Dependency Rules را جدی اجرا کند.
- Shared/Common نیازمند Governance است.
- برای Use Caseهای ساده ممکن است ساختار کمی پرهزینه‌تر به نظر برسد.

این هزینه‌ها آگاهانه پذیرفته شده‌اند تا سلامت معماری و ثبات محصول حفظ شود.

---

## 25. ADRهای وابسته

این تصمیم مبنای ADRهای زیر است:

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

## 26. معیار تأیید ADR

ADR-002 زمانی رعایت‌شده محسوب می‌شود که:

- هر Module ساختار استاندارد داشته باشد.
- Domain به Framework و Infrastructure وابسته نباشد.
- Application مسئول Use Case باشد.
- ORM Model و Domain Entity جدا باشند.
- Repository Interface در Domain و Implementation در Infrastructure باشد.
- Shared Kernel کوچک و کنترل‌شده باشد.
- Shared/Common محل Business Logic نباشد.
- Cross-Module فقط از Contractهای مجاز انجام شود.
- Circular Dependency وجود نداشته باشد.
- Foreign Key مستقیم بین Moduleها ایجاد نشود.
- Presentation داخل Module قرار داشته باشد.
- هر Use Case Command/Query مشخص داشته باشد.
- Aggregate Boundary رعایت شود.
- Eventها Business Fact باشند.
- Configuration فنی در Domain نشت نکند.
- قانون طلایی Dependency در Code Review و CI قابل کنترل باشد.

---

## 27. خلاصه اجرایی

```text
Module
├── Domain
│   └── Business Rules / Aggregates / Events / Ports
├── Application
│   └── Commands / Queries / Use Cases / Orchestration
├── Infrastructure
│   └── Persistence / External / Messaging / Configuration
└── Presentation
    └── REST / DTO / Input Adapters
```

و قانون کلیدی:

```text
No Internal Access
No Cross-Module Foreign Key
No Circular Dependency
No Business Logic in Technical Layers
No Domain Dependency on Infrastructure
No ORM Entity = Domain Entity
Contracts Only Across Module Boundaries
```
