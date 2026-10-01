# 17 — Command, Query و Domain Event Contracts

- وضعیت: پذیرفته‌شده
- نسخه: v1
- مرجع اجرا: `apps/backend/src/shared/messaging/` (SHR-003)

## 1. هدف

این سند قرارداد مشترک پیام‌های درون‌سیستمی را ثبت می‌کند تا Intent، Read و Fact از هم
جدا بمانند و ماژول‌ها فقط از مسیر قرارداد رسمی با هم صحبت کنند، بدون اینکه NestJS،
HTTP، Redis، ORM یا Provider وارد Shared Kernel شود. مبنا ADR-005 (مدل Command /
Query / Domain Event)، ADR-002 بخش‌های ۱۰ و ۱۲ (Shared Kernel و مرز ماژول‌ها)، ADR-004
بخش‌های ۱۱ و ۱۴ (Idempotency و Outbox) و ADR-008 بخش ۱۳ (Context عبوری) است.

**خارج از محدوده:** Bus، Dispatcher، Outbox، Transport (Redis/Queue)، Event
Persistence، DTOهای HTTP و Command/Query/Eventهای تجاری. این سند فقط **قرارداد شکل**
را می‌سازد؛ اجرا و تحویل بعداً و در Infrastructure انجام می‌شود.

## 2. سه مفهوم

```text
Command → «سیستم چه کاری باید انجام دهد؟»   (نیت؛ ممکن است State را تغییر دهد)
Query   → «چه اطلاعاتی لازم دارم؟»          (خواندن؛ بدون Side Effect کسب‌وکاری)
Event   → «چه اتفاقی افتاده است؟»            (Factِ رخ‌داده)
```

یک عملیات سه‌گونه نوشته می‌شود، نه یک‌گونه:

| عملیات | Command | Query | Event |
| --- | --- | --- | --- |
| تأیید پرداخت | `ApprovePayment` | `GetPayment` | `PaymentApproved` |

این تفکیک در **ساخت** پیام اعمال می‌شود، نه در توضیح آن: `shared/messaging/message-name.ts`
نامِ Command گذشته‌زمانی و نامِ Event فعلی را رد می‌کند، پس نمونه‌های `CreateFiscalYear`,
`PostAccountingDocument` و `RecordPurchase` هرگز نمی‌توانند Event باشند.

## 3. Command — `shared/messaging/command.ts`

```ts
export class PostAccountingDocument extends Command<PostingPayload> {
  public constructor(payload: PostingPayload, options?: MessageOptions) {
    super('PostAccountingDocument', payload, options);
  }
}
```

- `payload` همان ورودی Use Case است؛ **نتیجه جای دیگری ساخته می‌شود** (نتیجه ← `Result`
  از سند ۱۶). Command فقط «درخواست» است.
- نام با فعل و نیت کسب‌وکاری می‌آید و در ساخت اعتبارسنجی می‌شود.
- وابسته به HTTP/Transport نیست: نه Route، نه Verb، نه Status در قرارداد هست.
- برای عملیات حساس، `messageId` صریح به‌عنوان Idempotency Key داده می‌شود
  (ADR-004، بخش ۱۱).
- Command ممکن است State را تغییر کند؛ بنابراین Authorization و Preconditions در
  Use Case اجرا می‌شوند، نه در قرارداد.

## 4. Query — `shared/messaging/query.ts`

```ts
export class GetSupplierBalance extends Query<{ supplierId: string }> {
  public constructor(params: { supplierId: string }, options?: MessageOptions) {
    super('GetSupplierBalance', params, options);
  }
}
```

- `params` دادهٔ ساده است؛ قرارداد مستقل از ORM، Read Model و جدول است.
- از دید Application **بدون Side Effect** است؛ نباید Domain State را تغییر کند
  (ADR-005، بخش ۳).
- Query یک ماژول نباید مستقیم Persistence داخلی ماژول دیگر را بخواند؛ از قرارداد
  منتشرشدهٔ ماژول مقصد عبور می‌کند.
- سازگاری (Strong/Eventual) تصمیم ماژول مالک است، نه بخشی از قرارداد
  (ADR-005، بخش ۱۲).

## 5. Domain Event — `shared/messaging/domain-event.ts`

```ts
export class AccountingDocumentPosted extends DomainEvent<PostedData> {
  public constructor(data: PostedData, options?: MessageOptions) {
    super('AccountingDocumentPosted', data, options);
  }
}

// بعد از تغییر معتبر State، نه قبل از آن:
const raised = new AccountingDocumentPosted(data, causedBy(command));
```

چهار قاعده که از «Fact» بودن می‌آیند:

1. **نام گذشته‌زمانی است** (`FiscalYearCreated`)؛ نام فعلی مثل `CreateFiscalYear` رد
   می‌شود. Event درخواست کار نیست (ADR-005، بخش ۱۳).
2. **بعد از وقوع ساخته می‌شود** — فقط از Domain یا Application و فقط پس از تغییر
   Stateِ معتبر؛ Controller و Integration اجازهٔ ساخت Event مصنوعی ندارند
   (ADR-005، بخش ۶).
3. **Immutable است** — خود پیام و `data` آن در ساخت `deep-freeze` می‌شوند؛ پس Fact ثبت‌شده
   بعداً قابل ویرایش نیست. `data` باید دادهٔ ساده و مستقل باشد، **نه Entity زنده**؛
   freeze کردن به ساختاری که Domain هنوز تغییر می‌دهد نباید برسد.
4. **نسخه‌دار است** — `metadata.version` (بخش ۹).

## 6. نام‌گذاری — `shared/messaging/message-name.ts`

| قاعده | Command | Query | Event |
| --- | --- | --- | --- |
| شکل | PascalCase | PascalCase | PascalCase |
| معنی | فعل امری، نه گذشته | شروع با `Get, List, Search, Find, Count, Sum, Exists` | گذشته (`ed` یا شکل نامنظم مثل `Sent`) |
| پسوند مجاز | `Command` | `Query` | `Event` |

- پسوندِ نوع قبل از بررسی معنایی حذف می‌شود؛ پس `PostAccountingDocumentCommand` و
  `FiscalYearCreatedEvent` معتبرند، ولی نامِ **فقط** شامل پسوند (`Command`) رد می‌شود.
- نامِ بد یک خطای برنامه‌نویسی است و با `InvalidPrimitiveError` (همان مسیر بقیهٔ
  Primitiveها) رد می‌شود — نه با `DomainError`.
- تشخیص دستوری/گذشته‌زمانی عمدتاً شکلی است و فقط «فرم» را قضاوت می‌کند؛ اینکه اصلاً
  کدام Command لازم است، تصمیم ماژول مالک است.

## 7. Metadata — `shared/messaging/message-metadata.ts`

هر سه پیام یک پوشش واحد دارند: `kind` + `name` + `metadata` + بدنه (`payload` /
`params` / `data`).

| فیلد | معنی |
| --- | --- |
| `messageId` | هویت پیام (پیش‌فرض: UUID جدید) — کلید Idempotency/Dedup |
| `messageType` | نام پایدار قرارداد (همان `name`) |
| `timestamp` | زمان ساخت، ISO 8601 با `Z` (پیش‌فرض: `now`) |
| `version` | نسخهٔ قرارداد، عدد صحیح `1..9999` (پیش‌فرض: `1`) |
| `tenantId` | مالکِ داده — اختیاری |
| `correlationId` | تعلق پیام به یک جریان/Request — اختیاری |
| `causationId` | پیامِ مسببِ مستقیم — اختیاری |

- metadata پیش‌فرض **دقیقاً همین هفت فیلد** را دارد؛ هیچ فیلد HTTP، Status، Header یا
  مفهوم تجاری در آن نیست و کل شیء با `JSON.stringify` سریال می‌شود.
- همهٔ مقادیر `string` ساده و کوتاه (`[A-Za-z0-9._:-]`، حداکثر ۱۲۸ کاراکتر) یا عدد
  صحیح‌اند؛ مقدار ساختاریافته (شیء، JSON، مسیر فایل) رد می‌شود.
- `timestamp` فقط UTC با پسوند `Z`؛ آفست محلی پذیرفته نمی‌شود.
- metadata و خود پیام بعد از ساخت `freeze` می‌شوند.

## 8. Tenant Scope

- پیامِ Tenant-scoped باید `tenantId` همراه داشته باشد تا Application بتواند
  Isolation را اعمال کند؛ `causedBy(...)` آن را به اثرها ارث می‌دهد.
- **هویت Tenant از Client پذیرفته نمی‌شود.** `tenantId` را Application Layer از
  Principal احرازشده استخراج و به قرارداد می‌دهد؛ نه از Body درخواست، نه از Headerِ
  دلخواه. تشخیص «این فلانی است و حق دارد برای این Tenant کار کند» بخش Security/
  Application است (ADR-010)، نه Shared Kernel.

## 9. Event Versioning

- هر پیام `version` صریح دارد؛ Event بدون نسخه ساخته نمی‌شود (پیش‌فرض ساختاریافتهٔ `1`).
- تغییر Breaking در معنی یا ساختار Event باید با `version` جدید اعلام شود؛ مصرف‌کننده
  بر اساس `(name, version)` تصمیم می‌گیرد و نسخهٔ قدیمی برایش بی‌صدا عوض نمی‌شود
  (ADR-005، بخش ۱۱).
- نسخه به **نوع قرارداد** تعلق دارد، نه به هر رکورد؛ عدد خارج از `1..9999` یا کسری
  در ساخت رد می‌شود.

## 10. Correlation و Causation

```ts
const command = new PostAccountingDocument(payload, {
  tenantId: tenant,          // از Principal احرازشده
  correlationId: requestId,  // جریانِ درخواست
});

const event = new AccountingDocumentPosted(data, causedBy(command));
// event.metadata.causationId   = command.metadata.messageId
// event.metadata.correlationId = requestId (یا در نبودِ آن، خودِ messageId)
// event.metadata.tenantId      = tenant
```

- `causationId` علتِ **مستقیم** است؛ `correlationId` یک شناسهٔ واحد برای کل جریان، از
  مرزهای ماژول هم عبور می‌کند.
- هر override صریح بر هر چیز ارث‌برده مقدم است.

## 11. مرز ماژول‌ها

قراردادها همان چیزی هستند که ADR-002 بخش ۱۲ اجازه می‌دهد:

| مجاز | ممنوع |
| --- | --- |
| فرستادن Command از مرز Application ماژول مقصد | `import` کردن Entity داخلی ماژول دیگر |
| اجرای Query از مرز Query منتشرشده | دسترسی مستقیم به Repository ماژول دیگر |
| Publish/Subscribe روی Domain Event | خواندن جدول یا مدل ORM ماژول دیگر |

ماژول مالک، قراردادهایش (`Command`/`Query`/`DomainEvent` مشتق‌شده) را منتشر می‌کند؛
بقیه فقط همان‌ها را می‌سازند و اجرا می‌کنند. دادهٔ بدنه باید ساده و مستقل باشد، چون از
مرز رد می‌شود.

## 12. مرز استثنا

```text
شکست منتظر   →  Result / DomainError   (سند ۱۶)
کارِ درخواستی →  Command / Query        (این سند)
واقعیت رخ‌داده →  Domain Event           (این سند)
خرابی فنی     →  Exception / Infrastructure
```

قرارداد پیام هیچ‌وقت حامل خطا نیست: اگر Use Case کار نکرد، `Result.fail(...)`
برمی‌گردد؛ خطای فنی throw می‌شود. Event هم فقط بعد از موفقیت ساخته می‌شود.

## 13. معیار پذیرش

- قرارداد Command، Query و Domain Event پایدار موجود است و نیت/خواندن/واقعیت از هم
  تفکیک‌پذیر است.
- نام Command فعلِ امری، نام Query درخواست اطلاعات و نام Event گذشته‌زمانی است؛ نامِ
  ناسازگار در ساخت رد می‌شود.
- Metadata شامل شناسه، نوع، زمان، Tenant، Correlation، Causation و Version است و
  بدون هیچ فیلد Transport/کسب‌وکار سریال می‌شود.
- Event با `version` صریح ساخته و بعد از ساخت immutable است (شیء و `data`).
- `tenantId` قابل حمل است و هویتش از Client گرفته نمی‌شود.
- قراردادها بدون NestJS، HTTP، Redis، MySQL، ORM و Provider SDK کامپایل می‌شوند
  (`src/shared/framework-independence.spec.ts`).
- Unit Testها نام‌ها، Metadata، Version، Immutable بودن و تفکیک سه نوع را پوشش می‌دهند؛
  `pnpm verify` سبز است.
