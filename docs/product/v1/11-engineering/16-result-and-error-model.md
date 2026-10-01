# 16 — Result و Domain Error Model

- وضعیت: پذیرفته‌شده
- نسخه: v1
- مرجع اجرا: `apps/backend/src/shared/errors/` (SHR-002)

## 1. هدف

این سند قرارداد مدل نتیجه و خطای مشترک را ثبت می‌کند تا همه لایه‌ها یک شکل موفقیت
و شکستِ **منتظر** را داشته باشند، بدون اینکه NestJS، HTTP، ORM، Redis یا Provider
وارد Domain شود. مبنا ADR-002 بخش ۱۰ (Result / Error primitives)، ADR-004 بخش ۱۲
(طبقه‌بندی خطا) و اصل مهندسی ۵ (خطا باید صریح و قابل ردیابی باشد).

## 2. مرز استثنا (Exception Boundary)

تمام این مدل حول یک تفکیک بنا شده است:

```text
Expected domain/application failure   →  Result / DomainError
Unexpected technical failure          →  Exception / infrastructure handling
```

- **شکست منتظر** یعنی «کار نکردن» یک نتیجهٔ عادی و تصمیم‌گرفته‌شدهٔ کسب‌وکار است:
  دوره بسته است، رکورد پیدا نشد، مجموع منفی می‌شود. این حالت باید در **نوع**
  دیده شود: `Result<T, DomainError>`.
- **شکست غیرمنتظره** یعنی چیزی خراب شده: دیتابیس قطع است، باگ است، مقداری که قرار
  نبود `null` باشد `null` شده. این حالت باید **throw** شود تا در مرز به
  `INTERNAL_ERROR` تبدیل و لاگ شود.

دو قاعدهٔ سخت:

1. Domain هرگز نمی‌داند این خطا چطور به پاسخ API، لاگ یا Monitoring تبدیل می‌شود.
   تبدیل در Presentation/Infrastructure انجام می‌شود (mapException در FND-006).
2. `map`، `andThen` و `match` در `Result` استثنا را **catch نمی‌کنند**. اگر callback
   خطا بدهد، بالا می‌رود؛ جای دیگری گرفتن آن یعنی محو کردن همین مرز.

## 3. Result — `shared/errors/result.ts`

```ts
Result.ok(value)      // موفقیت
Result.fail(error)    // شکست منتظر
```

| روش | رفتار |
| --- | --- |
| `isOk()` / `isFail()` | وضعیت را می‌گوید |
| `value()` / `error()` | دسترسی **ایمن**؛ در سمت اشتباه `undefined` برمی‌گرداند و هرگز throw نمی‌کند |
| `valueOrThrow()` / `errorOrThrow()` | دسترسی قطعی؛ خواندن سمت اشتباه `InvalidPrimitiveError` می‌زند |
| `match({ ok, fail })` | تنها جایی که هر دو حالت باید تصمیم بگیرند |
| `map` / `mapError` | تبدیل یک سمت و عبور سمت دیگر |
| `andThen` | زنجیرهٔ گام بعدی که خودش ممکن است شکست بخورد |
| `orElse` | بازیابی از شکست با یک `Result` دیگر |
| `getOrElse` | مقدار پیش‌فرض برای شکست |
| `Result.all(list)` | **ترکیب**: همهٔ مقادیر، یا همهٔ خطاها (نه فقط اولی) |

نکات:

- حالت‌ها یک unionاند (`SuccessState | FailureState`)، پس ساختاراً ناممکن است یک
  `Result` هم مقدار موفقیت و هم خطا را هم‌زمان داشته باشد. شیء هم `freeze` است.
- `Result.all` برای ترکیب خطاهاست: یک ردِ چندفیلدی همهٔ دلایل را یک‌جا برمی‌گرداند
  تا مراجع برای هر مشکل یک سفر اضافه نکند.
- خروجی `all` در شکست، یک **آرایه** از `E` است؛ این‌که چند خطا را در یک `DomainError`
  ادغام کنیم تصمیم ماژول فراخوان است.

## 4. Domain Error — `shared/errors/domain-error.ts`

`DomainError` یک abstract class و کلاس پایه برای همهٔ شکست‌های منتظر است:

| فیلد | معنی |
| --- | --- |
| `code` | کد پایدار upper-snake مثل `PERIOD_ALREADY_CLOSED`؛ توسط کلاینت قابل سوییچ |
| `message` | متن امن برای کلاینت؛ هرگز Stack Trace، Query، Credential یا جزئیات داخلی ندارد |
| `category` | نوع خطا از واژگان مشترک (بخش ۵) |
| `details` | آرایهٔ `ErrorDetail` ساخت‌یافته؛ خالی اگر پیام کافی است |
| `cause` | فقط برای عیب‌یابی داخلی؛ در `toJSON()` نمی‌آید |

- `code` با الگوی `/^[A-Z][A-Z0-9_]{0,63}$/` اعتبارسنجی می‌شود؛ کد بی‌شکل یا
  خالی رد می‌شود.
- شیء پس از ساخت `freeze` می‌شود. زیرکلاس نباید بعد از `super(...)` فیلد خودش را
  مقداردهی کند (در strict mode خطا می‌دهد)؛ هرچه باید بگوید در `details` می‌آید.
- `toJSON()` شکل `DomainErrorSnapshot` را برمی‌گرداند:
  `{ code, category, message, details }`.

## 5. Error Category — `shared/errors/error-category.ts`

```text
VALIDATION | BUSINESS_RULE | CONFLICT | NOT_FOUND | STATE_VIOLATION
```

این واژگانِ **شکست منتظر** است و ارتباطی با وضعیت HTTP یا `ApiErrorCategory`
(FND-006) ندارد؛ تبدیل آن به پاسخ کار Presentation است.

پنج کلاس آماده در `shared/errors/category-errors.ts` برای همین دسته‌ها هستند:

| کلاس | `category` | `code` پیش‌فرض |
| --- | --- | --- |
| `ValidationError` | `VALIDATION` | `VALIDATION_FAILED` |
| `BusinessRuleError` | `BUSINESS_RULE` | `BUSINESS_RULE_VIOLATED` |
| `ConflictError` | `CONFLICT` | `CONFLICT` |
| `NotFoundError` | `NOT_FOUND` | `NOT_FOUND` |
| `StateViolationError` | `STATE_VIOLATION` | `STATE_VIOLATION` |

این کلاس‌ها فقط «نوع» می‌گویند، نه «معنی». ماژولی که کد پایدار خودش را می‌خواهد
(مثل `PERIOD_ALREADY_CLOSED`) مستقیم از `DomainError` ارث می‌برد و `category`
خودش را انتخاب می‌کند.

## 6. Error Detail — `shared/errors/error-detail.ts`

```ts
interface ErrorDetail {
  readonly code: string;      // دلیل ماشین‌خوان: MIN, PERIOD_CLOSED
  readonly message: string;   // متن امن برای کلاینت
  readonly field?: string;    // مسیر فیلد: lines[2].quantity
  readonly [key: string]: string | number | boolean | null | undefined;
}
```

- کلید اضافه فقط باید **primitive** باشد؛ شیء، آرایه، `NaN` و `Infinity` رد می‌شوند.
  این همان تضمین «جزئیات قابل سریال‌سازی و بدون وابستگی به transport» است و جلوی
  ورود یک `Error` (با Stack)، Query یا Credential را می‌گیرد.
- حداکثر ۵۰ جزئیات در یک خطا (محدودیت ایمنی، نه قاعدهٔ کسب‌وکار).
- جزئیات هنگام ساخت **کپی و freeze** می‌شوند؛ خطا بعد از پرتاب قابل بازنویسی نیست.
- کلیدهای خصمانه مانند `__proto__` با `Object.defineProperty` ثبت می‌شوند تا به
  prototype chain نرسند.
- حساسیت: `message` عمومی است. هرگز Stack Trace، SQL، Token یا شناسهٔ داخلی خام
  داخل جزئیات ننویسید.

**ترکیب خطاها:** آرایهٔ `details` خودِ ترکیب است و `ValidationError.fromDetails(...)`
برای ساخت یک شکست اعتبارسنجی از چند مشکل فیلد به کار می‌رود؛ `Result.all` ترکیب در
سطح `Result` را انجام می‌دهد.

## 7. نحوهٔ استفاده در Application

```ts
// انتظار: شکست یک نتیجه است، نه یک exception
execute(command: PostInvoiceCommand): Result<Invoice, DomainError> {
  const period = this.periods.find(command.accountingDate);
  if (period === undefined) {
    return Result.fail(new NotFoundError('No open period for that date.'));
  }
  if (period.isClosed()) {
    return Result.fail(
      new StateViolationError('The accounting period is already closed.', [
        { code: 'PERIOD_CLOSED', message: 'The period is closed.', field: 'accountingDate' },
      ]),
    );
  }
  return Result.ok(this.store.post(command));
}

// غیرمنتظره: قطعی دیتابیس یا باگ → exception، نه Result
const raw = await this.pool.query(sql);   // هیچ Resultی در کار نیست
```

و در مرز Presentation:

```ts
const outcome = useCase.execute(command);
if (outcome.isFail()) {
  throw outcome.errorOrThrow();          // DomainError → قرارداد خطای FND-006
}
return outcome.valueOrThrow();
```

## 8. معیار پذیرش

- `Result` موفقیت/شکست را نشان می‌دهد و هر دو مقدار به‌صورت ایمن خوانده می‌شوند.
- دو حالت هم‌زمان فعال نمی‌شوند (تست `match` دقیقاً یک بازو را صدا می‌زند).
- `DomainError` کد پایدار، دسته و جزئیات ساخت‌یافته دارد.
- کلاس‌های پنج دستهٔ مشترک موجود‌اند و `ValidationError.fromDetails` ترکیب را پوشش
  می‌دهد.
- کد Domain از NestJS، HTTP، ORM، Redis، MySQL و SDK خارجی بی‌نهیاز است
  (`framework-independence.spec.ts`).
- شکست غیرمنتظره همچنان exception می‌ماند و از `Result` قابل تشخیص است.
- `pnpm verify` سبز است و هیچ منطق کسب‌وکاری به Shared Kernel اضافه نشده است.
