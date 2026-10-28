# راهنمای استفاده از API client و مدیریت خطا

این ماژول یک wrapper مشترک روی `fetch` است. پاسخ موفق را با یک parser بررسی می‌کند و
تمام خطاهای شبکه، HTTP، پاسخ نامعتبر و لغو درخواست را به یک ساختار ثابت به نام
`ApiError` تبدیل می‌کند.

```ts
import {
  apiRequest,
  getFieldErrors,
  normalizeApiError,
  serializeApiError,
  type ApiErrorData,
} from '@repo/web/api';
```

## جریان استاندارد استفاده

```text
apiRequest
  ├─ پاسخ موفق → parse → داده‌ی Type-safe
  └─ پاسخ ناموفق → throw ApiError
                         ↓
                catch (error: unknown)
                         ↓
                normalizeApiError(error)
                         ↓
              پیام UI یا خطای فیلدهای فرم
```

سه قانون اصلی:

1. برای درخواست‌های API از `apiRequest` استفاده کنید، نه `fetch` مستقیم.
2. خطای `catch` همیشه `unknown` باشد؛ از `any` یا `as ApiError` استفاده نکنید.
3. تصمیم‌های مربوط به متن UI را داخل feature نگه دارید؛ مثلاً `mapAuthError` یا
   `mapInvoiceError`.

## `apiRequest`

برای ارسال درخواست و دریافت پاسخ Type-safe استفاده می‌شود. خطای HTTP را خودش می‌خواند
و به `ApiError` تبدیل می‌کند.

### JSON همراه parser

JSON فقط زمانی به یک تایپ مشخص تبدیل می‌شود که parser زمان اجرا داشته باشد:

```ts
import * as z from 'zod/mini';
import { apiRequest } from '@repo/web/api';

const invoiceSchema = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.string(),
});

type Invoice = z.infer<typeof invoiceSchema>;

function parseInvoice(data: unknown): Invoice {
  const result = z.safeParse(invoiceSchema, data);
  if (!result.success) throw new TypeError('Invalid invoice response');
  return result.data;
}

export function getInvoice(id: string): Promise<Invoice> {
  return apiRequest(`/api/v1/invoices/${id}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    parse: parseInvoice,
  });
}
```

اگر parser وجود نداشته باشد، خروجی JSON از نوع `unknown` خواهد بود:

```ts
const data = await apiRequest('/api/v1/example'); // unknown
```

### پاسخ‌های غیر JSON

```ts
const text = await apiRequest('/report.txt', { responseType: 'text' });
const file = await apiRequest('/report.pdf', { responseType: 'blob' });
const bytes = await apiRequest('/file', { responseType: 'arrayBuffer' });
const form = await apiRequest('/form', { responseType: 'formData' });
```

برای پاسخ‌های `204 No Content`:

```ts
await apiRequest('/api/v1/auth/sign-out', {
  method: 'POST',
  responseType: 'void',
});
```

## `normalizeApiError`

هر مقدار `unknown` را به یک `ApiError` معتبر تبدیل می‌کند. این تابع نقطه‌ی استاندارد
ورود خطا به UI است.

```ts
try {
  await getInvoice('invoice-id');
} catch (error: unknown) {
  const apiError = normalizeApiError(error);

  console.log(apiError.kind);
  console.log(apiError.status);
  console.log(apiError.code);
  console.log(apiError.category);
  console.log(apiError.message);
  console.log(apiError.details);
  console.log(apiError.correlationId);
}
```

نمونه‌ی mapper مخصوص یک feature:

```ts
export function mapInvoiceError(error: unknown): string {
  const apiError = normalizeApiError(error);

  if (apiError.kind === 'network') return 'ارتباط با سرور برقرار نشد.';
  if (apiError.status === 401) return 'برای ادامه دوباره وارد حساب شوید.';
  if (apiError.status === 403) return 'اجازه انجام این عملیات را ندارید.';
  if (apiError.code === 'INVOICE_ALREADY_PAID') return 'این فاکتور قبلاً پرداخت شده است.';
  if (apiError.source === 'backend') return apiError.message;

  return 'خطایی غیرمنتظره رخ داد.';
}
```

## `getFieldErrors`

خطاهای `details` بک‌اند را فقط برای فیلدهای مجاز فرم برمی‌گرداند. خروجی براساس همان
لیست فیلدها Type-safe است.

```ts
const INVOICE_FIELDS = ['title', 'amount', 'dueDate'] as const;

try {
  await createInvoice(input);
} catch (error: unknown) {
  const fieldErrors = getFieldErrors(error, INVOICE_FIELDS);

  // Partial<Record<'title' | 'amount' | 'dueDate', string>>
  setErrors(fieldErrors);
}
```

اگر بک‌اند فیلدی خارج از allowlist مانند `tenantId` بفرستد، وارد خروجی نمی‌شود.

## `serializeApiError`

برای عبور دادن خطا از Server Action، store یا هر مرز سریال‌سازی استفاده می‌شود.
خروجی آن `ApiErrorData` است.

```ts
type CreateInvoiceResult = { ok: true; invoiceId: string } | { ok: false; error: ApiErrorData };

export async function createInvoiceAction(): Promise<CreateInvoiceResult> {
  try {
    const invoice = await createInvoice();
    return { ok: true, invoiceId: invoice.id };
  } catch (error: unknown) {
    return { ok: false, error: serializeApiError(error) };
  }
}
```

در کلاینت:

```ts
const result = await createInvoiceAction();

if (!result.ok) {
  const error = normalizeApiError(result.error);
  toast.error(mapInvoiceError(error));
}
```

## `createHttpApiError`

از status و بدنه‌ی احتمالی بک‌اند یک `ApiError` می‌سازد. `apiRequest` این تابع را
داخلی صدا می‌زند؛ معمولاً در کد feature به آن نیاز ندارید.

کاربردهای مناسب:

- ساخت خطا در تست؛
- adapterهایی که خودشان status و body را در اختیار دارند؛
- ساخت یک نتیجه‌ی HTTP محلی، مثل نبودن token در Server Action.

```ts
const error = createHttpApiError(401);

const backendError = createHttpApiError(400, {
  error: {
    code: 'VALIDATION_FAILED',
    category: 'validation',
    message: 'اطلاعات واردشده معتبر نیست.',
    correlationId: 'request-id',
    details: [
      {
        field: 'email',
        code: 'isEmail',
        message: 'فرمت ایمیل معتبر نیست.',
      },
    ],
  },
});
```

## `ApiError`

کلاس خطای استاندارد داخل برنامه است. `apiRequest` آن را throw می‌کند و
`normalizeApiError` آن را برمی‌گرداند.

```ts
const error = normalizeApiError(caughtError);

if (error instanceof ApiError) {
  console.log(error.code);
}
```

در کد عادی feature معمولاً `new ApiError(...)` نسازید؛ از `apiRequest`،
`normalizeApiError` یا `createHttpApiError` استفاده کنید.

متد `toData()` خطا را به `ApiErrorData` تبدیل می‌کند:

```ts
const data = error.toData();
```

## `isApiError`

یک type guard برای تشخیص `ApiError` یا `ApiErrorData` معتبر است.

```ts
if (isApiError(error)) {
  console.log(error.code);
}
```

اگر قصد دارید در هر حالت یک خطای استاندارد داشته باشید، `normalizeApiError` انتخاب
بهتری است. `isApiError` زمانی مفید است که فقط می‌خواهید نوع ورودی را بررسی کنید.

## `isUnauthorizedError`

بررسی می‌کند status خطا `401` باشد:

```ts
if (isUnauthorizedError(error)) {
  redirect('/login');
}
```

## `isForbiddenError`

بررسی می‌کند status خطا `403` باشد:

```ts
if (isForbiddenError(error)) {
  toast.error('اجازه انجام این عملیات را ندارید.');
}
```

## `API_ERROR_CATEGORIES`

لیست ثابت categoryهای معتبر بک‌اند است:

```ts
// ['validation', 'client', 'domain', 'technical']
```

در اکثر featureها نیازی به استفاده‌ی مستقیم از آن نیست. برای ساخت schema، select یا
بررسی قرارداد مفید است.

## `DEFAULT_API_ERROR_MESSAGES`

پیام‌های fallback ماژول برای زمانی است که بک‌اند بدنه‌ی معتبر ندارد. این پیام‌ها
متن نهایی UI نیستند و mapper هر feature باید پیام مناسب فارسی را انتخاب کند.

```ts
console.log(DEFAULT_API_ERROR_MESSAGES.network);
```

## تایپ‌ها

### `ApiErrorData`

نسخه‌ی قابل سریال‌سازی `ApiError` است. برای Server Action result، state و store از آن
استفاده کنید.

```ts
type Result = { ok: true } | { ok: false; error: ApiErrorData };
```

### `ApiErrorDetail`

ساختار خطای یک فیلد است:

```ts
const detail: ApiErrorDetail = {
  field: 'email',
  code: 'isEmail',
  message: 'فرمت ایمیل معتبر نیست.',
};
```

### `ApiErrorKind`

منشأ فنی شکست را مشخص می‌کند:

```ts
type ApiErrorKind = 'network' | 'http' | 'invalid-response' | 'aborted' | 'unexpected';
```

- `network`: ارتباط با سرور برقرار نشده است.
- `http`: سرور پاسخ ناموفق HTTP داده است.
- `invalid-response`: پاسخ موفق با قرارداد مورد انتظار تطبیق ندارد.
- `aborted`: درخواست با `AbortController` لغو شده است.
- `unexpected`: خطای ناشناخته‌ی سمت کلاینت.

### `ApiErrorSource`

مشخص می‌کند پیام از بک‌اند آمده یا fallback فرانت است:

```ts
type ApiErrorSource = 'backend' | 'default';
```

پیام با `source: 'backend'` فقط بعد از اعتبارسنجی ساختار پاسخ نگه داشته می‌شود.

### `ApiErrorCategory`

دسته‌بندی سطح بالای خطای بک‌اند است:

```ts
type ApiErrorCategory = 'validation' | 'client' | 'domain' | 'technical';
```

- `validation`: ورودی یا فیلد نامعتبر؛
- `client`: درخواست نامعتبر، عدم ورود یا نداشتن دسترسی؛
- `domain`: نقض قانون کسب‌وکار؛
- `technical`: خطای داخلی سرور.

### `ApiResponseType`

فرمت پاسخ مورد انتظار از `apiRequest` است:

```ts
type ApiResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'void';
```

### `ApiDataParser<T>`

امضای parser پاسخ موفق JSON است:

```ts
type ApiDataParser<T> = (data: unknown) => T;
```

می‌توانید parser را با Zod یا هر validator زمان اجرای دیگری بسازید.

## الگوی پیشنهادی پوشه‌ها

```text
features/invoice/
  lib/
    invoice-api.ts               # apiRequest و parser پاسخ موفق
    invoice-response-parsers.ts  # schemaهای runtime
  utils/
    mapInvoiceError.ts           # پیام‌های فارسی مخصوص Invoice
  hooks/
    useCreateInvoice.ts          # catch unknown و اتصال خطا به UI
```

هسته‌ی مشترک فقط خطا را استاندارد می‌کند. معنی business codeها و متن مناسب کاربر در
feature مالک آن باقی می‌ماند.

## نمونه‌ی واقعی پروژه

- درخواست‌ها: `apps/frontend/src/core/features/auth/lib/auth-api.ts`
- parser پاسخ موفق: `apps/frontend/src/core/features/auth/lib/auth-response-parsers.ts`
- تبدیل خطا به پیام UI: `apps/frontend/src/core/features/auth/utils/mapAuthError.ts`
- استفاده در hook: `apps/frontend/src/core/features/auth/hook/useSignIn.ts`
- عبور خطا از Server Action: `apps/frontend/src/core/features/auth/lib/auth-storage.ts`
