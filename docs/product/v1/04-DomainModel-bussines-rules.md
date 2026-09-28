# Phase 4 — Domain Model & Business Rules

## 1. هدف

در این مرحله مشخص می‌کنیم:

- سیستم چه مفاهیم اصلی‌ای دارد؟
- هر مفهوم چه مسئولیتی دارد؟
- موجودیت‌ها چه رابطه‌ای با هم دارند؟
- وضعیت هر موجودیت چگونه تغییر می‌کند؟
- چه قوانین کسب‌وکاری نباید شکسته شوند؟
- Agentها به کدام بخش‌های Domain دسترسی دارند؟

این سند مبنای Phase 5 یعنی User Story Mapping خواهد بود.

---

# 2. اصل معماری کسب‌وکاری

سیستم از چند حوزه اصلی تشکیل می‌شود:

```text
Company / Tenant
│
├── Identity & Access
│
├── Accounting
│
├── Sales
│
├── Purchase
│
├── Inventory
│
├── Treasury
│   ├── Bank
│   ├── Cash
│   └── Cheque
│
├── Expenses
│
├── Payroll
│
├── Tax & Insurance
│
├── Fixed Assets
│
├── Documents
│
├── Reporting
│
└── Agent Layer
```

---

# 3. Organization / Tenant Domain

## Company / Tenant

شرکت، مرز اصلی داده‌های کسب‌وکار است.

تمام داده‌های مالی باید متعلق به یک Tenant مشخص باشند.

```text
Tenant
 ├── Users
 ├── Accounts
 ├── Customers
 ├── Suppliers
 ├── Products
 ├── Warehouses
 ├── Transactions
 └── Reports
```

### Business Rules

- اطلاعات یک Tenant نباید در Tenant دیگری قابل مشاهده باشد.
- تمام عملیات مالی باید به یک Tenant مشخص تعلق داشته باشد.
- Tenant در MVP معادل شرکت مشتری است.
- معماری باید امکان Multi-company / Multi-tenant گسترده‌تر را در آینده حفظ کند.

---

# 4. Identity & Access Domain

## User

کاربر سیستم.

اطلاعات پایه:

- Identity
- Credentials
- Status
- Role

در MVP:

```text
User → one Company
```

ولی مدل نباید به شکلی طراحی شود که اضافه‌کردن Membership چندگانه در آینده سخت شود.

## Role

نقش کاربر.

Roles اصلی MVP:

```text
System Admin
Accountant
Sales
Purchase
Warehouse
Financial Manager
CEO / Manager
```

## Permission

مجوز دسترسی به قابلیت‌ها و عملیات.

اصل مهم:

```text
Accountant ≠ System Administrator
```

حسابدار تقریباً تمام عملیات مالی را انجام می‌دهد، ولی مدیریت زیرساخت سیستم و Permissionها وظیفه System Admin است.

---

# 5. Financial Configuration Domain

## Fiscal Year

سال مالی شرکت.

## Accounting Period

دوره مالی داخل سال.

Relationship:

```text
Fiscal Year
   └── Accounting Periods
```

### Rules

- عملیات مالی باید متعلق به یک دوره باشد.
- دوره بسته‌شده نباید تراکنش جدید دریافت کند.
- بستن دوره باید بعد از کنترل‌های لازم انجام شود.

---

# 6. Chart of Accounts Domain

## Account

حساب حسابداری.

مثلاً:

```text
Assets
Liabilities
Equity
Revenue
Expense
```

هر حساب می‌تواند ساختار سلسله‌مراتبی داشته باشد.

```text
Assets
 ├── Current Assets
 │    ├── Cash
 │    └── Bank
 └── Inventory
```

## Account Group

دسته‌بندی حساب‌ها.

## Cost Center

مرکز هزینه.

## Project / Analytical Dimension

برای توسعه آینده.

مدل حسابداری نباید صرفاً روی یک Chart of Accounts ثابت Hard-code شود.

---

# 7. Accounting Document Domain

## Journal Voucher

سند حسابداری.

ساختار:

```text
Journal Voucher
 ├── Header
 └── Lines
       ├── Account
       ├── Debit
       ├── Credit
       └── Dimensions
```

## State

```text
Draft
  ↓
Approved / Ready
  ↓
Posted
```

### مهم‌ترین Rule

بعد از Posted شدن:

```text
NO DELETE
NO EDIT
NO UNDO
```

سند ثبت‌شده immutable است.

اگر اشتباهی وجود داشته باشد، اصلاح از طریق یک رویداد/سند جدید انجام می‌شود که رابطه‌اش با سند اصلی قابل ردیابی است.

این Rule یکی از پایه‌های Audit سیستم خواهد بود.

---

# 8. Sales Domain

## Customer

مشتری.

## Sales Invoice

فاکتور فروش.

ساختار:

```text
Sales Invoice
 ├── Customer
 ├── Date
 ├── Items
 ├── Taxes
 ├── Discounts
 └── Total
```

## Receivable

طلب شرکت از مشتری.

Relationship:

```text
Invoice
 ↓
Receivable
 ↓
Receipt
```

---

# 9. Purchase Domain

## Supplier

تأمین‌کننده.

## Purchase Invoice

فاکتور خرید.

## Payable

بدهی شرکت به Supplier.

Relationship:

```text
Purchase Invoice
 ↓
Payable
 ↓
Payment
```

---

# 10. Inventory Domain

این Domain در MVP مهم است.

## Product

کالا.

حداقل:

- Code
- Name
- Unit
- Category
- Status

## Warehouse

انبار.

در MVP یک Company می‌تواند چند Warehouse داشته باشد.

```text
Company
 ├── Warehouse A
 ├── Warehouse B
 └── Warehouse C
```

## Inventory Movement

هر تغییر موجودی یک Movement ایجاد می‌کند.

انواع:

```text
Receipt
Issue
Transfer
Return
Adjustment
```

## Inventory Balance

موجودی فعلی هر کالا در هر انبار.

---

# 11. Inventory Valuation

سیستم باید مفهوم مستقل برای روش ارزش‌گذاری موجودی داشته باشد.

روش‌های قابل پشتیبانی:

```text
FIFO
LIFO
Weighted Average
```

در MVP فقط ریال داریم، اما Domain باید طوری باشد که Currency بعداً بدون بازطراحی کل Inventory اضافه شود.

### پیشنهاد مدل

```text
Inventory
 ├── Quantity
 ├── Cost
 ├── Valuation Method
 └── Cost Layers
```

برای FIFO/LIFO وجود Cost Layer ضروری است.

مثلاً:

```text
Purchase A
100 units @ 1000
       ↓
Layer 1

Purchase B
100 units @ 1200
       ↓
Layer 2
```

فروش باعث مصرف Layerهای مربوط به روش انتخاب‌شده می‌شود.

---

# 12. Currency Domain

در MVP:

```text
Currency = IRR
```

اما Amount در Domain نباید صرفاً یک عدد خام باشد.

Conceptual model:

```text
Money
 ├── Amount
 └── Currency
```

در نتیجه بعداً بتوان:

```text
IRR
USD
EUR
...
```

را اضافه کرد بدون اینکه تمام Domain بازنویسی شود.

در MVP:

- یک ارز فعال
- بدون Multi-Currency Transaction
- بدون FX پیچیده

ولی Foundation آن وجود دارد.

---

# 13. Treasury Domain

## Bank Account

حساب بانکی شرکت.

## Cash Account

صندوق.

## Bank Transaction

تراکنش بانک.

## Receipt

دریافت.

## Payment

پرداخت.

## Transfer

انتقال بین حساب‌ها.

## Cheque

چک.

---

# 14. Reconciliation Domain

مغایرت‌گیری باید Entity/Concept مستقل باشد.

## Reconciliation

فرایند تطبیق دو مجموعه داده.

مثلاً:

```text
Bank Transaction
       ↕
Accounting Entry
```

یا:

```text
Payment
       ↕
Purchase Invoice
```

یا:

```text
Receipt
       ↕
Sales Invoice
```

### Result

هر تطبیق می‌تواند:

```text
Matched
Probable Match
Unmatched
Conflict
Duplicate Candidate
```

باشد.

---

# 15. Expense Domain

## Expense

هزینه.

## Expense Document

سند/رسید هزینه.

Relationship:

```text
Document
 ↓
Expense
 ↓
Accounting Entry
```

Expense می‌تواند به:

- Account
- Cost Center
- Project

متصل شود.

---

# 16. Payroll Domain

Payroll یعنی حقوق و دستمزد.

## Employee

کارمند.

## Payroll Record

محاسبه حقوق یک دوره.

## Payroll Item

جزئیات:

- Base Salary
- Benefits
- Deductions
- Taxes
- Insurance

Relationship:

```text
Employee
 ↓
Payroll
 ↓
Accounting
 ↓
Insurance / Tax
```

Payroll در MVP وجود دارد ولی HR کامل نیست.

---

# 17. Tax & Insurance Domain

این Domain باید تا حد امکان از Core Accounting جدا باشد.

چون قوانین و Integrationهای بیرونی قابل تغییرند.

```text
Accounting
     ↓
Tax / Insurance Data
     ↓
Compliance Workflow
     ↓
External System
```

هدف این است که تغییر قوانین یا Integration خارجی، هسته حسابداری را مجبور به تغییر شدید نکند.

---

# 18. Fixed Asset Domain

## Fixed Asset

دارایی ثابت.

## Asset Category

طبقه‌بندی.

## Depreciation

استهلاک.

Lifecycle:

```text
Acquire
 ↓
Active
 ↓
Depreciating
 ↓
Transferred / Sold / Disposed
```

---

# 19. Document Domain

Document یک مفهوم مستقل و Cross-Cutting است.

Types:

```text
PDF
Image
Excel
Manual Document
```

Document می‌تواند به:

- Invoice
- Expense
- Payment
- Purchase
- Sales
- Payroll
- Tax
- Insurance

متصل باشد.

---

# 20. Agent Domain

Agent نباید مستقیماً Entityهای مختلف را بدون کنترل تغییر دهد.

## Agent Task

درخواست کاربر برای Agent.

## Agent Plan

طرح عملیاتی Agent.

مثلاً:

```text
Agent Task:
"این فاکتور رو ثبت کن"

Agent Plan:

1. Identify Supplier
2. Extract Invoice
3. Match Products
4. Validate Amount
5. Create Purchase
6. Update Inventory
7. Create Payable
8. Create Accounting Entry
```

## Plan Action

هر Plan چند Action دارد.

```text
Plan
 ├── Action 1
 ├── Action 2
 ├── Action 3
 └── Action 4
```

---

# 21. Agent Plan Lifecycle

```text
Draft
 ↓
Prepared
 ↓
Awaiting Approval
 ↓
Approved
 ↓
Executing
 ↓
Completed
```

یا:

```text
Rejected
Cancelled
Failed
```

### مهم‌ترین Rule

کاربر بتواند قبل از Approval Plan را Edit کند.

مثلاً:

```text
Agent:
Account = 5102

User:
Account = 5105
```

سپس:

```text
Approve
```

و کل Plan با نسخه‌ی تأییدشده اجرا می‌شود.

---

# 22. Atomic Execution Rule

اگر Agent یک Plan چندمرحله‌ای پیشنهاد داد:

```text
Extract
→ Match
→ Inventory
→ Payable
→ Accounting
```

کاربر فقط یک بار تأیید می‌کند.

سیستم باید:

- کل Plan را طبق نسخه تأییدشده اجرا کند.
- هیچ تغییر پنهانی بعد از Approval ایجاد نکند.
- نتیجه هر Action را ثبت کند.
- در صورت شکست، وضعیت Plan کاملاً مشخص باشد.
- اجرای ناقص نباید بدون اطلاع کاربر باقی بماند.

---

# 23. Agent Source of Truth

Agent نباید جای Domain Rules را بگیرد.

مثلاً Agent می‌تواند بگوید:

> «این کالا را از انبار A کم کن.»

ولی Domain باید بررسی کند:

- آیا کالا وجود دارد؟
- آیا انبار معتبر است؟
- آیا موجودی کافی است؟
- آیا دوره باز است؟
- آیا کاربر Permission دارد؟
- آیا عملیات از نظر حسابداری معتبر است؟

پس:

```text
Agent
  ↓
Proposal
  ↓
Domain Rules
  ↓
Execution
```

نه:

```text
Agent
  ↓
Direct Database Change
```

---

# 24. Master Data

Master Dataهای اصلی:

```text
Customer
Supplier
Product
Warehouse
Account
Employee
Bank Account
Cash Account
Tax Profile
Cost Center
```

این داده‌ها باید از Transactionها جدا باشند.

---

# 25. Business Rules — Core

## BR-001

تمام تراکنش‌های مالی متعلق به یک Tenant هستند.

## BR-002

عملیات مالی باید در سال و دوره مالی معتبر قرار بگیرد.

## BR-003

دوره بسته‌شده قابل تراکنش جدید نیست.

## BR-004

سند Posted قابل ویرایش نیست.

## BR-005

سند Posted حذف نمی‌شود.

## BR-006

اصلاح عملیات ثبت‌شده از طریق عملیات/سند جدید انجام می‌شود.

## BR-007

هر Journal Voucher باید از نظر Debit/Credit معتبر باشد.

## BR-008

تغییر موجودی باید از طریق Inventory Movement انجام شود.

## BR-009

موجودی باید قابل ردیابی باشد.

## BR-010

روش ارزش‌گذاری موجودی باید مشخص باشد.

## BR-011

تمام عملیات حساس مالی باید Audit Trail داشته باشند.

## BR-012

Agent نمی‌تواند بدون Approval عملیات مالی مؤثر انجام دهد.

## BR-013

Agent فقط می‌تواند در محدوده Permission کاربر عمل کند.

## BR-014

Agent Plan بعد از Approval نباید بدون اطلاع کاربر تغییر کند.

## BR-015

هر Action اجراشده توسط Agent باید قابل Trace باشد.

---

# 26. Business Rules — Inventory

## BR-020

موجودی هر کالا برای هر Warehouse قابل محاسبه است.

## BR-021

هر Movement باید Source مشخص داشته باشد.

مثلاً:

```text
Purchase
Sale
Transfer
Return
Adjustment
```

## BR-022

Transfer بین دو Warehouse باید خروج و ورود متناظر ایجاد کند.

## BR-023

موجودی منفی باید بر اساس Policy شرکت کنترل شود.

## BR-024

ارزش موجودی از روش Valuation مشخص‌شده پیروی می‌کند.

---

# 27. Business Rules — Sales & Purchase

## BR-030

هر Sales Invoice به Customer متصل است.

## BR-031

هر Purchase Invoice به Supplier متصل است.

## BR-032

Invoice می‌تواند اثر حسابداری داشته باشد.

## BR-033

Invoice فروش می‌تواند اثر موجودی داشته باشد.

## BR-034

Invoice خرید می‌تواند اثر موجودی داشته باشد.

## BR-035

Receivable و Payable باید قابل ردیابی تا سند مبنا باشند.

---

# 28. Business Rules — Money

تمام Monetary Values در Domain دارای:

```text
Amount
Currency
```

هستند.

MVP فقط:

```text
IRR
```

را فعال می‌کند.

---

# 29. Business Rules — Audit

برای عملیات حساس باید ثبت شود:

```text
Who
What
When
Before
After
Source
Reason
```

برای Agent علاوه بر این:

```text
Agent
Prompt / Request
Plan
Approved Plan
Executed Actions
Result
```

---

# 30. Domain Relationships

نمای کلی:

```text
Tenant
│
├── Users
├── Fiscal Years
│     └── Periods
│
├── Accounts
├── Customers
├── Suppliers
├── Products
├── Warehouses
├── Bank Accounts
├── Cash Accounts
├── Employees
│
├── Sales Invoices
│     └── Receivables
│
├── Purchase Invoices
│     └── Payables
│
├── Inventory Movements
│
├── Payments / Receipts
│
├── Journal Vouchers
│     └── Voucher Lines
│
├── Fixed Assets
│
└── Agent Tasks
       └── Agent Plans
              └── Plan Actions
```

---

# 31. Design Principles Derived from the Domain

### Principle 1

Operational data و Accounting data باید مرتبط باشند، ولی یکی نباشند.

مثلاً:

```text
Sales Invoice
      ↓
Accounting Entry
```

نه اینکه Sales Invoice خودش Journal Voucher باشد.

### Principle 2

Agent یک لایه بالای Domain است، نه جایگزین Domain.

### Principle 3

Compliance مستقل از Core Accounting مدل می‌شود.

### Principle 4

Currency از روز اول در مدل وجود دارد، حتی اگر MVP فقط ریال داشته باشد.

### Principle 5

Inventory Valuation یک Capability قابل تغییر است.

### Principle 6

Purchase و Sales در MVP ساده‌اند، ولی Lifecycle آن‌ها باید طوری باشد که Workflowهای پیچیده‌تر بعداً بتوانند اضافه شوند.

### Principle 7

Posted Financial Records Immutable هستند.

---

# 32. MVP Domain Boundary

### داخل MVP

```text
Tenant
Users / Roles
Fiscal Year / Period
Chart of Accounts
Accounting
Sales
Purchase
Inventory
Cash
Bank
Cheque
Expenses
Payroll
Tax
Insurance
Fixed Assets
Documents
Reports
Reconciliation
Agents
Audit
```

### خارج از MVP

```text
Manufacturing
CRM
Advanced Project Management
Advanced Consolidation
Complex Multi-Currency
Advanced Treasury
Autonomous Agent Execution
```

این موارد در معماری قابل افزودن باقی می‌مانند.
