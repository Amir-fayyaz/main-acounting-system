# مستند User Story — نرم‌افزار حسابداری فروشگاهی (MVP)

> مشابه هلو | مدل SaaS چندفروشگاهی | نسخه MVP

**مدل محصول:** SaaS Multi-tenant — یک پلتفرم، چند فروشگاه مستقل از هم روی همون زیرساخت

**نقش‌ها (Roles):**
| نقش | سطح | توضیح |
|---|---|---|
| **Super Admin** | پلتفرم (Global) | مدیریت فروشگاه‌ها، پلن اشتراک، بدون دسترسی به داده مالی فروشگاه‌ها |
| **Owner** | فروشگاه (Tenant) | مالک یک یا چند فروشگاه، دسترسی کامل به همون فروشگاه(ها) |
| **Cashier** | فروشگاه (Tenant) | فقط فروش/صدور فاکتور |
| **Stock Keeper** | فروشگاه (Tenant) | فقط مدیریت انبار |

**⚠️ نکته معماری حیاتی — Multi-tenancy:**
از همون ابتدای MVP باید Tenant Isolation پیاده بشه، وگرنه ریفکتور بعدی بسیار پرهزینه است:

- هر جدول تراکنشی/دیتای فروشگاهی (`products`, `invoices`, `customers`, `expenses`, ...) باید فیلد `shop_id` داشته باشه
- هر Query باید خودکار بر اساس `shop_id` فیلتر بشه (در NestJS: Guard سطح Tenant + Interceptor یا Middleware که `shop_id` رو از JWT استخراج و به Query Context تزریق کنه)
- JWT کاربران سطح فروشگاه باید شامل `shop_id` فعال (یا لیست فروشگاه‌های قابل دسترسی، برای Owner چندفروشگاهی) باشه
- Super Admin باید به سطح مدیریتی دسترسی داشته باشه، اما **نه** مستقیم به داده مالی/فروش فروشگاه‌ها (مگر با ابزار پشتیبانی جدا و لاگ‌شده)
- پیشنهاد استراتژی دیتابیس برای MVP: **Shared Database, Shared Schema با ستون `shop_id`** (ساده‌تر و ارزون‌تر از Schema-per-tenant یا Database-per-tenant؛ برای مقیاس بزرگ‌تر بعداً قابل مهاجرته)

**Priority (طبق MoSCoW):** Must / Should / Could

---

## Epic 1: مدیریت کاربران و فروشگاه

### US-1.1 — ثبت‌نام صاحب فروشگاه

**As a** Owner **I want** to register with mobile number or email **so that** I can create my own account.

**Priority:** Must | **Estimate:** 3 SP

**Acceptance Criteria:**

```
Scenario 1: ثبت‌نام موفق
  Given کاربر شماره موبایل معتبر و رمز عبور وارد کرده
  When دکمه ثبت‌نام را می‌زند
  Then کد تایید پیامک می‌شود
  And پس از تایید کد، حساب کاربری ساخته می‌شود

Scenario 2: شماره تکراری
  Given شماره موبایل قبلاً ثبت شده
  When کاربر با همان شماره ثبت‌نام می‌کند
  Then پیام خطای "شماره قبلاً ثبت شده" نمایش داده می‌شود

Scenario 3: رمز عبور ضعیف
  Given رمز عبور کمتر از ۸ کاراکتر است
  When فرم ارسال می‌شود
  Then خطای اعتبارسنجی نمایش داده می‌شود
```

**Dependencies:** ندارد

---

### US-1.2 — ورود به سیستم

**As a** Owner/Cashier **I want** to log in securely **so that** I can access my data.

**Priority:** Must | **Estimate:** 2 SP

**Acceptance Criteria:**

```
Scenario 1: ورود موفق
  Given کاربر ثبت‌نام‌شده است
  When شماره و رمز درست وارد می‌کند
  Then وارد داشبورد می‌شود و JWT token دریافت می‌کند

Scenario 2: رمز اشتباه
  Given رمز اشتباه وارد شده
  When فرم ارسال می‌شود
  Then خطای "نام کاربری یا رمز اشتباه است" نمایش داده می‌شود

Scenario 3: قفل حساب بعد از تلاش‌های ناموفق
  Given ۵ بار رمز اشتباه وارد شده
  When تلاش ششم انجام می‌شود
  Then حساب برای ۱۵ دقیقه قفل می‌شود
```

---

### US-1.3 — تنظیمات فروشگاه

**As a** Owner **I want** to set up shop info (name, business type, logo, address) **so that** invoices show correct details.

**Priority:** Must | **Estimate:** 2 SP

**Acceptance Criteria:**

```
Scenario 1: ثبت اطلاعات فروشگاه
  Given Owner وارد پنل تنظیمات شده
  When نام، نوع کسب‌وکار، آدرس و لوگو را وارد و ذخیره می‌کند
  Then اطلاعات ذخیره شده و در فاکتورها استفاده می‌شود

Scenario 2: آپلود لوگوی نامعتبر
  Given فایل آپلودی فرمت غیرمجاز دارد (مثلاً pdf)
  When Owner آن را آپلود می‌کند
  Then خطای "فرمت فایل مجاز نیست" نمایش داده می‌شود
```

---

### US-1.4 — تعریف کاربر با دسترسی محدود

**As a** Owner **I want** to create limited-access accounts for staff **so that** they can only access relevant sections.

**Priority:** Must | **Estimate:** 3 SP

**Acceptance Criteria:**

```
Scenario 1: ایجاد کاربر صندوق‌دار
  Given Owner در پنل مدیریت کاربران است
  When نام، شماره و نقش "Cashier" را وارد می‌کند
  Then حساب کاربری با دسترسی محدود (فقط فروش) ساخته می‌شود

Scenario 2: تلاش صندوق‌دار برای دسترسی به گزارش مالی
  Given کاربر با نقش Cashier وارد شده
  When سعی می‌کند به صفحه "گزارش سود و زیان" برود
  Then با خطای "دسترسی غیرمجاز" (403) مواجه می‌شود

Scenario 3: غیرفعال کردن کاربر
  Given Owner می‌خواهد دسترسی یک کارمند را قطع کند
  When وضعیت کاربر را به "غیرفعال" تغییر می‌دهد
  Then آن کاربر دیگر نمی‌تواند وارد سیستم شود
```

---

### US-1.5 — مشاهده لیست فروشگاه‌ها (Super Admin)

**As a** Super Admin **I want** to see a list of all registered shops **so that** I can monitor platform status.

**Priority:** Must | **Estimate:** 3 SP

**Acceptance Criteria:**

```
Scenario 1: مشاهده لیست
  Given چند فروشگاه در پلتفرم ثبت شده
  When Super Admin وارد پنل ادمین می‌شود
  Then لیست فروشگاه‌ها با نام، تاریخ ثبت‌نام و وضعیت (فعال/غیرفعال) نمایش داده می‌شود

Scenario 2: جستجو و فیلتر
  Given تعداد فروشگاه‌ها زیاد است
  When Super Admin بر اساس نام یا وضعیت فیلتر می‌کند
  Then فقط فروشگاه‌های مطابق نمایش داده می‌شوند
```

**Dependencies:** US-1.1

---

### US-1.6 — فعال/غیرفعال کردن فروشگاه

**As a** Super Admin **I want** to activate/deactivate a shop **so that** I can block usage in case of violation or non-payment.

**Priority:** Must | **Estimate:** 2 SP

**Acceptance Criteria:**

```
Scenario 1: غیرفعال کردن فروشگاه
  Given فروشگاهی فعال است
  When Super Admin وضعیت آن را به "غیرفعال" تغییر می‌دهد
  Then کاربران آن فروشگاه (Owner/Cashier/Stock Keeper) دیگر نمی‌توانند وارد شوند
  And پیام مناسب ("حساب فروشگاه غیرفعال شده") به آن‌ها نمایش داده می‌شود

Scenario 2: فعال‌سازی مجدد
  Given فروشگاهی غیرفعال است
  When Super Admin آن را فعال می‌کند
  Then کاربران فروشگاه دوباره می‌توانند وارد شوند و داده‌های قبلی دست‌نخورده باقی می‌ماند
```

**Dependencies:** US-1.5

---

### US-1.7 — مدیریت پلن اشتراک فروشگاه‌ها

**As a** Super Admin **I want** to manage shop subscription plans (free/paid) **so that** the platform's revenue model is controlled.

**Priority:** Should | **Estimate:** 5 SP

**Acceptance Criteria:**

```
Scenario 1: تغییر پلن فروشگاه
  Given فروشگاهی روی پلن رایگان است
  When Super Admin پلن را به "پولی" تغییر می‌دهد
  Then محدودیت‌های پلن رایگان (مثلاً تعداد فاکتور در ماه) برداشته می‌شود

Scenario 2: پایان اعتبار پلن پولی
  Given تاریخ انقضای پلن فروشگاهی رسیده
  When سیستم بررسی روزانه انجام می‌دهد
  Then فروشگاه به پلن رایگان بازمی‌گردد یا هشدار تمدید ارسال می‌شود
```

**Dependencies:** US-1.6

---

### US-1.8 — جابه‌جایی بین چند فروشگاه (برای Owner)

**As an** Owner **I want** to switch between shops I own **so that** I can manage each independently.

**Priority:** Should | **Estimate:** 3 SP

**Acceptance Criteria:**

```
Scenario 1: مالکیت چند فروشگاه
  Given Owner مالک ۲ فروشگاه است
  When وارد سیستم می‌شود
  Then لیست فروشگاه‌های او نمایش داده می‌شود و می‌تواند یکی را انتخاب کند

Scenario 2: جابه‌جایی بین فروشگاه‌ها
  Given Owner در فروشگاه A فعال است
  When فروشگاه B را از منو انتخاب می‌کند
  Then کل داشبورد و داده‌ها (فروش، انبار، ...) مربوط به فروشگاه B نمایش داده می‌شود و شامل هیچ داده‌ای از فروشگاه A نیست
```

**Dependencies:** US-1.1, US-1.3

---

### US-1.9 — انزوای کامل داده بین فروشگاه‌ها (Tenant Isolation)

**As the** system **I want** to guarantee no user can access another shop's data without belonging to it **so that** tenant data stays fully isolated and secure.

**Priority:** Must | **Estimate:** 5 SP

**Acceptance Criteria:**

```
Scenario 1: تلاش برای دسترسی مستقیم با ID فروشگاه دیگر
  Given Cashier فروشگاه A لاگین کرده و توکن JWT با shop_id=A دارد
  When درخواست API برای مشاهده فاکتور با شناسه‌ای متعلق به فروشگاه B ارسال می‌کند
  Then سرور خطای 403/404 برمی‌گرداند و هیچ داده‌ای افشا نمی‌شود

Scenario 2: فیلتر خودکار Query ها
  Given هر Query سطح دیتابیس از طریق Guard/Interceptor عبور می‌کند
  When یک Query بدون شرط shop_id نوشته شده باشد
  Then تست خودکار CI این مورد را به‌عنوان خطای امنیتی شناسایی و بیلد را متوقف می‌کند

Scenario 3: دسترسی Super Admin
  Given Super Admin به پنل مدیریتی وارد شده (بدون shop_id در توکن)
  When سعی می‌کند مستقیماً به فاکتورهای فروشگاهی دسترسی پیدا کند از طریق API عادی
  Then دسترسی رد می‌شود مگر از طریق ابزار پشتیبانی مجزا با لاگ کامل (Audit Log)
```

**Dependencies:** US-1.1, US-1.5
**Note:** این Story بیشتر یک الزام معماری/فنی (Non-functional Requirement) است تا فیچر کاربری، ولی به‌خاطر اهمیت امنیتی‌اش باید در Backlog و تست‌ها به‌صراحت لحاظ بشه.

---

## Epic 2: مدیریت کالا و انبار

### US-2.1 — تعریف کالا/خدمت

**As a** Owner **I want** to define products/services with price and stock **so that** they're available for invoicing.

**Priority:** Must | **Estimate:** 3 SP

**Acceptance Criteria:**

```
Scenario 1: افزودن کالا
  Given Owner در صفحه "کالاها" است
  When نام، کد/بارکد، واحد شمارش، قیمت خرید و فروش و موجودی اولیه را وارد می‌کند
  Then کالا در لیست ذخیره می‌شود

Scenario 2: کد تکراری
  Given کالایی با همان بارکد قبلاً ثبت شده
  When Owner کالای جدید با همان بارکد ثبت می‌کند
  Then خطای "این کد قبلاً استفاده شده" نمایش داده می‌شود

Scenario 3: قیمت منفی
  Given قیمت فروش منفی وارد شده
  When فرم ذخیره می‌شود
  Then خطای اعتبارسنجی نمایش داده می‌شود
```

---

### US-2.2 — دسته‌بندی کالاها

**As a** Owner **I want** to categorize products **so that** search and reporting are easier.

**Priority:** Should | **Estimate:** 2 SP

**Acceptance Criteria:**

```
Scenario 1: ساخت دسته‌بندی
  Given Owner در صفحه دسته‌بندی‌هاست
  When نام دسته (مثلاً "لبنیات") را وارد می‌کند
  Then دسته جدید ذخیره و در فرم افزودن کالا قابل انتخاب می‌شود

Scenario 2: حذف دسته‌بندی دارای کالا
  Given دسته‌بندی به چند کالا متصل است
  When Owner سعی در حذف آن دسته دارد
  Then پیام هشدار "این دسته به کالاهایی متصل است" نمایش داده می‌شود
```

---

### US-2.3 — جستجوی سریع کالا

**As a** Cashier **I want** to search products by name/barcode **so that** I can sell faster.

**Priority:** Must | **Estimate:** 2 SP

**Acceptance Criteria:**

```
Scenario 1: جستجو با نام
  Given چند کالا در سیستم ثبت شده
  When Cashier بخشی از نام کالا را تایپ می‌کند
  Then لیست فیلترشده کالاهای مطابق نمایش داده می‌شود

Scenario 2: اسکن بارکد
  Given دستگاه بارکدخوان متصل است
  When بارکد اسکن می‌شود
  Then کالای مربوطه مستقیم به فاکتور اضافه می‌شود

Scenario 3: کالای یافت نشد
  Given بارکد نامعتبر اسکن شده
  When سیستم جستجو می‌کند
  Then پیام "کالایی یافت نشد" نمایش داده می‌شود
```

---

### US-2.4 — به‌روزرسانی خودکار موجودی

**As a** Owner **I want** stock to update automatically after purchase/sale **so that** inventory stays accurate.

**Priority:** Must | **Estimate:** 3 SP

**Acceptance Criteria:**

```
Scenario 1: کاهش موجودی بعد از فروش
  Given موجودی کالای X برابر ۱۰ است
  When فاکتور فروش با ۳ عدد از کالای X ثبت می‌شود
  Then موجودی به ۷ کاهش می‌یابد

Scenario 2: افزایش موجودی بعد از خرید
  Given موجودی کالای X برابر ۷ است
  When فاکتور خرید با ۵ عدد از کالای X ثبت می‌شود
  Then موجودی به ۱۲ افزایش می‌یابد

Scenario 3: فروش بیشتر از موجودی
  Given موجودی کالای X برابر ۲ است
  When Cashier سعی می‌کند ۵ عدد بفروشد
  Then خطای "موجودی کافی نیست" نمایش داده می‌شود (قابل تنظیم: اجازه فروش منفی یا نه)
```

---

### US-2.5 — هشدار کمبود موجودی

**As a** Owner **I want** to get alerted when stock is low **so that** I can reorder in time.

**Priority:** Should | **Estimate:** 2 SP

**Acceptance Criteria:**

```
Scenario 1: رسیدن به حد آستانه
  Given حد هشدار کالای X برابر ۵ عدد تنظیم شده
  When موجودی به ۵ یا کمتر می‌رسد
  Then نوتیفیکیشن/آیکون هشدار برای Owner نمایش داده می‌شود

Scenario 2: عدم تنظیم حد آستانه
  Given حد هشدار برای کالایی تنظیم نشده
  When موجودی آن به صفر می‌رسد
  Then هشدار پیش‌فرض سیستم (مثلاً ۰) فعال می‌شود
```

---

## Epic 3: فروش (فاکتور)

### US-3.1 — صدور فاکتور فروش

**As a** Cashier **I want** to create an invoice with multiple products **so that** the total is calculated automatically.

**Priority:** Must | **Estimate:** 5 SP

**Acceptance Criteria:**

```
Scenario 1: صدور فاکتور ساده
  Given Cashier چند کالا با تعداد مشخص انتخاب کرده
  When فاکتور را ثبت می‌کند
  Then مبلغ کل به‌صورت خودکار محاسبه و فاکتور ذخیره می‌شود

Scenario 2: فاکتور بدون کالا
  Given هیچ کالایی به فاکتور اضافه نشده
  When Cashier سعی در ثبت فاکتور دارد
  Then خطای "حداقل یک کالا اضافه کنید" نمایش داده می‌شود

Scenario 3: تغییر تعداد کالا در فاکتور
  Given کالایی به فاکتور اضافه شده
  When Cashier تعداد را تغییر می‌دهد
  Then مبلغ کل بلافاصله بازمحاسبه می‌شود
```

---

### US-3.2 — اعمال تخفیف

**As a** Cashier **I want** to apply discount on invoice or item **so that** the final price is correct.

**Priority:** Should | **Estimate:** 3 SP

**Acceptance Criteria:**

```
Scenario 1: تخفیف روی کل فاکتور
  Given فاکتور مبلغ ۱۰۰٬۰۰۰ تومان دارد
  When Cashier تخفیف ۱۰٪ اعمال می‌کند
  Then مبلغ نهایی ۹۰٬۰۰۰ تومان می‌شود

Scenario 2: تخفیف بیشتر از مبلغ کل
  Given Cashier تخفیف ۱۲۰٪ وارد می‌کند
  When فرم ثبت می‌شود
  Then خطای اعتبارسنجی نمایش داده می‌شود
```

---

### US-3.3 — انتخاب نوع پرداخت

**As a** Cashier **I want** to specify payment type (cash/card/credit) **so that** financial status is recorded correctly.

**Priority:** Must | **Estimate:** 3 SP

**Acceptance Criteria:**

```
Scenario 1: پرداخت نقدی کامل
  Given مبلغ فاکتور ۵۰٬۰۰۰ تومان است
  When Cashier نوع پرداخت "نقدی" و مبلغ کامل را ثبت می‌کند
  Then فاکتور "تسویه‌شده" علامت می‌خورد و به صندوق اضافه می‌شود

Scenario 2: فروش نسیه
  Given مشتری قبلاً تعریف شده
  When Cashier نوع پرداخت "نسیه" را انتخاب می‌کند
  Then مبلغ فاکتور به بدهی مشتری اضافه می‌شود

Scenario 3: پرداخت ترکیبی
  Given Cashier می‌خواهد بخشی نقد و بخشی نسیه ثبت کند
  When مبلغ نقدی کمتر از کل فاکتور وارد می‌شود
  Then باقی‌مانده به‌عنوان بدهی مشتری ثبت می‌شود
```

---

### US-3.4 — چاپ/ارسال فاکتور

**As a** Owner **I want** to print or send invoice as PDF **so that** I have proof of sale.

**Priority:** Should | **Estimate:** 2 SP

**Acceptance Criteria:**

```
Scenario 1: چاپ فاکتور
  Given فاکتور ثبت شده
  When Cashier دکمه "چاپ" را می‌زند
  Then فاکتور در قالب چاپی/PDF نمایش داده می‌شود

Scenario 2: ارسال فاکتور به مشتری
  Given شماره تلفن مشتری ثبت شده
  When Owner دکمه "ارسال" را می‌زند
  Then لینک PDF فاکتور برای مشتری پیامک/ارسال می‌شود
```

---

### US-3.5 — مرجوعی (برگشت از فروش)

**As a** Cashier **I want** to process a return **so that** inventory and customer balance are corrected.

**Priority:** Should | **Estimate:** 3 SP

**Acceptance Criteria:**

```
Scenario 1: مرجوعی کامل فاکتور
  Given فاکتوری قبلاً ثبت شده
  When Cashier "مرجوعی" را برای کل فاکتور ثبت می‌کند
  Then موجودی کالاها برگردانده می‌شود و بدهی/طلب مشتری اصلاح می‌شود

Scenario 2: مرجوعی جزئی
  Given فاکتور شامل ۳ کالا است
  When Cashier فقط یک کالا را مرجوع می‌کند
  Then فقط موجودی و مبلغ همان کالا اصلاح می‌شود

Scenario 3: مرجوعی فاکتور قدیمی‌تر از بازه مجاز
  Given فاکتور بیش از ۳۰ روز از تاریخ صدور گذشته (قابل تنظیم)
  When Cashier سعی در مرجوعی دارد
  Then هشدار یا نیاز به تایید Owner نمایش داده می‌شود
```

---

## Epic 4: خرید

### US-4.1 — ثبت فاکتور خرید

**As a** Owner **I want** to record purchase invoices from suppliers **so that** cost and inventory update together.

**Priority:** Must | **Estimate:** 3 SP

**Acceptance Criteria:**

```
Scenario 1: ثبت خرید نقدی
  Given Owner تامین‌کننده و کالاها را انتخاب کرده
  When فاکتور خرید با پرداخت نقدی ثبت می‌شود
  Then موجودی کالاها افزایش و مبلغ از صندوق کسر می‌شود

Scenario 2: ثبت خرید نسیه
  Given Owner نوع پرداخت "نسیه" را انتخاب کرده
  When فاکتور ثبت می‌شود
  Then مبلغ به بدهی Owner نزد آن تامین‌کننده اضافه می‌شود
```

---

## Epic 5: حساب مشتریان و تامین‌کنندگان

### US-5.1 — تعریف مشتری/تامین‌کننده

**As a** Owner **I want** to define customers/suppliers with contact info **so that** I can open credit accounts for them.

**Priority:** Must | **Estimate:** 2 SP

**Acceptance Criteria:**

```
Scenario 1: افزودن مشتری جدید
  Given Owner در صفحه مشتریان است
  When نام و شماره تماس وارد می‌کند
  Then مشتری جدید با موجودی حساب صفر ایجاد می‌شود

Scenario 2: شماره تکراری
  Given مشتری‌ای با همان شماره وجود دارد
  When Owner دوباره همان شماره را ثبت می‌کند
  Then خطای "این شماره قبلاً ثبت شده" نمایش داده می‌شود
```

---

### US-5.2 — کارت حساب مشتری

**As a** Owner **I want** to view a customer's account history **so that** I know their financial status.

**Priority:** Must | **Estimate:** 3 SP

**Acceptance Criteria:**

```
Scenario 1: مشاهده تاریخچه
  Given مشتری چند فاکتور نسیه و پرداخت دارد
  When Owner کارت حساب او را باز می‌کند
  Then لیست تراکنش‌ها با تاریخ، مبلغ و مانده نمایش داده می‌شود

Scenario 2: مشتری بدون تراکنش
  Given مشتری تازه ثبت شده و تراکنشی ندارد
  When کارت حساب باز می‌شود
  Then پیام "تراکنشی ثبت نشده" نمایش داده می‌شود
```

---

### US-5.3 — یادآوری پرداخت

**As a** Owner **I want** to set payment reminders for credit customers **so that** debts aren't forgotten.

**Priority:** Could | **Estimate:** 2 SP

**Acceptance Criteria:**

```
Scenario 1: تنظیم یادآوری
  Given مشتری بدهی دارد
  When Owner تاریخ یادآوری تنظیم می‌کند
  Then در تاریخ مشخص‌شده نوتیفیکیشن ارسال می‌شود
```

---

## Epic 6: صندوق و بانک

### US-6.1 — ثبت دریافت/پرداخت نقدی

**As a** Owner **I want** to record cash in/out **so that** cash balance is accurate.

**Priority:** Must | **Estimate:** 2 SP

**Acceptance Criteria:**

```
Scenario 1: ثبت دریافت نقدی
  Given Owner در صفحه صندوق است
  When مبلغ و بابت دریافت را وارد می‌کند
  Then موجودی صندوق افزایش می‌یابد

Scenario 2: ثبت پرداخت بیشتر از موجودی
  Given موجودی صندوق ۱۰۰٬۰۰۰ تومان است
  When Owner پرداخت ۲۰۰٬۰۰۰ تومانی ثبت می‌کند
  Then هشدار "موجودی کافی نیست" نمایش داده می‌شود (قابل تنظیم: اجازه یا عدم اجازه)
```

---

### US-6.2 — چند صندوق/حساب بانکی

**As a** Owner **I want** to define multiple cash/bank accounts **so that** transactions are tracked separately.

**Priority:** Should | **Estimate:** 3 SP

**Acceptance Criteria:**

```
Scenario 1: افزودن حساب بانکی
  Given Owner در تنظیمات صندوق‌هاست
  When حساب بانکی جدید با نام بانک و شماره حساب ثبت می‌کند
  Then حساب جدید در لیست پرداخت‌ها قابل انتخاب می‌شود
```

---

### US-6.3 — ثبت چک

**As a** Owner **I want** to record checks with due dates **so that** I get reminders.

**Priority:** Could | **Estimate:** 3 SP

**Acceptance Criteria:**

```
Scenario 1: ثبت چک دریافتی
  Given Owner چک دریافتی از مشتری دارد
  When شماره چک، مبلغ و تاریخ سررسید را ثبت می‌کند
  Then چک در لیست "چک‌های در جریان" نمایش داده می‌شود

Scenario 2: نزدیک شدن به سررسید
  Given سررسید چک ۲ روز دیگر است
  When سیستم بررسی روزانه انجام می‌دهد
  Then نوتیفیکیشن یادآوری ارسال می‌شود
```

---

## Epic 7: گزارش‌گیری

### US-7.1 — گزارش فروش روزانه/ماهانه

**Priority:** Must | **Estimate:** 3 SP

```
Scenario 1: مشاهده گزارش بازه زمانی
  Given Owner بازه تاریخ را انتخاب می‌کند
  When گزارش فروش را باز می‌کند
  Then جمع فروش، تعداد فاکتور و میانگین فروش نمایش داده می‌شود
```

### US-7.2 — گزارش سود و زیان ساده

**Priority:** Must | **Estimate:** 5 SP

```
Scenario 1: محاسبه سود ساده
  Given فروش و هزینه‌های یک ماه ثبت شده
  When Owner گزارش سود/زیان را باز می‌کند
  Then (فروش - بهای تمام‌شده - هزینه‌ها) به‌عنوان سود خالص نمایش داده می‌شود
```

### US-7.3 — گزارش موجودی انبار

**Priority:** Should | **Estimate:** 2 SP

```
Scenario 1: مشاهده موجودی فعلی
  Given کالاها در سیستم ثبت شده
  When Owner گزارش انبار را باز می‌کند
  Then لیست کالاها با موجودی فعلی و ارزش ریالی نمایش داده می‌شود
```

### US-7.4 — گزارش بدهکاران و بستانکاران

**Priority:** Must | **Estimate:** 3 SP

```
Scenario 1: لیست بدهکاران
  Given چند مشتری بدهی دارند
  When Owner گزارش را باز می‌کند
  Then لیست مشتریان به‌ترتیب مبلغ بدهی نمایش داده می‌شود
```

---

## Epic 8: داشبورد

### US-8.1 — داشبورد خلاصه وضعیت مالی

**Priority:** Must | **Estimate:** 3 SP

```
Scenario 1: نمایش خلاصه
  Given Owner وارد سیستم می‌شود
  When داشبورد بارگذاری می‌شود
  Then فروش امروز، موجودی صندوق، جمع بدهی و جمع طلب نمایش داده می‌شود
```

---

## Definition of Done (DoD) — برای هر Story

- [ ] کد نوشته و در PR ریویو شده
- [ ] تست واحد (Unit Test) نوشته شده
- [ ] Acceptance Criteria به‌صورت تست دستی/خودکار بررسی شده
- [ ] مستندات API (Swagger) به‌روزرسانی شده
- [ ] بدون خطای Lint/Build
- [ ] روی محیط Staging تست شده
- [ ] تایید محصول (Product Owner) گرفته شده

---

## جدول خلاصه اولویت‌بندی (برای Backlog)

| Epic                                   | تعداد Story | Must   | Should | Could |
| -------------------------------------- | ----------- | ------ | ------ | ----- |
| کاربران و فروشگاه (شامل Multi-tenancy) | 9           | 6      | 3      | 0     |
| کالا و انبار                           | 5           | 3      | 2      | 0     |
| فروش                                   | 5           | 3      | 2      | 0     |
| خرید                                   | 1           | 1      | 0      | 0     |
| مشتریان/تامین‌کنندگان                  | 3           | 2      | 0      | 1     |
| صندوق و بانک                           | 3           | 1      | 1      | 1     |
| گزارش‌گیری                             | 4           | 3      | 1      | 0     |
| داشبورد                                | 1           | 1      | 0      | 0     |
| **جمع کل**                             | **31**      | **20** | **9**  | **2** |

> پیشنهاد: در MVP فقط روی Story های **Must** تمرکز کن (۲۰ عدد). از بین این‌ها، **US-1.9 (Tenant Isolation)** رو باید همون هفته اول پیاده کنی چون کل معماری بعدی روی اون سوار می‌شه — تاخیر در پیاده‌سازیش یعنی ریفکتور کل دیتابیس بعداً.
