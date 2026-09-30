# راهنمای مشارکت در پروژه Accounting SaaS

از علاقه شما به مشارکت در پروژه متشکریم. 🌱

این پروژه در حال توسعه نسخه ۱ است و هنوز برای استفاده تجاری عمومی آماده نیست.

معماری، دامنه محصول و قواعد مهندسی در این نسخه به‌صورت رسمی مستند شده‌اند؛ بنابراین هر تغییر باید با این مستندات هماهنگ باشد.

برای مشارکت در پروژه، رعایت [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) الزامی است.

---

## فهرست مطالب

- [روش‌های مشارکت](#روشهای-مشارکت)
- [قبل از شروع](#قبل-از-شروع)
- [گزارش خطا](#گزارش-خطا)
- [پیشنهاد قابلیت](#پیشنهاد-قابلیت)
- [فرایند توسعه](#فرایند-توسعه)
- [ساختار Issue و Task](#ساختار-issue-و-task)
- [قواعد معماری](#قواعد-معماری)
- [ساختار Module](#ساختار-module)
- [استانداردهای کدنویسی](#استانداردهای-کدنویسی)
- [الزامات تست](#الزامات-تست)
- [مستندات](#مستندات)
- [فرایند Pull Request](#فرایند-pull-request)
- [نسخه‌بندی](#نسخهبندی)
- [مجوز](#مجوز)

---

## روش‌های مشارکت

برای کمک به پروژه الزاماً لازم نیست کد بنویسید:

- 🐛 گزارش خطا با مراحل قابل بازتولید
- 💡 پیشنهاد قابلیت با شرح مسئله و مورد استفاده
- 📖 بهبود مستندات
- 🧪 افزودن یا بهبود تست‌ها
- 🔍 بازبینی Pull Requestها
- 🧩 مشارکت در طراحی و Issue Breakdown

---

## قبل از شروع

### قانون اصلی

> **قبل از شروع کار جدی، Issue مربوطه باید وجود داشته باشد.**

در این پروژه، کار از این مسیر عبور می‌کند:

```text
User Story
    ↓
Issue
    ↓
Technical Task
    ↓
Implementation
    ↓
Test
    ↓
Review
    ↓
Done
```

ساختار Issue و Task باید با قواعد پروژه هماهنگ باشد و در زمان ایجاد آن‌ها، Scope، Context، معیارهای پذیرش و وابستگی‌ها به‌صورت شفاف مشخص شوند.

تغییرات کوچک مانند اصلاح تایپی یا مستندات محدود می‌توانند بدون Issue جداگانه انجام شوند، مشروط به اینکه Scope تغییر روشن باشد.

---

## گزارش خطا

برای گزارش خطا یک GitHub Issue ایجاد کنید و حداقل این موارد را بنویسید:

1. **رفتار واقعی** — چه اتفاقی افتاد؟
2. **رفتار مورد انتظار** — چه چیزی باید اتفاق می‌افتاد؟
3. **مراحل بازتولید** — کمترین مراحل لازم برای مشاهده خطا
4. **محیط اجرا** — نسخه Node، سیستم‌عامل، Docker و اطلاعات مرتبط
5. **Logs / Screenshots** — بدون Secret، داده واقعی مشتری یا اطلاعات حساس

اگر موضوع یک رخداد امنیتی است، طبق [`SECURITY.md`](SECURITY.md) عمل کنید و آن را به‌صورت عمومی در Issue ثبت نکنید.

---

## پیشنهاد قابلیت

برای قابلیت جدید، یک Issue ایجاد کنید و موارد زیر را مشخص کنید:

1. **مسئله کاربر** — چه کسی چه مشکلی دارد؟
2. **نتیجه مورد انتظار** — چه تغییری باید در رفتار محصول ایجاد شود؟
3. **راه‌حل پیشنهادی** — در سطح Product/Business
4. **اثر بر Domain** — آیا Domain، Business Rule یا State Machine تغییر می‌کند؟
5. **اثر بر Architecture** — آیا Module Boundary، Transaction، API، Event یا Integration تغییر می‌کند؟
6. **Scope و Out of Scope**
7. **معیارهای پذیرش**

اگر پیشنهاد باعث تغییر در Domain یا Architecture شود، ابتدا باید تصمیم مربوط در مستندات رسمی ثبت و تأیید شود.

---

# فرایند توسعه

## ۱. ابتدا Context را بخوانید

Developer یا Developer Agent نباید کل Repository را بدون هدف بخواند.

هر Issue باید Referenceهای موردنیاز خود را مشخص کند.

منابع اصلی پروژه:

```text
docs/product/v1/
```

لایه‌های اصلی:

```text
Product
Domain
Architecture
Engineering
Development Readiness
```

Issue باید از **Context Manifest** خود برای تعیین حداقل مستندات لازم استفاده کند.

---

## ۲. Branch

الگوی نام‌گذاری Branch:

```text
<type>/<short-kebab-description>
```

نمونه:

```text
feat/accounting-journal-posting
fix/inventory-negative-stock
refactor/party-module-boundary
test/sales-idempotency
docs/architecture-readme
chore/project-bootstrap
ci/test-pipeline
```

نوع‌های مجاز:

```text
feat
fix
docs
refactor
perf
test
chore
build
ci
```

Branchها باید کوتاه‌عمر باشند و فقط برای یک موضوع مشخص استفاده شوند.

---

## ۳. Commit

Commitها از **Conventional Commits** استفاده می‌کنند:

```text
<type>(<scope>): <short summary>
```

نمونه:

```text
feat(accounting): add journal posting use case
fix(inventory): prevent duplicate stock issue
docs(architecture): update transaction ADR
test(sales): add concurrent invoice test
chore(foundation): bootstrap docker environment
```

در صورت نیاز:

```text
<type>(<scope>): <summary>

Why:
توضیح کوتاه درباره دلیل تغییر

Refs:
ISS-001
```

برای تغییر ناسازگار باید Breaking Change به‌صورت شفاف مشخص شود.

---

# ساختار Issue و Task

Issue برای تعریف **چه چیزی باید ساخته شود** است.

Task برای تعریف **چه کار فنی باید انجام شود** است.

Issue نباید Business Rule یا Architecture را از خودش اختراع کند.

Issue باید به اسناد مرجع لینک بدهد.

مدل کلی:

```text
Issue
├── Objective
├── Scope
├── References
├── Implementation Contract
├── Behavior Contract
├── Acceptance Criteria
├── Verification
├── Dependencies
└── Definition of Done
```

Taskها باید:

- یک خروجی مشخص داشته باشند.
- قابل تست باشند.
- Scope مشخص داشته باشند.
- وابستگی‌هایشان مشخص باشد.
- از تصمیم‌های Domain و Architecture تخطی نکنند.

---

# قواعد معماری

قواعد زیر غیرقابل مذاکره‌اند و جزئیات کامل آن‌ها در `docs/product/v1/10-architecture/` ثبت شده است.

## معماری کل سیستم

محصول یک:

**Modular Monolith**

است.

ماژول‌ها مرز سخت دارند.

Microservices سبک معماری این محصول نیست.

## Module Boundary

یک Module هرگز نباید مستقیماً به:

- Entity داخلی Module دیگر
- Repository داخلی Module دیگر
- Table داخلی Module دیگر
- ORM Model داخلی Module دیگر

دسترسی داشته باشد.

ارتباط بین Moduleها از طریق Contractهای رسمی انجام می‌شود:

```text
Command
Query
Application / Domain Service Contract
Domain Event
```

## Domain

Domain نباید به این موارد وابستگی مستقیم داشته باشد:

```text
NestJS
ORM
HTTP
Redis
Queue
Provider SDK
File SDK
```

## Persistence

- Domain Entity و Persistence Model جدا هستند.
- هر Module مالک داده خودش است.
- Cross-Module Foreign Key ممنوع است.
- Foreign Key داخل همان Module مجاز است.
- Business Data حذف نمی‌شود.
- اصلاح داده مالی از طریق Correction / Reversal / Compensation انجام می‌شود.

## Transaction

Transaction بر اساس Business Consistency Boundary تعیین می‌شود.

برای عملیات حساس:

- Idempotency الزامی است.
- Retry باید کنترل‌شده باشد.
- Partial Execution نباید Silent باشد.
- Recovery باید قابل مشاهده باشد.

## Agent

Agent مالک حقیقت کسب‌وکار نیست.

Agent:

```text
Observe
→ Propose
→ Plan
→ Approval
→ Execute
→ Validate
```

Agent حق ندارد مستقیم Database یا Entityهای Domain را تغییر دهد.

## Integration

Providerهای خارجی فقط از مسیر:

```text
Port
→ Adapter
→ Provider
```

دسترسی دارند.

---

# ساختار Module

هر Module ساختار لایه‌ای دارد و درون هر لایه می‌تواند Feature-oriented باشد:

```text
<module>/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

قواعد مهم:

- `domain/` مالک منطق کسب‌وکار است.
- `application/` مسئول Use Case و Orchestration است.
- `infrastructure/` مسئول Adapterهای فنی است.
- `presentation/` مسئول API/UI boundary است.

Controller نباید مستقیماً Repository را صدا بزند.

---

# استانداردهای کدنویسی

- TypeScript با Strict Mode
- `any` ممنوع مگر با دلیل مستند
- `@ts-ignore` فقط با توضیح روشن و ضرورت واقعی
- Formatter و Linter رسمی پروژه مرجع هستند.
- Business Logic در Controller یا UI قرار نمی‌گیرد.
- Utility عمومی فقط در صورت داشتن abstraction مشخص ایجاد می‌شود.
- Naming، کد و شناسه‌ها به زبان انگلیسی هستند.
- متن‌های رابط کاربری باید با سیستم Localization هماهنگ باشند.
- یک فایل نباید بدون دلیل مسئولیت‌های متعدد و نامرتبط داشته باشد.
- وابستگی‌ها باید از قوانین Module پیروی کنند.

---

# الزامات تست

تست بخشی از خود Implementation است.

حداقل:

```text
Unit
Integration
E2E
Data Integrity
Security
```

برای تغییرات Domain:

- Unit Test مربوط به Rule و Invariant

برای تغییرات Persistence:

- Integration Test

برای تغییرات Cross-Module:

- Integration/E2E مناسب

برای Agent:

- Accuracy
- Approval Rate
- Execution Failure Rate
- Explainability
- Traceability

سناریوهای حیاتی پروژه شامل:

- Tenant Isolation
- Authorization
- Accounting Integrity
- Inventory Integrity
- Idempotency
- Recovery

هستند.

---

# مستندات

مرجع رسمی فعلی:

```text
docs/product/v1/
```

ساختار اصلی:

```text
01–07 Product
08 Detailed Backlog
09 Domain
10 Architecture
11 Engineering
12 Development Readiness
```

مستندات نسل قبلی که دیگر Source of Truth نیستند نباید به‌عنوان مرجع توسعه استفاده شوند.

اگر تغییر، یکی از موارد زیر را تغییر می‌دهد:

- Business Rule
- Domain Model
- Module Boundary
- Architecture Decision
- Public API
- Security Posture
- Agent Behavior

مستند مرتبط باید در همان تغییر به‌روزرسانی شود.

---

# بررسی‌های کیفیت

پیش از Review و Merge، چک‌های پایه باید موفق باشند. اجرای همهٔ آن‌ها با یک دستور:

```bash
pnpm verify
```

این دستور به ترتیب اجرا می‌کند و در اولین خطا با Exit Code غیرصفر متوقف می‌شود:

```text
1. Typecheck     pnpm typecheck
2. Lint          pnpm lint
3. Format Check  pnpm format:check
4. Tests         pnpm test
5. Build         pnpm build
```

نکات:

- گزارش شکست شامل **نام چک**، **دامنهٔ اجرای آن** و **دستور بازتولید** همان خطا است؛
  پکیج یا فایل دارای خطا در خروجیِ خود ابزار مشخص می‌شود (مثلاً
  `apps/backend typecheck: …` یا مسیر فایل در خروجی ESLint/Prettier).
- CI دقیقاً همین `pnpm verify` را اجرا می‌کند (`.github/workflows/ci.yml`)؛ چک‌ها
  بین توسعه محلی و CI تکرار نمی‌شوند.
- مرجع نهایی قالب‌دهی و Linter همان `Formatter و Linter رسمی پروژه` است؛ قانون جدید
  به `eslint.config.mjs` یا `.prettierrc.json` اضافه می‌شود، نه به پیکربندی CI.
- هیچ آستانهٔ درصد Coverage تعریف نشده است؛ Test صرفاً برای پوشش عددی نوشته نمی‌شود
  (`05-testing-strategy.md`).
- `Dependency/Security Checks` بخشی از حداقل CI
  (`09-ci-cd-and-development-workflow.md`) است و هنوز پیاده‌سازی نشده است.

---

# Pull Request

هر Pull Request باید:

1. Issue مرتبط داشته باشد.
2. Scope مشخص داشته باشد.
3. تست‌های لازم را داشته باشد.
4. نقض Architecture Boundary نداشته باشد.
5. Secret یا داده واقعی نداشته باشد.
6. در صورت نیاز Migration داشته باشد.
7. در صورت نیاز Audit/Observability را به‌روزرسانی کرده باشد.

### چک‌لیست پیشنهادی PR

```text
- [ ] Issue مرتبط مشخص شده است
- [ ] Scope تغییر محدود و مشخص است
- [ ] Acceptance Criteria پاس شده‌اند
- [ ] Tests اضافه/به‌روزرسانی شده‌اند
- [ ] Type Check موفق است
- [ ] Lint موفق است
- [ ] pnpm verify موفق است (Format / Tests / Build)
- [ ] Architecture Boundary نقض نشده است
- [ ] Cross-Module Internal Access وجود ندارد
- [ ] Secret یا داده واقعی وجود ندارد
- [ ] Migration در صورت نیاز وجود دارد
- [ ] Audit در صورت نیاز بررسی شده است
- [ ] Documentation در صورت نیاز به‌روزرسانی شده است
```

CI باید قبل از Merge موفق باشد؛ CI همان `pnpm verify` محلی را اجرا می‌کند.

Review برای تغییرات حساس Domain، Security و Architecture باید دقیق‌تر از تغییرات عادی باشد.

---

# نسخه‌بندی

پروژه از Semantic Versioning استفاده می‌کند:

```text
MAJOR.MINOR.PATCH
```

به‌طور کلی:

- `MAJOR` — تغییر ناسازگار
- `MINOR` — قابلیت جدید سازگار
- `PATCH` — رفع خطا یا تغییر سازگار

بعضی قراردادها نسخه مستقل دارند، از جمله:

```text
API
Database Schema
Domain Event
Agent
Rule
Adapter / Provider
Document Schema
```

---

# مجوز

این پروژه تحت مجوز MIT است.

برای جزئیات به [`LICENSE`](LICENSE) مراجعه کنید.

---

## قانون نهایی

اگر هنگام توسعه متوجه شدید Issue، Domain، Architecture یا Engineering برای انجام کار کافی نیست:

> **تصمیم را حدس نزنید.**

اول مشخص کنید چه تصمیمی کم است، مرجع مناسب را به‌روزرسانی کنید و سپس Implementation را ادامه دهید.

این پروژه ترجیح می‌دهد یک تغییر آگاهانه و قابل ردیابی داشته باشد تا یک Shortcut سریع که بعداً مرزهای سیستم را خراب کند.
