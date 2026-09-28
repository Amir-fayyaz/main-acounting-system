# Development Readiness — Gate نهایی شروع توسعه

- وضعیت: READY
- نسخه سند: v1
- تاریخ: 2026-09-27
- محدوده: Product / Domain / Architecture / Engineering / Release Governance

---

## 1. هدف

این سند دروازه رسمی ورود پروژه از مرحله طراحی و مستندسازی سطح‌بالا به مرحله توسعه است.

معیار این Gate «کامل بودن همه جزئیات ممکن» نیست؛ معیار این است که تصمیم‌های مهم و پرهزینه‌ای که می‌توانند در حین توسعه باعث بازطراحی گسترده شوند، تا حد لازم مشخص، مستند و سازگار باشند.

---

## 2. تعریف MVP

MVP این محصول برابر است با:

> حداقل محصول تجاری قابل استفاده برای یک شرکت واقعی؛ نه Prototype، Demo یا Proof of Concept.

MVP باید بتواند Golden Flowهای ضروری شرکت بازرگانی را با داده و کاربر واقعی اجرا کند، در حالی که قابلیت‌های پیشرفته غیرضروری می‌توانند به نسخه‌های بعد منتقل شوند.

---

## 3. Gate Result

```text
Product        ✅ READY
Domain         ✅ READY
Architecture   ✅ READY
Engineering    ✅ READY

--------------------------------
Development Readiness ✅ READY
--------------------------------
```

هیچ Blocker شناخته‌شده‌ای در چهار لایه پایه باقی نمانده است.

مواردی که بعداً می‌توانند تغییر کنند، تا وقتی اثر Fundamental روی چهار لایه نداشته باشند، مانع شروع توسعه نیستند.

---

# 4. Product Readiness

## 4.1 Scope

- Vision مشخص است.
- Actors / Personas مشخص‌اند.
- Business Processes مستند شده‌اند.
- MVP Scope مشخص است.
- Out of Scopeهای اصلی مشخص‌اند.
- Golden Flowهای MVP مشخص‌اند.
- Detailed User Stories تولید شده‌اند.
- Shared MVP User Stories تولید شده‌اند.
- Gap Review انجام شده است.

## 4.2 Business Behavior

- Business Rules اصلی مستند شده‌اند.
- Acceptance Criteria برای Storyهای تفصیلی مشخص است.
- مسیر Manual در کنار مسیر Agentic وجود دارد.
- Agent برای عملیات حساس نیازمند Approval است.
- Plan قبل از Execution قابل ویرایش است.
- Execution نتیجه و Audit قابل ردیابی دارد.
- Exceptionها مفهوم رسمی محصول هستند.

## 4.3 Product Principles

- Speed و Data Consistency معیارهای اصلی هستند.
- کاربر نباید یک اطلاعات را بی‌دلیل دوباره وارد کند.
- قابلیت‌هایی که بین شرکت‌ها واقعاً متفاوت‌اند باید تا حد منطقی Configurable باشند.
- Product باید برای نقش‌های مختلف تجربه مناسب ارائه کند.
- MVP برای شرکت واقعی طراحی شده است.

## 4.4 Release Gate

هر Release مهم باید علاوه بر Capability، این موارد را بگذراند:

- Automated Tests
- Integration / E2E
- Data Consistency Validation
- Performance Validation
- Agent Metrics در صورت وجود Agent
- Real User / Real Company Validation

## 4.5 Pilot Gate

قبل از عرضه تجاری، حداقل یک شرکت واقعی باید با کاربر واقعی و داده واقعی Golden Flowهای مربوط به Release را اجرا کرده باشد.

Demo به‌تنهایی معیار آمادگی تجاری نیست.

---

# 5. Domain Readiness

## 5.1 Boundaries

- Domainها جداگانه مستند شده‌اند.
- Domain Map مشترک وجود دارد.
- Owner هر Business Data مشخص است.
- Cross-Domain تعامل‌ها از Contract/Command/Query/Event انجام می‌شوند.

## 5.2 Domain Model

- Entityها مشخص‌اند.
- Value Objectهای مهم مشخص‌اند.
- Aggregate Boundaries مشخص‌اند.
- State Machineهای اصلی مشخص‌اند.
- Domain Eventهای کلیدی مشخص‌اند.
- Business Invariantهای حیاتی مستند شده‌اند.
- Lifecycleهای مهم مشخص‌اند.

## 5.3 Core Domain Decisions

- Accounting مرجع نهایی اثر مالی ثبت‌شده است.
- Purchase، Sales، Inventory، Tax، Payroll، Fixed Assets و سایر Domainها مالک فرآیندهای خود هستند.
- Agent مالک Business Entity نیست.
- Action Plan یک Domain Object مستقل است.
- Notification یک Domain مستقل است.
- Reporting مالک Source of Truth نیست.
- Documentهای مختلف Domainهای مستقل دارند.

---

# 6. Architecture Readiness

## 6.1 Architectural Style

معماری نهایی:

**Modular Monolith**

اصول کلیدی:

- Module Boundary سخت
- Database مشترک برای هر Installation
- Tenant Isolation کامل
- عدم دسترسی مستقیم به Internal Entityهای Module دیگر
- عدم Cross-Module Foreign Key
- Command / Query / Service / Event برای تعاملات
- Internal Event Bus مبتنی بر Redis
- Web/API جدا از Worker و Scheduler
- عدم حرکت به Microservices به‌عنوان Strategy محصول

## 6.2 Data Ownership

- هر Business Data یک Owner Module دارد.
- Read مستقیم داده داخلی Module دیگر ممنوع است.
- Read Model و Projection مجاز است.
- Snapshot برای اطلاعات تاریخی مالی الزامی است.
- Hard Delete برای Business Data وجود ندارد.
- Audit یک Module مرکزی است.

## 6.3 Consistency

- Strong Consistency برای عملیات حساس مالی و Invariantهای حیاتی
- Eventual Consistency برای Reporting، Notification، Search Projection و قابلیت‌های غیرحیاتی
- Idempotency برای عملیات حساس
- Outbox برای Eventهای موردنیاز
- Execution Journal برای Processهای چندمرحله‌ای
- Optimistic Concurrency برای داده‌های حساس
- Plan قبل از Execute دوباره Validate می‌شود.
- Silent Partial Execution ممنوع است.

## 6.4 Integration

الگوی Integration:

```text
Core Domain
    ↓
Port / Contract
    ↓
Adapter
    ↓
Provider
```

Provider خارجی مستقیماً وارد Domain نمی‌شود.

## 6.5 Agent

Agent:

- Context دریافت می‌کند.
- Observation می‌سازد.
- Proposal می‌دهد.
- Plan می‌سازد.
- Approval می‌گیرد.
- Execution را درخواست می‌کند.
- Outcome را ثبت می‌کند.

Agent مستقیماً Database یا Business Entity را تغییر نمی‌دهد.

---

# 7. Engineering Readiness

## 7.1 Technology Stack — Baseline نهایی

| حوزه                                     | تصمیم                                            |
| ---------------------------------------- | ------------------------------------------------ |
| Backend                                  | NestJS + TypeScript                              |
| Frontend                                 | Next.js + TypeScript                             |
| UI                                       | Desktop-first Web UI + Internal Design System    |
| Database                                 | MySQL                                            |
| ORM / Data Access                        | Drizzle ORM + mysql2                             |
| Cache / Event Bus / Queue Infrastructure | Redis                                            |
| File Storage                             | MinIO                                            |
| Containers                               | Docker                                           |
| Local Development                        | Docker Compose                                   |
| API Contract                             | REST + OpenAPI                                   |
| Repository                               | Monorepo                                         |
| Authentication                           | داخلی + قابلیت افزودن Providerهای خارجی در آینده |

### نکته

Slonik به‌عنوان گزینه Data Access کنار گذاشته شد، چون انتخاب مناسب PostgreSQL است و Database نهایی محصول MySQL است.

نسخه دقیق Patch/Minor فناوری‌ها در زمان شروع پیاده‌سازی انتخاب می‌شود؛ قراردادهای مهم تکنولوژی باید با Version Range سازگار نگه داشته شوند.

## 7.2 Development Rules

- Domain به Framework یا Infrastructure وابسته نیست.
- ORM Model و Domain Entity جدا هستند.
- Repository Interface در مرز مناسب تعریف و Implementation در Infrastructure قرار می‌گیرد.
- هر Use Case Command یا Query مشخص دارد.
- Shared/Common فقط مفاهیم واقعاً عمومی را نگه می‌دارد.
- Circular Dependency ممنوع است.
- Catch کردن خطا و نادیده گرفتن آن ممنوع است.
- عملیات حساس باید Test داشته باشند.
- Secret نباید در Source Code قرار گیرد.

## 7.3 Testing

حداقل سطوح تست:

- Unit
- Integration
- E2E
- Data Integrity
- Security
- Agent Evaluation در صورت وجود Agent

برای Releaseهای مهم، Real User / Real Company Validation نیز اجباری است.

## 7.4 Security

حداقل Gateهای امنیتی پیش از Pilot:

- Tenant Isolation Test
- Authorization Test
- Authentication Test
- Secret Scan
- Dependency / Vulnerability Scan
- Audit Verification

Failure در Tenant Isolation یا Authorization یک Blocker بحرانی است.

## 7.5 Backup / Restore

Backup و Restore باید پیش از استفاده واقعی تست عملی داشته باشد:

```text
Backup
→ Restore
→ Integrity Check
→ System Usable
```

وجود Backup بدون Restore Test کافی نیست.

---

# 8. Capacity Baseline

Baseline اولیه معماری:

| شاخص                    |            مقدار |
| ----------------------- | ---------------: |
| شرکت در هر Installation |                5 |
| کاربر به ازای شرکت      |           50–100 |
| کاربران اسمی کل         |          250–500 |
| نشست همزمان Baseline    |            50–75 |
| Burst Target            | حدود 2× Baseline |
| حداکثر حجم فایل         |             20MB |
| Currency فعال MVP       |              IRR |
| Timezone                |            ایران |
| UI اصلی                 |      Desktop Web |

این اعداد در Pilot با داده واقعی بازبینی می‌شوند.

---

# 9. Offline / Deployment Readiness

- محصول Dockerized است.
- روی سرور سازنده یا مشتری نصب می‌شود.
- عملیات داخلی تا حد امکان بدون اینترنت قابل ادامه است.
- عملیات وابسته به Provider خارجی در صورت قطع ارتباط باید در State مناسب باقی بماند و قابل Retry/Review باشد.
- Web/API و Worker/Scheduler از نظر Process جدا هستند ولی از یک Codebase استفاده می‌کنند.

---

# 10. Semantic Versioning Policy

نسخه‌بندی رسمی محصول و Contractهای مهم بر پایه:

**MAJOR.MINOR.PATCH**

## MAJOR

تغییر ناسازگار با Contract قبلی.

مثال:

```text
1.4.0 → 2.0.0
```

## MINOR

قابلیت جدید بدون شکستن سازگاری قبلی.

```text
1.4.0 → 1.5.0
```

## PATCH

رفع Bug یا تغییر سازگار.

```text
1.4.0 → 1.4.1
```

## Versionهای مستقل

موارد زیر باید Version مستقل و قابل Trace داشته باشند:

- Product Release
- API Contract
- Database Schema
- Domain Event Contract
- Agent
- Rule Set
- Adapter / Provider
- Document Schema

مثال:

```text
Product: 1.4.0
API: v2
Agent: 3.1.0
Tax Rule Set: 1405.2
```

Releaseهای محصول با Git Tag سازگار با Semantic Versioning علامت‌گذاری می‌شوند:

```text
v0.1.0
v0.2.0
v1.0.0
```

Version دقیق Patch/Minor فناوری‌ها در زمان Build/Release مطابق Compatibility Range انتخاب می‌شود.

---

# 11. مواردی که بعد از READY قابل تغییر هستند

این تغییرها بدون باز کردن Gate اصلی مجازند، مشروط بر حفظ معماری:

- جزئیات Implementation
- Refactoring داخلی
- UI Detail
- Patch/Minor Version فناوری‌ها
- Optimization داخلی
- Test Implementation

## مواردی که تغییرشان نیازمند Review معماری/Product است

- Domain Boundary
- Data Ownership
- Transaction Model
- Module Boundary
- Agent Execution Model
- Security Model
- Persistence Strategy
- API Contractهای اصلی
- Cross-Domain Contractهای بنیادی

---

# 12. First Development Slice

اولین Slice توسعه نباید صرفاً Infrastructure باشد و نباید چند ماه فقط روی Foundation هزینه شود.

اولین Slice پیشنهادی:

```text
Authentication
→ Company Context
→ یک Use Case واقعی
→ Domain
→ Persistence
→ Audit
→ REST API
→ Frontend
→ Docker
→ Automated Test
```

هدف این Slice اثبات End-to-End بودن معماری است.

پس از موفقیت این Slice، Foundation وارد وضعیت قابل اعتماد می‌شود و اجرای Golden Flowها آغاز می‌شود.

---

# 13. بعد از READY چه چیزی تغییر می‌کند؟

پس از عبور از این Gate:

- مستندسازی سطح‌بالای Product/Domain/Architecture/Engineering متوقف می‌شود.
- User Story به Issue شکسته می‌شود.
- Issue به Technical Task شکسته می‌شود.
- توسعه و تست شروع می‌شود.
- اگر در حین توسعه تصمیم بنیادی جدیدی ایجاد شود، مستند متناظر به‌روزرسانی و این Gate در صورت نیاز دوباره بررسی می‌شود.

---

# 14. مسیر رسمی بعد از Gate

```text
Development Readiness
        ↓
Issue Breakdown
        ↓
Technical Tasks
        ↓
Implementation
        ↓
Automated Tests
        ↓
Integration / E2E
        ↓
Review
        ↓
Release Candidate
        ↓
Real-world Validation
```

---

# 15. Final Decision

**STATUS: READY FOR DEVELOPMENT**

Product، Domain، Architecture و Engineering برای شروع توسعه به سطح موردنیاز رسیده‌اند.

از این نقطه، هدف اصلی دیگر «مستندسازی بیشتر» نیست؛ هدف اصلی «اجرای کنترل‌شده مستندات موجود» است.
