# ADR-004 — Transaction Boundary و Consistency Model

- شناسه: ADR-004
- وضعیت: پذیرفته‌شده
- نسخه: v1
- تاریخ: 2026-09-27
- حوزه: Transaction, Consistency, Reliability

---

## 1. تصمیم

سیستم از یک مدل ترکیبی برای Consistency استفاده می‌کند:

- **Strong Consistency** برای داده و عملیات حساس مالی و هر چیزی که داخل یک Business Consistency Boundary قرار دارد.
- **Eventual Consistency** برای قابلیت‌هایی مانند Reporting، Notification، Search Projection و تحلیل‌های غیرحیاتی Agent.

Transaction Boundary بر اساس **Business Consistency Boundary** تعیین می‌شود، نه بر اساس Controller، صفحه UI یا صرفاً مرز Module.

اصل‌های محوری:

> هر عملیات موفق کسب‌وکاری باید نتیجه‌ای قطعی، قابل ردیابی و قابل بازیابی داشته باشد.

> اجرای ناقص هیچ‌وقت نباید به‌صورت بی‌صدا اتفاق بیفتد.

---

## 2. اهداف

این ADR برای جلوگیری از وضعیت‌هایی مانند موارد زیر است:

- ثبت موجودی بدون اثر حسابداری لازم
- ثبت حسابداری بدون اثر مورد انتظار عملیاتی
- اجرای دوباره یک پرداخت
- اجرای دوباره یک Plan
- گم‌شدن Event بعد از Commit
- اجرای چندباره Event Consumer
- باقی‌ماندن فرآیند در وضعیت نامشخص بعد از Crash
- تغییر همزمان یک سند توسط چند کاربر و Overwrite شدن بی‌صدا
- اجرای Plan قدیمی روی وضعیت جدید Domain

---

## 3. اصل Atomic Business Operation

هر عملیاتی که از دید کسب‌وکار یک عملیات واحد است باید یک Outcome مشخص داشته باشد.

این Outcome یکی از حالت‌های زیر است:

- Completed
- Failed
- PartiallyCompleted
- NeedsReview
- Compensated
- InProgress / Pending

سیستم نباید عملیاتی داشته باشد که از دید کاربر «انجام‌شده» به نظر برسد ولی بخشی از اثرهای حیاتی آن ناشناخته یا از دست‌رفته باشند.

---

## 4. Cross-Domain Transaction

همه Cross-Domainها الزاماً یک Database Transaction واحد نیستند.

اصل:

> فقط تغییراتی که برای یک Business Consistency Boundary به‌طور ذاتی اتمیک هستند باید در یک Transaction مشترک قرار بگیرند.

اثرهای غیرحیاتی یا قابل‌تفکیک می‌توانند از مسیر Event/Job ادامه پیدا کنند.

مثال:

```text
Sales
   |
   +--> Inventory
   |
   +--> Receivable
   |
   +--> Accounting
```

این فرآیند از طریق یک Use Case/Orchestrator رسمی هماهنگ می‌شود و برای هر اثر، مرز Consistency صریح دارد.

Transactionهای بسیار بزرگ و سراسری که صرفاً به‌خاطر راحتی UI چند Domain را قفل کنند، ممنوع‌اند.

---

## 5. Transaction Boundary

Transaction Boundary بر اساس این موارد تعیین می‌شود:

- Business Invariant
- Atomicity Requirement
- Data Ownership
- Aggregate Boundary
- Failure Semantics
- Recovery Requirement

Transaction نباید صرفاً بر اساس این موارد تعیین شود:

- Controller
- Page
- Request HTTP
- UI Wizard
- Module name

---

## 6. Module و Transaction

هیچ Moduleای اجازه ندارد Transaction دیتابیس Module دیگر را مستقیماً شروع، Commit یا Rollback کند.

اگر یک Use Case چند Module را درگیر کند:

```text
Application Orchestrator
        |
        +--> Module Contract A
        +--> Module Contract B
        +--> Module Contract C
```

کنترل عملیات از طریق Contractهای رسمی انجام می‌شود.

دسترسی مستقیم به Persistence Module دیگر ممنوع است.

---

## 7. Approval و Execute

در معماری Agent:

```text
Plan
  ↓
User Review/Edit
  ↓
Approve
  ↓
Execute
```

`Approve` و `Execute` دو مرحله مستقل هستند.

### Approve

تنها وضعیت Plan و Approval Record را تغییر می‌دهد.

### Execute

عملیات کسب‌وکاری را اجرا می‌کند.

بنابراین:

> Approve ≠ Execute

این جداسازی برای Audit، Retry، Recovery و بررسی Preconditions ضروری است.

---

## 8. Atomic Execution برای Agent Plan

یک Plan می‌تواند چند Action داشته باشد.

اگر Action میانی شکست بخورد، رفتار Plan بر اساس نوع Plan تعیین می‌شود.

سه حالت ممکن است:

### Atomic Plan

همه Actionهای حیاتی باید با هم موفق شوند.

در شکست، سیستم Rollback یا Compensation لازم را اجرا می‌کند.

### Resumable Plan

بخشی از Actionها ممکن است Commit شوند و ادامه Plan بعداً Resume شود.

### External-Effect Plan

Actionهایی که اثر خارجی غیرقابل-Rollback دارند باید با State Machine و Compensation مدیریت شوند.

### اصل مشترک

هیچ Planی نباید Silent Partial Execution داشته باشد.

اگر بخشی از Plan اجرا شده و بخش دیگری نشده:

- وضعیت باید `PartiallyCompleted` یا وضعیت معادل مشخص داشته باشد.
- Actionهای اجراشده باید ثبت شوند.
- Actionهای ناموفق باید مشخص باشند.
- امکان Recovery یا Review وجود داشته باشد.

---

## 9. Rollback

Rollback فنی فقط وقتی مجاز و معتبر است که Effect واقعاً در محدوده همان Transaction قرار داشته باشد.

برای Side Effectهای بیرونی یا Effectهای غیرقابل-Rollback، سیستم نباید وانمود کند Rollback انجام شده است.

در چنین مواردی از این مکانیزم‌ها استفاده می‌شود:

- State Transition
- Retry
- Compensation
- Correction
- Reversal
- Resubmission

---

## 10. Compensation

برای عملیات‌هایی که Rollback واقعی ندارند، Domain باید عملیات جبرانی تعریف کند.

نمونه:

```text
Payment
  → Reverse Payment
```

یا:

```text
Tax Submission
  → Correction
  → Resubmission
```

یا:

```text
External Request
  → Compensating Action
```

Compensation یک Business Operation واقعی است، نه حذف سابقه.

---

## 11. Idempotency

تمام Commandهای حساس باید Idempotent باشند یا Duplicate را به‌صورت قابل‌اعتماد تشخیص دهند.

حداقل Mechanismهای مجاز:

- Idempotency Key
- Business Unique Constraint
- Execution Record
- State Transition Check

مثال:

اگر `ApprovePayment` سه بار دریافت شود، نتیجه باید حداکثر یک Payment Effect داشته باشد.

Idempotency فقط برای API خارجی نیست؛ Job، Event Consumer، Agent Action و Command داخلی حساس نیز باید این قابلیت را در سطح مناسب داشته باشند.

---

## 12. Retry Policy

Retry باید بر اساس نوع خطا انجام شود.

### Temporary Failure

مثلاً:

- Timeout
- Connection Failure
- Temporary Provider Unavailability

می‌تواند Retry شود.

### Business Failure

مثلاً:

- موجودی ناکافی
- دوره بسته
- مجوز نادرست
- داده نامعتبر

نباید با Retry کور ادامه پیدا کند.

### Provider Failure

Retry طبق Policy مخصوص Provider انجام می‌شود.

### الزامات Retry

- تعداد Retry محدود باشد.
- Backoff وجود داشته باشد.
- وضعیت Retry قابل مشاهده باشد.
- Retry نباید Duplicate Business Effect ایجاد کند.
- بعد از Exhaust شدن Retry، فرآیند به وضعیت قابل‌بررسی منتقل شود.

---

## 13. Timeout

برای عملیات خارجی و Jobهای طولانی Timeout وجود دارد.

نمونه:

- AI Provider Call
- Tax Provider Call
- Bank Provider Call
- File Processing
- Long-running Job

Timeout نباید الزاماً معادل Business Failure در نظر گرفته شود.

ممکن است وضعیت‌هایی مانند زیر لازم باشد:

- TimedOut
- UnknownOutcome
- NeedsRetry
- NeedsReview

خصوصاً در درخواست خارجی ممکن است Response دریافت نشده باشد، ولی Provider عملیات را انجام داده باشد؛ بنابراین Retry کور ممنوع است.

---

## 14. Outbox Pattern

برای Eventهایی که بعد از یک Database Transaction باید منتشر شوند، از Outbox Pattern استفاده می‌شود.

الگوی پایه:

```text
Business Transaction
      |
      +--> Domain Data
      |
      +--> Outbox Record
      |
    Commit
      |
      v
Event Dispatcher
      |
      v
Redis Internal Event Bus
```

### دلیل

اگر Database Commit شود ولی Event Publish نشود، Event نباید گم شود.

Outbox باعث می‌شود ثبت Business Effect و ثبت Event برای Dispatch در یک Transaction سازگار باقی بمانند.

---

## 15. Event Consumer Idempotency

Event Consumerها باید در مقابل Duplicate Event مقاوم باشند.

حداقل:

```text
EventId
+
Consumer Processing Record
+
Idempotent Business Action
```

اگر همان Event دوباره برسد، Consumer نباید Business Effect را دوباره ایجاد کند.

---

## 16. Event Ordering

Ordering به‌صورت Global تضمین نمی‌شود.

فقط Domainهایی که واقعاً به ترتیب Event نیاز دارند باید Ordering Contract داشته باشند.

مثال:

```text
SaleCreated
→ SalePosted
→ SaleCorrected
```

برای چنین جریان‌هایی باید Ordering مرتبط با Aggregate/Business Process حفظ شود.

سیستم نباید برای تمام Eventهای کل محصول یک Global Event Order ایجاد کند.

---

## 17. Strong Consistency

Strong Consistency برای موارد زیر اصل است:

- Accounting Posting
- حساس‌ترین Inventory Changes
- عملیات مالی حیاتی
- Aggregate Invariants
- تغییرات حساس دوره مالی
- Approval State
- Stateهای حیاتی Execution

عملیاتی که در این دسته‌اند نباید فقط به امید یک Event آینده «موفق» تلقی شوند.

---

## 18. Eventual Consistency

Eventual Consistency برای موارد مناسب زیر قابل‌قبول است:

- Reporting Read Models
- Notification
- Search Projection
- بعضی تحلیل‌های Agent
- برخی داده‌های Dashboard
- عملیات غیرحیاتی بعد از Commit

در این موارد UI باید در صورت نیاز وضعیت به‌روزرسانی/در حال پردازش را نشان دهد.

---

## 19. Accounting Completeness

اصل مهم:

> اگر یک Business Transaction اثر حسابداری دارد، تا وقتی Accounting Effect مورد انتظار ثبت نشده، عملیات از نظر سیستم کامل محسوب نمی‌شود؛ مگر اینکه فرآیند صریحاً به‌صورت Async در حال تکمیل علامت‌گذاری شده باشد.

بنابراین حالت «Success» باید با واقعیت Accounting سازگار باشد.

---

## 20. Inventory + Accounting

برای جریان‌هایی مانند:

```text
Purchase
  ↓
Inventory Receipt
  ↓
Payable
  ↓
Accounting
```

یک Business Transaction/Application Operation باید اثرهای لازم را هماهنگ کند.

Inventory نباید مستقل از فرآیند کسب‌وکار جلو برود و سپس امیدوار باشیم Accounting بعداً درست شود.

همچنین Accounting نباید بدون Business Transaction معتبر اثر ساختگی تولید کند.

---

## 21. Process State Machine

فرآیندهای چندمرحله‌ای باید State Machine رسمی داشته باشند.

الگوی عمومی:

```text
Created
  ↓
Validated
  ↓
Approved
  ↓
Executing
  ↓
Completed
```

و در شاخه‌های شکست:

```text
Failed
PartiallyCompleted
NeedsReview
Compensated
TimedOut
```

هر Process می‌تواند Stateهای اختصاصی خودش را داشته باشد ولی باید قانون انتقال معتبر داشته باشد.

---

## 22. Execution Journal

برای Executionهای چندمرحله‌ای، مخصوصاً Agent Planها، Execution Journal رسمی نگهداری می‌شود.

حداقل برای هر Action:

- Action ID
- وضعیت
- شروع
- پایان
- Input Reference
- Outcome
- Error
- Retry Count
- Compensation
- External Reference
- Idempotency Key در صورت نیاز

مثال:

```text
Action 1 → Completed
Action 2 → Completed
Action 3 → UnknownOutcome
Action 4 → Pending
```

بعد از Crash سیستم باید بتواند بر اساس این Journal تشخیص دهد چه اتفاقی افتاده است.

---

## 23. Crash Recovery

اگر Process وسط Execute متوقف شود، بعد از بازگشت سیستم:

1. وضعیت Process شناسایی می‌شود.
2. Actionهای اجراشده مشخص می‌شوند.
3. Actionهای نامشخص مشخص می‌شوند.
4. Idempotency/Execution Record بررسی می‌شود.
5. سیستم بر اساس Policy یکی از این رفتارها را انجام می‌دهد:
   - Resume
   - Retry امن
   - Compensation
   - NeedsReview

هیچ مرحله‌ای نباید صرفاً با حدس ادامه پیدا کند.

---

## 24. Recovery Strategy

Recovery به‌صورت Hybrid است.

### خودکار

برای مواردی مانند:

- Temporary Failure
- Timeoutهای قابل‌اعتماد
- Jobهای قابل Retry
- Eventهای Idempotent
- Recoveryهای بدون ریسک

### انسانی

برای مواردی مانند:

- Unknown External Outcome
- مغایرت داده
- Compensating Operation پرریسک
- شکست غیرقابل تشخیص
- Conflict حساس مالی

---

## 25. Compensation به‌جای Delete

برای داده‌های مالی و عملیات ثبت‌شده:

```text
Delete
```

راه اصلاح نیست.

به‌جای آن:

```text
Correction
Reversal
Replacement
Compensation
```

استفاده می‌شود.

این اصل با Immutable Accounting و Auditability هماهنگ است.

---

## 26. Transaction Isolation

Isolation Level به‌صورت یکسان و سخت‌گیرانه برای همه عملیات تعیین نمی‌شود.

اصل:

> Isolation Level باید بر اساس نوع عملیات و نیاز Consistency انتخاب شود.

برای هر عملیات حساس، مقدار مناسب باید با توجه به:

- احتمال Concurrent Update
- Business Invariant
- نوع Query
- حجم Transaction
- Performance

تعیین شود.

انتخاب «بیشترین Isolation برای همه» ممنوع است، مگر یک Use Case واقعاً به آن نیاز داشته باشد.

---

## 27. Concurrency Control

مدل اصلی Concurrency برای داده‌های Business:

**Optimistic Concurrency**

با استفاده از Version/Revision یا مکانیزم معادل.

مثال:

```text
User A reads Revision 10
User B updates → Revision 11
User A tries to save Revision 10
        ↓
Conflict Detected
```

نتیجه:

```text
Rejected / Conflict
→ User Review
```

سیستم نباید تغییر B را بی‌صدا با تغییر A overwrite کند.

---

## 28. Agent Plan Staleness

Plan زمانی که ایجاد شده ممکن است بعداً با وضعیت Domain متفاوت شود.

بنابراین در Execute:

1. Preconditions دوباره بررسی می‌شوند.
2. Current State خوانده می‌شود.
3. Version/Revision بررسی می‌شود.
4. اگر Plan دیگر معتبر نبود:

```text
Plan Stale
→ Revalidate
→ Recalculate / Rebuild
```

سیستم نباید Plan قدیمی را کورکورانه اجرا کند.

---

## 29. Manual + Agent Race

اگر Agent یک Plan ساخته باشد و کاربر هم‌زمان همان عملیات را دستی انجام دهد، Execute باید وضعیت فعلی Domain را دوباره اعتبارسنجی کند.

سناریو:

```text
Agent Plan
    ↓
User reviews
    ↓
Manual operation changes state
    ↓
Agent Execute
```

نتیجه صحیح:

```text
Plan Stale
→ Revalidation
→ Stop / Rebuild / Review
```

نه اجرای Plan بر اساس اطلاعات قدیمی.

---

## 30. Preconditions

هر عملیات حساس باید قبل از Execute Preconditions خودش را بررسی کند.

نمونه:

- دوره باز است.
- کاربر مجوز دارد.
- Entity هنوز در وضعیت مورد انتظار است.
- موجودی کافی است.
- عملیات قبلاً انجام نشده است.
- Plan هنوز معتبر است.
- External Reference با Execution Record تضاد ندارد.

Precondition Check در Execute دوباره اجرا می‌شود؛ اتکا به Check زمان Plan Creation کافی نیست.

---

## 31. وضعیت موفقیت

یک عملیات فقط زمانی `Completed/Success` محسوب می‌شود که:

- اثرهای موردنیاز ثبت شده باشند.
- Invariantها برقرار باشند.
- Execution Journal تکمیل باشد.
- Event/Outbox لازم ثبت شده باشد.
- Outcome قطعی باشد.

اگر Outcome نامعلوم باشد، وضعیت Success ممنوع است.

---

## 32. پیامدهای تصمیم

### مزایا

- جلوگیری از Silent Partial Execution
- کاهش Duplicate Financial Effects
- Recovery قابل‌اعتماد
- Audit بهتر
- کنترل بهتر عملیات Agent
- سازگاری قوی با Accounting
- امکان مدیریت Failureهای Provider
- کنترل Concurrency
- کاهش ریسک Crash و Retry

### هزینه‌ها

- پیاده‌سازی Execution Journal
- Outbox
- Idempotency
- Retry Policy
- State Machine
- Recovery Logic
- Complexity بیشتر نسبت به CRUD ساده

این پیچیدگی برای یک سیستم مالی حساس ضروری است و باید در Core Architecture لحاظ شود.

---

## 33. اصول صریحاً ممنوع

- Silent Partial Execution
- Blind Retry
- Duplicate Business Effect
- Direct Cross-Module Transaction Control
- فرض Success برای Outcome نامعلوم
- Rollback جعلی برای عملیات خارجی
- اجرای Plan قدیمی بدون Revalidation
- Last-Write-Wins بی‌قاعده روی داده حساس
- Delete برای Correction عملیات مالی

---

## 34. ADRهای وابسته

- ADR-002 — Module Structure و Dependency Rules
- ADR-003 — Data Ownership و Persistence Boundary
- ADR-005 — Command / Query / Domain Event Model
- ADR-006 — Agent Architecture
- ADR-007 — Adapter / Provider Architecture
- ADR-008 — Job / Queue Architecture
- ADR-011 — Deployment / Offline Architecture
- ADR-014 — Testing Architecture
- ADR-015 — Observability و Recovery

---

## 35. معیار تأیید

این ADR زمانی اجرایی است که:

- Transaction Boundaryها بر اساس Business Consistency Boundary تعریف شوند.
- Cross-Domain Transaction Control غیرمستقیم باشد.
- Approval و Execute جدا باشند.
- Commandهای حساس Idempotent باشند.
- Outbox برای Eventهای لازم وجود داشته باشد.
- Event Consumerها Idempotent باشند.
- Execution Journal برای Processهای چندمرحله‌ای وجود داشته باشد.
- Retry و Compensation Policy تعریف شده باشد.
- Optimistic Concurrency برای داده‌های حساس وجود داشته باشد.
- Plan قبل از Execute دوباره Validate شود.
- هیچ Silent Partial Execution وجود نداشته باشد.
