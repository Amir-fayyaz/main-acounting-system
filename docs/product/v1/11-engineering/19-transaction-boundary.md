# 19 — Transaction Boundary

- وضعیت: پذیرفته‌شده
- نسخه: v1
- مرجع اجرا: `apps/backend/src/shared/transaction/` (SHR-005) و
  `src/infrastructure/database/`
- مبنای تصمیم: ADR-004 (مرز Transaction و مدل Consistency)، ADR-003 (بخش ۱۸)،
  قواعد Engineering 01/07/12

## 1. هدف

این سند قرارداد **مرز Transaction** را ثبت می‌کند: یک Use Case چگونه چند عملیات Persistence
را به‌صورت یک واحد اتمیک Commit یا Rollback می‌کند، بدون اینکه Domain یا Application به
MySQL، Drizzle یا هر پیاده‌سازی دیگری وابسته شود. مالکیت مرز صریح است: Application تصمیم
می‌دهد چه چیزی با هم پایدار می‌ماند.

**خارج از محدوده:** Transaction توزیع‌شده، Transaction بین میکروسرویس‌ها، Transaction
پیام‌رسان‌ها (Kafka / RabbitMQ)، مدیریت Transaction ارائه‌دهندگان خارجی، قاعدهٔ تجاریِ
خاص، orchestration اجرای Agent، Compensation Workflow کامل، Journal اجرای چندمرحله‌ای و
Clustering پروداکشن.

## 2. مالکیت — چه کسی مرز را باز و بسته می‌کند

```text
Application (Use Case)     تصمیم: چه چیزی در مرز است ← execute / commit / rollback
    │
    ├── shared/transaction/     قرارداد + قاعدهٔ رفتار (بدون وابستگی)
    │
Infrastructure (Adapter)   مکانیک: اتصال، BEGIN، COMMIT، ROLLBACK
    │
Domain                     هرگز — نه شروع، نه commit، نه rollback، نه مشاهده
```

- **Application مالک هماهنگی است:** یک Use Case با `TransactionBoundary.execute` مرز را
  باز می‌کند و مشخص می‌کند کدام عملیات با هم commit می‌شوند (ADR-004، بخش‌های ۴ و ۵).
- **مکانیک Driver در Infrastructure است:** `DrizzleTransactionRunner` تنها جایی است که
  می‌داند تراکنش یک اتصال از Pool با `BEGIN` است (ADR-003، بخش ۹).
- **Domain دسترسی ندارد:** `module-boundaries.spec.ts` روی کدِ واقعی اجرا می‌کند و اگر یک
  فایل `domain/` به `src/shared/transaction/` دست بزند، تست‌ها fail می‌شوند (ADR-004،
  بخش ۶).

```text
begin  →  اجرای عملیات اتمیک  →  commit
begin  →  اجرای عملیات اتمیک  →  شکست  →  rollback
```

## 3. قرارداد

منبع: `shared/transaction/transaction-boundary.ts` و `transaction-context.ts`

| قرارداد | نقش | مصرف‌کننده |
| --- | --- | --- |
| `TransactionBoundary.execute(work)` | تنها درگاهِ باز کردن مرز: commit در موفقیت، rollback در شکست | Application (توکن `TRANSACTION_BOUNDARY`) |
| `TransactionRunner.run(work)` | مکانیکِ Driver: یک اتصال، commit هنگام resolve، rollback هنگز reject | فقط Adapter (`DrizzleTransactionRunner`) |
| `TransactionContext.current()` / `currentHandle<T>()` | انتشارِ تراکنشِ باز در زنجیرهٔ async — فقط مشاهده، نه کنترل | Repository Adapter |
| `scopedDatabase(db)` | بازگرداندنِ اتصالِ تراکنشِ فعال یا اتصالِ عادي، هرگز تراکنش جدید | Repository Adapter |

```text
Use Case ── execute ──► boundary ── run ──► Drizzle/MySQL
                          │
                          ├─ TransactionContext (انتشار در زنجیرهٔ async)
                          └─ scopedDatabase ← repositoryها همین‌جا شرکت می‌کنند
```

## 4. Atomicity و Commit

- همهٔ عملیاتی که باید با هم پایدار بمانند داخل **یک** مرز اجرا می‌شوند و روی **یک**
  اتصال می‌نشینند؛ چند Repository می‌توانند در یک تراکنش شرکت کنند بی‌آنکه پارتِ آن‌ها
  (SHR-004) پارامتر تراکنش بگیرد.
- شرط Commit: `work` resolve شود **و** هیچ شکستی داخلِ مرز گزارش نشده باشد.
- `Result.fail` که خودِ Use Case برمی‌گرداند، شکستِ تصمیم‌گرفته‌شدهٔ کسب‌وکار است: مرز
  rollback می‌کند و همان `Result` را بدون تغییر به بیرون می‌دهد.

## 5. Rollback — یک قاعده، دو کانالِ شکست

| شکستِ داخلِ مرز | رفتار مرز | چیزی که به بیرون می‌رسد |
| --- | --- | --- |
| `work` throw کند (ریشه) | Rollback همهٔ تغییرات مرز | همان خطای اصلی، دست‌نخورده |
| یک عملیاتِ تو در تو throw کند و caller آن را بلعیده و ادامه دهد | مرز **rollback-only** می‌شود؛ اگر `work` «موفق» تمام شود همه‌چیز rollback و `TransactionBoundaryError` | خطا، با `cause` = اولین شکست |
| `work` با `Result.fail` تمام شود | Rollback همهٔ تغییرات مرز | همان `Result.fail` |
| عملیاتِ تو در تو `Result.fail` برگرداند و caller ادامه دهد | مرز rollback-only؛ commit ممکن نیست | `TransactionBoundaryError` |

- نتیجه: مرز **یا کامل commit می‌شود، یا اصلاً** — اجرای ناقصِ بی‌صدا غیرممکن است
  (ADR-004، بخش ۱).
- **Rollback فقط اثر دیتابیس را برمی‌گرداند.** اگر شکستِ منتظر را می‌شود و باید ادامه
  داد، شکست را **قبل از** باز کردن مرز ارزیابی کنید، یا ادامهٔ کار مرزِ جداگانهٔ خودش را
  دارد.

## 6. Nested Transaction — فقط Join

- `execute` داخلِ یک مرزِ باز، در **همان** مرز شرکت می‌کند: نه begin جدا، نه commit
  مستقل، نه savepoint. قاعدهٔ پیش‌فرض همین است و در V1 راه فراری برای آن نیست.
- هدف: «commit مستقلِ تصادفیِ یک عملیاتِ تو در تو» اصلاً بیان‌پذیر نباشد (ADR-004، بخش ۶).
- شکستِ یک فرایندِ تو در تو، شکستِ کلِ مرز است؛ caller نمی‌تواند با بلعیدنِ آن، نیمی از
  کار را نگه دارد.
- Savepoint عمداً وجود ندارد: مرزِ نیازمندِ گریدِ ریزتر، مرزِ روشن‌تری است، نه دو مرزِ
  روی‌هم.

## 7. Propagation — انتشار از راهِ قراردادِ مصوب

- تراکنشِ فعال از راهِ `TransactionContext` — یک `AsyncLocalStorage` روی
  `node:async_hooks` — در زنجیرهٔ async منتشر می‌شود: از `await` به `await`، بدون
  پاس دادنِ پارامتر و بدون هیچ APIِ خاصِ فریم‌ورک.
- Application هیچ APIِ مخصوصِ پیاده‌سازی (HTTP middleware، Redis، Provider) را نمی‌بیند؛
  یک Port و یک context مصوب کافی است.
- Scope به اندازهٔ خودِ `work` است: کارِ fire-and-forget که داخلِ مرز شروع شود دیگر داخلِ
  آن نیست — آنچه بعد از مرز اتفاق می‌افتد تصمیمِ جداگانه است، نه وضعیتِ تراکنش
  (ADR-004، بخش ۹).

## 8. مشارکت Repository

```ts
// infrastructure/persistence/ — هر نوشتن از همین یک خط عبور می‌کند
const db = scopedDatabase(this.database);
await db.insert(invoices).values(row);
```

- داخلِ مرز: اتصالِ تراکنشِ فعال → نوشتن با مرز commit یا rollback می‌شود و تا قبل از آن
  برای اتصال‌های دیگر دیده نمی‌شود.
- خارجِ مرز: اتصالِ عادی → هر Statement واحد خودش است؛ حالتِ طبیعیِ یک Read یا یک
  نوشتنِ مستقل.
- **Repository هرگز برای خودش تراکنش نمی‌سازد:** شرکت یا نشدن تصمیمِ Use Case است، نه
  تصمیمِ Adapter (ADR-004، بخش ۶).

## 9. مرزِ اثر دیتابیس و اثر خارجی

| | اثر دیتابیس (داخل مرز) | اثر خارجی (Provider API، فایل/Object Storage، Notification، ارسال مالیات) |
| --- | --- | --- |
| اجرای مجدد/واگردانی با Rollback | بله | **هرگز** |
| مسیرِ درستِ واگردانی | خودِ Transaction | Retry / Compensation / Correction / Reversal / رسیدگی به Outcome نامعلوم |

- اثر خارجیِ داخلِ مرز، بخشی از تراکنش نیست: rollback آن را از بین نمی‌برد و نباید
  این‌طور وانمود کرد (ADR-004، بخش‌های ۹، ۱۲–۱۳).
- الگوی مصوب: اثر خارجی را بعد از Commit انجام دهید یا با State Machine + Idempotency
  ثبت کنید؛ Timeout یعنی Outcome نامعلوم، نه شکستِ قطعی — Blind Retry ممنوع است.

## 10. Concurrency

- مرز رفتارِ همزمانی را عوض **نمی‌کند:** هر نوشتن همچنان `expectedRevision` خود را
  اعلام می‌کند (SHR-004؛ ADR-004، بخش ۲۷) و تداخل یعنی `PersistenceError(CONFLICT)`، نه
  بازنویسی.
- تداخلِ همزمان داخلِ مرز: شکستِ تداخل به `ConflictError` ترجمه می‌شود، مرز rollback
  می‌شود و نوشتنِ برندهٔ دیگری دست‌نخورده می‌ماند.
- عملیاتِ حساس قبل از Commit و داخلِ مرز، وضعیتِ جاری را دوباره می‌خواند و اصلاحیه را
  تازه می‌کند؛ این مسئولیتِ Use Case/Domain است، نه مرز (ADR-004، بخش‌های ۲۹–۳۰).

## 11. الگوهای ممنوع

```text
❌ Domain ← shared/transaction (شروع/پایان/مشاهدهٔ تراکنش)
❌ Repository که داخلِ مرز برای خودش تراکنش مستقل می‌سازد
❌ commit مستقلِ یک فراخوانیِ تو‌درونِ یک مرزِ باز
❌ درمانِ اثر خارجی با Rollback یا وعدهٔ rollback برای آن
❌ وابستگی به HTTP / Redis / Provider Transaction API
❌ begin/commit/rollback پراکنده در Use Case به‌جای execute
❌ ادامهٔ کار و Commit بعد از شکستِ بلعیده‌شده درونِ مرز
```

دو گارد ساختاری روی کدِ واقعی اجرا می‌شوند:

- `src/modules/module-boundaries.spec.ts` — Domain به `src/shared/transaction/` دست
  نمی‌زند.
- `src/shared/framework-independence.spec.ts` — قرارداد هیچ وابستگی به فریم‌ورک یا
  درایور ندارد.

## 12. استفادهٔ نمایندگی

```ts
// application/commands/post-invoice.ts (توکن TRANSACTION_BOUNDARY تزریق می‌شود)
constructor(@Inject(TRANSACTION_BOUNDARY) private readonly transactions: TransactionBoundary) {}

async execute(command: PostInvoice): Promise<Result<Invoice, DomainError>> {
  try {
    return await this.transactions.execute(async () => {
      const customer = await this.customers.get(command.customerId); // شرکت در تراکنش
      if (customer === undefined) return Result.fail(new NotFoundError('No such customer.'));
      if (customer.state !== 'Active') return Result.fail(new BusinessRuleError('Inactive.'));

      await this.invoices.add(invoice);        // همان اتصال، همان مرز
      await this.ledger.post(posting);          // با invoices با هم commit می‌شود
      return Result.ok(invoice);
    });
  } catch (error) {
    if (error instanceof PersistenceError) {
      const domainError = error.toDomainError();
      if (domainError !== undefined) return Result.fail(domainError); // CONFLICT
    }
    throw error; // بقیه فنی می‌ماند
  }
}
```

نمونهٔ کامل و اجرایی در `src/shared/transaction/transaction-boundary.spec.ts` است.

## 13. تست‌ها

| سطح | فایل | پوشش |
| --- | --- | --- |
| واحد (قرارداد) | `src/shared/transaction/transaction-boundary.spec.ts` | Commit، Rollback، Joinِ تو در تو، rollback-only، اثر خارجی، تداخلِ Revision، revalidation |
| واحد (انتشار) | `src/shared/transaction/transaction-context.spec.ts` | نبودِ context بیرون، انتشار در اعماقِ await، پاک‌شدن بعد از rollback، مرزهای موازی |
| واحد (مشارکت) | `src/infrastructure/database/scoped-database.spec.ts` | اتصالِ تراکنش داخلِ مرز، اتصالِ عادی بیرون |
| گارد | `src/modules/module-boundaries.spec.ts` | Domain هرگز به مرز دسترسی ندارد |
| یکپارچه (MySQL) | `test/transaction-boundary.e2e-spec.ts` | با `MYSQL_INTEGRATION=1`: Commit چندعملیاتی، Rollback کامل، نامرئی‌بودن تا Commit، شکستِ بلعیده‌شده، تداخلِ همزمان، جداسازی اثر خارجی |

```bash
pnpm infra:up
MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
```

## 14. معیار پذیرش

- قرارداد Transaction Boundary وجود دارد و مالکیتش با Application است.
- Domain نمی‌تواند تراکنش را کنترل کند (گارد ساختاری).
- چند عملیات Repository در یک مرز شرکت می‌کنند و با هم commit می‌شوند.
- شکستِ داخلِ مرز، همهٔ تغییراتِ همان مرز را rollback می‌کند.
- Repository داخلِ مرز، تراکنش مستقل نمی‌سازد.
- رفتار Nested (فقط Join) و Propagation (Context مصوب) صریحاً تعریف شده است.
- اثر خارجی از معنای تراکنش دیتابیس جدا نگه داشته شده است.
- رفتار با مدل optimistic concurrency سازگار است و overwrite بی‌صدا ندارد.
- قرارداد به HTTP، Redis یا APIِ خاصِ Provider وابسته نیست.
- تست‌های خودکار Commit و Rollback را پوشش می‌دهند؛ `pnpm verify` (typecheck، lint،
  format، test، build) سبز است.
