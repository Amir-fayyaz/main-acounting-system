# Phase 2 — Business Process Discovery

## 1. هدف این مرحله

هدف، شناسایی جریان‌های واقعی اطلاعات، پول و عملیات در یک شرکت بازرگانی و مشخص‌کردن کارهایی است که:

1. سیستم باید انجام دهد.
2. کاربر باید انجام دهد.
3. Agent می‌تواند انجام دهد.
4. انسان باید تصمیم نهایی آن را بگیرد.
5. نیازمند کنترل و تأیید است.

در این مرحله هنوز درباره UI، API، Database یا User Story تصمیم نمی‌گیریم.

---

# 2. مدل کلی عملیات شرکت

مدل اصلی شرکت را می‌توان به این شکل دید:

```text
                 COMPANY
                    │
       ┌────────────┼────────────┐
       │            │            │
     SALES        PURCHASE     PEOPLE
       │            │            │
       ↓            ↓            ↓
    Customer     Supplier     Employees
       │            │            │
       └──────┬─────┘            │
              ↓                  ↓
          Cash / Bank        Payroll / Insurance
              │                  │
              └────────┬─────────┘
                       ↓
                 ACCOUNTING
                       │
              ┌────────┼────────┐
              ↓        ↓        ↓
          Reporting  Control   Compliance
```

انبار و اسناد ورودی نیز به چند جریان بالا متصل می‌شوند.

---

# 3. Process Map

برای MVP این فرایندهای اصلی را داریم:

## P01 — Company & Accounting Setup

راه‌اندازی اولیه شرکت:

```text
Create Company
    ↓
Fiscal Year
    ↓
Accounting Periods
    ↓
Chart of Accounts
    ↓
Customers
Suppliers
Products
Warehouses
Banks
Cash Accounts
    ↓
Opening Balances
```

### کارهای تکراری / Agent Candidate

- وارد کردن Master Data از Excel
- تشخیص داده‌های تکراری
- پیشنهاد دسته‌بندی حساب‌ها
- بررسی ناقص بودن اطلاعات
- پیشنهاد Mapping اطلاعات واردشده با ساختار سیستم

### Human Checkpoint

تأیید اطلاعات اولیه قبل از استفاده عملیاتی.

---

# P02 — Purchase to Pay

فرآیند خرید تا پرداخت:

```text
Need / Purchase
      ↓
Supplier
      ↓
Purchase Document
      ↓
Invoice
      ↓
Receive Goods
      ↓
Inventory
      ↓
Payable
      ↓
Payment
      ↓
Bank / Cash
      ↓
Accounting
```

### کارهای تکراری

- ورود فاکتور خرید
- استخراج اطلاعات فاکتور
- پیدا کردن Supplier
- تطبیق کالا
- کنترل مبلغ
- کنترل مالیات
- پیشنهاد حساب‌های بدهکار/بستانکار
- ایجاد سند
- ثبت بدهی
- بررسی پرداخت
- تطبیق پرداخت با بدهی

### Agent Candidates

**Invoice Agent**

فاکتور PDF / تصویر / Excel را می‌خواند و اطلاعات ساختارمند استخراج می‌کند.

**Accounting Agent**

بر اساس اطلاعات معامله، سند پیشنهادی ایجاد می‌کند.

**Matching Agent**

فاکتور، دریافت کالا، پرداخت و سند حسابداری را به هم مرتبط می‌کند.

### Human Checkpoint

حسابدار می‌تواند موارد زیر را بررسی کند:

- Supplier
- کالا
- مبلغ
- مالیات
- حساب‌ها
- سند پیشنهادی

سپس:

```text
Approve
```

و عملیات اجرا می‌شود.

---

# P03 — Sales to Cash

فرآیند فروش تا دریافت وجه:

```text
Customer
    ↓
Sale
    ↓
Invoice
    ↓
Receivable
    ↓
Payment
    ↓
Bank / Cash
    ↓
Accounting
```

### کارهای تکراری

- ثبت فاکتور
- تشخیص مشتری
- ثبت اقلام
- محاسبه مبالغ
- ثبت حساب دریافتنی
- تطبیق پرداخت با فاکتور
- ثبت دریافت
- ثبت سند
- کنترل مانده مشتری

### Agent Candidates

- Invoice Agent
- Customer Matching Agent
- Collection Matching Agent
- Accounting Agent
- Receivable Control Agent

### Human Checkpoint

قبل از اجرای عملیات مالی حساس، کاربر عملیات پیشنهادی را تأیید می‌کند.

---

# P04 — Inventory

جریان کالا:

```text
Purchase
   ↓
Goods Receipt
   ↓
Warehouse
   ↓
Inventory
   ↓
Sale
   ↓
Goods Issue
```

و:

```text
Warehouse A
   ↓
Transfer
   ↓
Warehouse B
```

### کارهای تکراری

- ثبت ورود
- ثبت خروج
- انتقال
- کنترل موجودی
- تطبیق موجودی با فروش
- تطبیق موجودی با خرید
- پیدا کردن مغایرت

### Agent Candidates

- تشخیص کالا از فاکتور
- Mapping کالاها
- کنترل موجودی
- تشخیص موجودی غیرعادی
- پیدا کردن مغایرت بین خرید، فروش و انبار

### Human Checkpoint

تأیید اصلاحات مهم موجودی.

---

# P05 — Cash & Bank

این یکی از مهم‌ترین فرآیندهای Agent محور محصول است.

```text
Bank Transaction
      ↓
Read
      ↓
Classify
      ↓
Match
      ↓
Reconciliation
      ↓
Accounting
```

### کارهای تکراری

- دریافت اطلاعات تراکنش
- دسته‌بندی تراکنش
- پیدا کردن سند مرتبط
- تطبیق با مشتری
- تطبیق با Supplier
- تطبیق با فاکتور
- تشخیص تراکنش بدون سند
- تشخیص تراکنش تکراری
- مغایرت‌گیری

### Agent Candidate

**Bank Reconciliation Agent**

مثلاً:

```text
17 transactions found

12 matched automatically
3 probable matches
1 unmatched
1 duplicate candidate
```

و بعد:

```text
Agent Proposal
      ↓
Accountant Review
      ↓
Approve
      ↓
Execute
```

---

# P06 — Expense Management

```text
Expense Document
      ↓
Extract
      ↓
Classify
      ↓
Account Mapping
      ↓
Approval
      ↓
Payment
      ↓
Accounting
```

### کارهای تکراری

- ثبت هزینه
- استخراج اطلاعات رسید
- دسته‌بندی هزینه
- انتخاب حساب
- ثبت سند
- کنترل سقف/قواعد
- تطبیق پرداخت

### Agent Candidates

- Receipt Agent
- Expense Classification Agent
- Accounting Agent

---

# P07 — Accounting Operations

هسته مالی:

```text
Transaction
    ↓
Accounting Entry
    ↓
Journal
    ↓
Ledger
    ↓
Trial Balance
    ↓
Financial Reports
```

### عملیات

- ایجاد سند
- اصلاح سند
- تأیید سند
- ثبت نهایی
- معکوس‌کردن سند
- جستجو
- مشاهده گردش حساب
- کنترل تراز

### Agent Candidates

**Accounting Agent**

می‌تواند بر اساس یک رویداد مالی، سند پیشنهادی بسازد.

مثلاً:

```text
User:
فاکتور خرید فلان Supplier را ثبت کن.

Agent:
Supplier detected.
Invoice detected.
3 items detected.
Total = ...
Tax = ...

Proposed accounting entries:
...

[Approve]
```

---

# P08 — Reconciliation & Controls

یکی از قابلیت‌های اصلی محصول باید «پیدا کردن چیزهایی که اشتباه یا ناقص هستند» باشد.

کنترل‌های احتمالی:

```text
Bank ↔ Accounting

Invoice ↔ Payment

Purchase ↔ Inventory

Sales ↔ Inventory

Customer ↔ Receivable

Supplier ↔ Payable

Inventory ↔ Accounting
```

### Agent Candidates

**Control Agent**

به جای اینکه حسابدار تک‌تک اطلاعات را بررسی کند، سیستم موارد مشکوک را پیدا کند.

مثلاً:

```text
⚠ 3 invoices without accounting entry
⚠ 2 bank transactions without matching
⚠ 1 duplicate invoice
⚠ 4 customer balances require review
```

این بخش احتمالاً یکی از ارزشمندترین بخش‌های محصول خواهد بود.

---

# P09 — Period Closing

در پایان دوره مالی:

```text
Review Transactions
      ↓
Reconciliation
      ↓
Missing Documents
      ↓
Unposted Entries
      ↓
Outstanding Receivables
      ↓
Outstanding Payables
      ↓
Adjustments
      ↓
Close Period
```

### Agent Opportunity

**Closing Agent**

مثلاً:

```text
Closing Readiness: 82%

Problems:
3 unmatched bank transactions
2 unposted invoices
1 missing document
4 accounts require review
```

بعد حسابدار مشکلات را بررسی می‌کند.

---

# P10 — Management Reporting

گزارش‌ها باید از داده‌های عملیاتی تولید شوند، نه اینکه مستقل از سیستم باشند.

### مدیرعامل

تمرکز روی:

```text
Cash
Sales
Receivables
Payables
Expenses
Profitability
Upcoming Payments
Upcoming Collections
Alerts
```

### مدیر مالی

تمرکز روی:

```text
Accounting Status
Reconciliation
Exceptions
Approvals
Financial Reports
Outstanding Items
Period Closing
Agent Activity
```

---

# P11 — Payroll / Insurance

این جریان را در Domain جدا نگه می‌داریم:

```text
Employees
   ↓
Payroll Calculation
   ↓
Payroll Record
   ↓
Accounting
   ↓
Insurance / Tax
   ↓
Payment
```

ارسال لیست بیمه را نیز یک Workflow خارجی/Compliance در نظر می‌گیریم. در حال حاضر سازمان تأمین اجتماعی انجام فرایند ارسال لیست و پرداخت حق بیمه کارفرمایان را از طریق سامانه خدمات غیرحضوری خود پشتیبانی می‌کند.

### Agent Candidates

- جمع‌آوری اطلاعات
- کنترل ناقص بودن اطلاعات
- آماده‌سازی لیست
- کنترل مغایرت
- آماده‌سازی عملیات ارسال

در MVP لازم نیست Agent بدون کنترل انسانی عملیات قانونی حساس را نهایی کند.

---

# P12 — Tax / Electronic Invoice

این بخش را نیز جدا از Core Accounting مدل می‌کنیم:

```text
Sales / Purchase
      ↓
Tax Relevant Transaction
      ↓
Invoice Data
      ↓
Validation
      ↓
Electronic Invoice Workflow
      ↓
Tax Records
```

صورتحساب الکترونیکی و تعامل با سامانه مؤدیان باید به‌عنوان یک Integration/Compliance Workflow مستقل دیده شود، نه صرفاً یک فرم فاکتور داخل سیستم. سازمان امور مالیاتی نیز سامانه مؤدیان و فرایند صورتحساب الکترونیکی را به‌عنوان بخشی از نظام مالیاتی کشور دنبال می‌کند.

---

# P13 — Document Management

تمام عملیات بالا به Document وابسته هستند.

ورودی‌های MVP:

```text
PDF
Image
Excel
Manual Entry
```

فرایند:

```text
Upload
  ↓
Identify
  ↓
Extract
  ↓
Validate
  ↓
Match
  ↓
Suggest Action
  ↓
Human Approval
  ↓
Execute
```

این باید یکی از Foundationهای محصول باشد، چون چندین Agent از آن استفاده خواهند کرد.

---

# 4. یک الگوی مشترک برای همه Agentها

Agentهای محصول نباید هرکدام UX متفاوتی داشته باشند.

الگوی استاندارد:

```text
USER REQUEST
     ↓
AGENT UNDERSTANDS
     ↓
AGENT GENERATES PLAN
     ↓
SYSTEM SHOWS PLAN
     ↓
USER APPROVES
     ↓
AGENT EXECUTES
     ↓
SYSTEM VALIDATES RESULT
     ↓
AUDIT LOG
```

مثلاً:

```text
Task:
"تراکنش‌های بانک امروز رو بررسی کن"

Agent:

Found: 32 transactions

Will perform:
✓ Match 21 transactions
✓ Create 5 accounting entries
✓ Flag 4 transactions for review
✓ Mark 2 transactions as duplicate candidates

Potential impact:
5 accounting entries will be created.

[Approve & Execute]
```

---

# 5. طبقه‌بندی کارها

از اینجا به بعد هر فعالیتی را در یکی از این چهار گروه قرار می‌دهیم:

### A — Manual

کار کاملاً انسانی است.

مثلاً تصمیم درباره یک مورد غیرعادی.

### B — Agent Assisted

Agent آماده می‌کند، انسان تصمیم می‌گیرد.

```text
Agent → Prepare
Human → Decide
```

### C — Agent Executed with Approval

مدل اصلی MVP:

```text
Agent → Plan
Human → Approve
Agent → Execute
```

### D — Automated

فقط برای کارهای کم‌ریسک و کاملاً مشخص.

```text
Rule → Execute
```

در MVP بیشترین تمرکز ما روی **B و C** خواهد بود.

---

# 6. مهم‌ترین Agent Opportunities در MVP

من فعلاً این‌ها را کاندید اصلی می‌دانم:

| Agent                     | ورودی                | خروجی                 |
| ------------------------- | -------------------- | --------------------- |
| Document Agent            | PDF/Image            | اطلاعات ساختاریافته   |
| Invoice Agent             | Invoice              | اطلاعات فاکتور        |
| Import Agent              | Excel                | Records               |
| Accounting Agent          | Transaction          | Accounting Entry      |
| Bank Reconciliation Agent | Bank Transactions    | Matches / Exceptions  |
| Receivable Agent          | Sales + Payments     | Matching / Exceptions |
| Payable Agent             | Purchases + Payments | Matching / Exceptions |
| Control Agent             | Financial Data       | Errors / Exceptions   |
| Closing Agent             | Period Data          | Closing Checklist     |
| Reporting Agent           | Financial Data       | Management Insights   |

---

# 7. Golden Flows برای MVP

برای اینکه MVP کنترل شود، من پیشنهاد می‌کنم اول این پنج جریان را به‌عنوان مسیرهای مرجع تعریف کنیم:

## Golden Flow 1 — ثبت فاکتور خرید

```text
PDF/Image/Excel
       ↓
Document Agent
       ↓
Invoice Data
       ↓
Supplier Matching
       ↓
Product Matching
       ↓
Tax / Amount Validation
       ↓
Accounting Suggestion
       ↓
Human Approval
       ↓
Execute
       ↓
Payable + Inventory + Accounting
```

## Golden Flow 2 — فروش

```text
Sales
 ↓
Invoice
 ↓
Receivable
 ↓
Accounting
```

با Agent برای ورود، کنترل و ثبت.

## Golden Flow 3 — دریافت/پرداخت

```text
Bank Transaction
 ↓
Matching
 ↓
Proposal
 ↓
Approval
 ↓
Accounting
```

## Golden Flow 4 — مغایرت‌گیری بانک

```text
Bank
 ↓
Transactions
 ↓
Matching
 ↓
Exceptions
 ↓
Human Review
```

## Golden Flow 5 — کنترل پایان دوره

```text
Period
 ↓
Control Agent
 ↓
Missing / Unmatched / Suspicious Items
 ↓
Resolve
 ↓
Close
```

---

# 8. چیزهایی که فعلاً خارج از MVP می‌گذاریم

برای اینکه MVP منفجر نشود، فعلاً این‌ها را Feature اصلی نمی‌کنیم:

```text
Manufacturing
Advanced Cost Accounting
Complex Consolidation
Multi-company Consolidation
Advanced Budgeting
Complex Foreign Exchange
Advanced Treasury
Advanced Payroll
Complex Import / Export
Large Integration Marketplace
Fully Autonomous Accounting
```

این‌ها حذف نمی‌شوند؛ فقط **Later** هستند.

---

# 9. معیار هر Process

از اینجا به بعد هر Process یک Checkpoint دارد.

## Speed

```text
Manual Time
vs
Agent-Assisted Time
```

## Consistency

```text
Input
vs
Output
```

و علاوه بر این دو معیار اصلی، برای هر Agent سه کنترل لازم داریم:

### Accuracy

آیا داده درست تشخیص داده شد؟

### Approval Rate

چند درصد پیشنهادها بدون اصلاح تأیید شدند؟

### Exception Rate

چند درصد عملیات نیاز به دخالت جدی انسان داشتند؟

---

# 10. Definition of Done برای هر Agent

یک Agent زمانی موفق است که:

```text
□ Input را درست دریافت کند
□ اطلاعات موردنیاز را استخراج کند
□ اطلاعات ناقص را تشخیص دهد
□ تصمیم/پیشنهاد خود را توضیح دهد
□ عملیات پیشنهادی را به کاربر نشان دهد
□ کاربر بتواند Approve / Reject / Edit کند
□ پس از تأیید عملیات را اجرا کند
□ نتیجه را Validate کند
□ تمام عملیات ثبت و قابل Audit باشد
□ سرعت را نسبت به روش دستی بهبود دهد
□ Consistency قابل اندازه‌گیری داشته باشد
```
