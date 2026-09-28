# مدل دامنه محصول — نقشه و اصول مشترک

## 1. هدف سند

این سند نقشه کلان دامنه محصول و اصولی را تثبیت می‌کند که بین دامنه‌ها مشترک‌اند. جزئیات هر دامنه در سند مستقل همان دامنه نگهداری می‌شود تا مطالعه و نگهداری آن مستقل باشد.

## 2. دامنه‌های اصلی

1. شرکت و دسترسی
2. طرف‌حساب
3. حسابداری
4. کالا و موجودی
5. خرید
6. فروش
7. بانک و خزانه
8. هزینه
9. حقوق و دستمزد
10. مالیات و صورتحساب الکترونیکی
11. دارایی ثابت
12. Agent و برنامه عملیاتی
13. اسناد و فایل‌ها
14. گزارش‌گیری
15. اعلان‌ها

## 3. اصول دامنه

- هر دامنه مالک داده و وضعیت‌های مربوط به خودش است.
- هیچ دامنه‌ای مستقیماً Entity دامنه دیگر را تغییر نمی‌دهد.
- تعامل بین دامنه‌ها از طریق Command، Service، Query/Read Contract و Domain Event انجام می‌شود.
- Accounting مرجع نهایی اثر مالی ثبت‌شده است، اما مالک فرآیند کسب‌وکار نیست.
- اسناد ثبت‌شده مالی و عملیات قطعی مالی قابل ویرایش مستقیم نیستند؛ اصلاح از طریق عملیات اصلاحی یا Reverse انجام می‌شود.
- Agent مالک داده کسب‌وکاری نیست و فقط Observation، Proposal، Plan و Execution را هدایت می‌کند.
- Action Plan یک مفهوم دامنه مستقل است.
- Domain Eventهای مهم رسمی و قابل واکنش هستند.
- Fiscal Year و Fiscal Period روی همه عملیات مالی اثر دارند و Domain Object مستقل‌اند.
- Amount همیشه با Currency و سیاست Precision/Rounding مدل می‌شود.
- Business Date، Accounting Date، Created At و Posted At از هم تفکیک می‌شوند.
- هر دامنه State Machine خودش را دارد؛ الگوی کلی چرخه عمر می‌تواند مشترک باشد ولی وضعیت‌ها مستقل‌اند.
- تاریخچه تغییرات، روابط علت و معلولی و آثار مالی باید قابل ردیابی باشند.

## 4. الگوی لایه‌ای مفهومی عملیات

برای عملیات مالی مهم، مدل مفهومی به شکل زیر است:

```text
Business Transaction
        ↓
Accounting Effect
        ↓
Accounting Document
```

Business Transaction توسط دامنه کسب‌وکار مالک آن تعریف می‌شود، Accounting Effect اثر مالی را بیان می‌کند و Accounting Document ثبت قطعی حسابداری را نمایندگی می‌کند.

## 5. اصول اصلاح

برای عملیات ثبت‌شده، حداقل این الگوها پشتیبانی می‌شوند:

- Correction: ایجاد عملیات اصلاحی بر اساس دلیل اصلاح
- Reversal: ایجاد عملیات معکوس مرتبط با عملیات اصلی
- Compensating Transaction: جبران اثر قبلی بدون تغییر سابقه اصلی

اصل عمومی این است که سابقه اصلی حذف یا ویرایش پنهانی نشود و رابطه بین عملیات اصلی و اصلاحی قابل مشاهده باشد.

وجود قابلیت Reverse در محصولات مالی سازمانی مانند Microsoft Dynamics 365 نشان می‌دهد که این الگو یک نیاز عملی رایج است؛ برای محصول ما نیز به‌صورت کنترل‌شده و وابسته به قوانین دامنه پیاده خواهد شد.

## 6. روابط اصلی بین دامنه‌ها

```text
Party ← Purchase / Sales / Treasury / Expense
Product ← Purchase / Sales / Inventory
Purchase → Inventory / Payable / Accounting / Tax
Sales → Inventory / Receivable / Treasury / Accounting / Tax
Bank & Treasury → Receivable / Payable / Expense / Accounting
Expense → Payable / Treasury / Accounting
Payroll → Treasury / Accounting / Insurance / Tax
Tax → Purchase / Sales / Accounting / Reporting
Fixed Assets → Purchase / Accounting / Treasury
Agent & Plan → همه دامنه‌های عملیاتی از طریق قراردادهای مجاز
Reporting ← همه دامنه‌ها
Notification ← همه دامنه‌ها
Documents & Files ↔ همه دامنه‌ها به‌عنوان مرجع فایل و ضمیمه
```

## 7. مالکیت تغییر وضعیت

نمونه اصل مالکیت:

| مفهوم | مالک وضعیت |
|---|---|
| Purchase | Purchase |
| Sales Invoice | Sales |
| Stock Balance / Movement | Inventory |
| Receivable / Payable | Accounting یا Subledger دامنه مربوط با مرجع حسابداری |
| Bank Transaction | Treasury/Bank |
| Tax Invoice Status | Tax |
| Employee Payroll Record | Payroll |
| Fixed Asset | Fixed Assets |
| Accounting Document | Accounting |
| Plan | Agent & Plans |
| Notification | Notification |

---

# 8. وضعیت

این سند نقشه مرجع Domain است. تغییر مرز یا مالکیت هر دامنه باید در همین سند و سند دامنه مربوط ثبت و با اسناد معماری همگام شود.
