# 20 — Transactional Outbox

- وضعیت: پذیرفته‌شده
- نسخه: v1
- مرجع اجرا: `apps/backend/src/infrastructure/outbox/` (SHR-006)
- مبنای تصمیم: ADR-004 (بخش‌های ۱۴–۱۵ و ۲۳)، ADR-005 (بخش‌های ۶–۷، ۱۰–۱۱)، FND-007،
  قواعد Engineering 01/07/12

## 1. هدف

این سند **Transactional Outbox** را ثبت می‌کند: چگونه یک رویداد Domain که در همان لحظهٔ
تغییر State رخ داده، به‌صورت اتمیک با همان تراکنش در دیتابیس ثبت می‌شود و سپس یک
ناشرِ مستقل آن را به Stream داخلی می‌رساند — بی‌آنکه هیچ دو-نوشتنی (dual write) پیش بیاید،
یعنی نه دیتابیس و Redis همزمان commit می‌شوند و نه شکستِ یکی از دیگری جا می‌ماند
(ADR-004، بخش ۱۴).

**خارج از محدوده:** مصرف‌کننده‌ها/Handlerهای تجاری رویداد، Redis به‌عنوان Source of Truth،
Kafka / RabbitMQ، Transaction توزیع‌شده، Event Sourcing، Projection، رویدادهای Agent،
پلتفرم استریم پیام و «Exactly-once تحویل واقعی» — آخری عمداً وعده داده نمی‌شود چون
در سرتاسرِ Crash قابل تحویل نیست (ADR-004، بخش ۱۵).

## 2. مالکیت — مسیرِ یک رویداد

```text
Application (Use Case)      تصمیم: این رویداد رخ داده ← record داخلِ مرزِ باز
    │
Infrastructure (Outbox)     ضبط (OutboxRecorder + OutboxStore) — همان تراکنش
    │
Infrastructure (Dispatcher) انتشار (OutboxPublisher ← EventPublisherPort)
    │
Infrastructure (Adapter)    Redis Stream ← Worker/Scheduler با FND-007
    │
Consumer (ماژولِ مربوطه)    مصرفِ رویداد — خارج از این سند
```

- **Application مالک «کِی» است:** رویداد را داخلِ `TransactionBoundary.execute` ثبت می‌کند؛
  اگر تراکنش rollback شود، رکورد هم بر می‌گردد — رویدادِ ثبت‌شده رویدادِ رخ‌داده است.
- **Outbox مالک «چگونه» است:** جدول، State Machine، تلاش مجدد و انتشار همگی
  `src/infrastructure/outbox/` هستند — بدون هیچ قاعدهٔ تجاری و بدون هیچ ستونِ
  Domain‌ای، پس هرگز پنجرهٔ خلفیِ دادهٔ ماژول نمی‌شود (ADR-003).
- **Domain دسترسی ندارد:** `module-boundaries.spec.ts` روی کدِ واقعی اجرا می‌شود؛
  `domain/` نه `OUTBOX_RECORDER` را می‌شناسد نه `shared/transaction/` را.

## 3. قرارداد — سه Port، یک ضبط‌کننده

منبع: `src/infrastructure/outbox/`

| قرارداد | توکن | نقش | مصرف‌کننده |
| --- | --- | --- | --- |
| `OutboxRecorder.record(event)` | `OUTBOX_RECORDER` | ثبتِ اتمیکِ رویداد در تراکنشِ باز — بدون مرز throw می‌کند | Use Case |
| `OutboxStore` | `OUTBOX_STORE` | مرز Persistence: `add`، `claimDue`، `markPublished/Retrying/Failed`، `releaseStale`، `requeue` | فقط Outbox internals |
| `EventPublisherPort.publish(event)` | `EVENT_PUBLISHER` | مرز انتشار: یک Append روی مقصد | `OutboxPublisher` |
| `OutboxPublisher.publishBatch()` | `OUTBOX_PUBLISHER` | یک اجرای کاملِ Dispatcher: بازیابی + ادعا + تسویه | Job (`OUTBOX_PUBLISH_JOB`) |

- پورت‌ها زبانِ محدود می‌دهند: نه Query Language، نه `delete`، نه ORM Type — Adapter خودش
  جدول و اتصال را می‌شناسد (ADR-002، بخش ۱۵؛ سند ۱۸).
- Adapterها پشتِ توکن‌اند و خروجیِ Module صرفاً ضبط‌کننده، ناشر و Job/Schedule است؛
  هیچ مصرف‌کننده‌ای مستقیماً به Adapter دسترسی ندارد.

## 4. نوشتن رکورد — همان تراکنش، یک‌بار سریالایز

```ts
// application/commands/post-invoice.ts — داخلِ مرزِ باز (SHR-005)
await this.transactions.execute(async () => {
  await this.invoices.add(invoice);
  await this.outbox.record(new InvoicePosted(data, causedBy(command))); // همان اتصال
  return Result.ok(invoice);
});
```

دو قاعده کلِ الگو را حمل می‌کنند:

- **همان تراکنش، اجباری.** `record` بدونِ `TransactionContext.current()` با
  `OutboxTransactionRequiredError` رد می‌شود و چیزی نمی‌نویسد: رکوردِ بیرونِ مرز، دومین
  نوشتنِ مستقل است — دقیقاً همان dual write که ADR-004 بخش ۱۴ وجودش را منتفی می‌کند.
  داخلِ مرز، `add` از `scopedDatabase` عبور می‌کند، پس با تغییر State کنارِ آن commit
  یا rollback می‌شود و تا پیش از آن برای اتصال‌های دیگر دیده نمی‌شود.
- **هویتِ رویداد همین‌جا ثابت می‌شود.** Payload برابرِ `JSON.stringify(event.toJSON())`
  است و `event_id` همان `metadata.messageId` — نه تولیدِ مجدد، نه تغییر در هیچ تلاشِ بعدی.
  هر انتشارِ بعدی همین Byteها را با همین هویت می‌فرستد؛ مصرف‌کننده روی همان Id
  Dedup می‌کند (ADR-005، بخش ۱۰؛ ADR-004، بخش ۱۵).

ستون‌های قابل‌پرسش (tenant, correlation, causation, type, version) جداگانه نوشته
می‌شوند تا عملیات بی‌آنکه Payload را Parse کند بپرسد «چه چیزی گیر کرده، برای کی؟»؛
خِلأِ Payload همان Byteهایی است که به Stream می‌رود.

## 5. State Machine — هر گذار، قطعی

```text
pending ──── claim ────► publishing ── ok ────► published
   ▲                        │  │
   │                  transient   permanent / بودجه تمام
   │                        │  │
   │ requeue (بازیابی دستی)  ▼  ▼
   └──── failed ◄────────────┘  └──── retrying ── موعد ──► publishing
```

| State | معنا | خروج |
| --- | --- | --- |
| `pending` | داخلِ تراکنش ثبت شده، هنوز امتحان نشده | ادعا (claim) |
| `publishing` | متعلقِ یک اجرای ناشر، با `claim_id` علامت‌خورده | تسویه یا رهاکردنِ اجرا |
| `retrying` | شکستِ گذرا؛ دوباره در `next_attempt_at` موعد دارد | ادعا در اجرای بعدی |
| `failed` | دائمی، یا بودجهٔ تلاش تمام — برای همیشه نگه داشته می‌شود | فقط `requeue` دستی |
| `published` | به مرزِ انتشار رسیده؛ Terminal | — |

- `attempt_count` را **ادعا** بالا می‌برد، نه انتشار — پس عددِ تلاشِ صرف‌شده همیشه درست
  است و بررسیِ بودجه نیاز به شمارندهٔ دوم ندارد.
- `last_failure` یک خطِ کوتاه و Redact-شده است (حداکثر ۵۰۰ نویسه، با SecretRedactor) —
  نه انباشتِ استثناها، نه Connection String (06-security-engineering).

## 6. انتشار — یک اجرای Dispatcher

```text
releaseStale → claimDue → publish → markPublished
                        ↘ (گذرا)  markRetrying + Backoff مرزبندی‌شده
                        ↘ (دائمی) markFailed، نگه‌داری برای بازیابی
```

- **چیزی پیش از Commit منتشر نمی‌شود:** Dispatcher فقط رکوردِ Commit-شده می‌بیند —
  خواندنِ از دیتابیس، همان Readِ متداول است؛ تا وقتی تراکنشِ نویسنده باز است Row دیده
  نمی‌شود.
- **یک Owner برای هر رکورد:** ادعا یک Statement اتمیک است: `UPDATE … SET state='publishing',
  claim_id=?` با `ORDER BY created_at, id LIMIT n` — برندهٔ Race همان کسی است که ردیف را
  می‌گیرد؛ ناشرهای همزمان Batch را تقسیم می‌کنند نه دوبار انتشار.
- **Batch مرزبندی‌شده:** حداکثر `OUTBOX_BATCH_SIZE` رکورد در هر اجرا؛ بقیه در اجرای بعدی
  (و اجرای بعدیِ Scheduler) منتظر می‌مانند.

## 7. تلاش مجدد، Backoff و شکست — دو مسیرِ متفاوت

| شکست | مسیر | دلیل |
| --- | --- | --- |
| گذرا (اتصال، Timeout، ناشناخته) | `markRetrying` + `next_attempt_at` با Backoff نمایی و Jitter، سقفِ پیکربندی | انتشار اثرِ جانبیِ تجاری ندارد؛ تکرارش فقط یک Append دیگر است |
| `PermanentPublishError` | `markFailed` فوری، بدون صرفِ بودجه | نتیجه از قبل معلوم است |
| بودجه تمام (`attempt_count >= maxAttempts`) | `markFailed` | مرزِ پیکربندی‌شده؛ بدون آن یک رویدادِ خراب بی‌نهایت تلاش می‌کند (ADR-004، بخش ۱۲) |

- این دقیقاً **متقابلِ موضعِ Job Dispatcher** است (FND-007: خطای ناشناخته پارک می‌شود،
  نه تکرار): Job یک اثرِ جانبیِ تجاری تکرارپذیر اجرا می‌کند، انتشار فقط یک Append با
  هویتِ تکرارپذیر است — تکرار با همان `event_id` دقیقاً چیزی است که مصرف‌کننده برایش
  آماده است (ADR-004، بخش ۱۵).
- شکستِ ثبت‌شده همیشه Redact و مختصر است؛ خطاِ محرمانه هرگز در Row یا Log نمی‌نشیند.

## 8. شکستِ میانهٔ اجرا — Crash، Duplicate، بازیابی

- انتشار و نشانه‌گذاری دو عملیات‌اند: اگر اجرا میان‌شان Crash کند، Row در `publishing`
  می‌ماند و `releaseStale` (پس از Visibility Timeout شصت‌ثانیه‌ای) آن را به بازی برمی‌گرداند
  — `retrying` تا بودجه هست، `failed` وقتی تمام شده است (ADR-004، بخش ۲۳).
- نتیجهٔ صریح: **یک رویداد ممکن است دوبار برود، هرگز صفر بار.** هویت ثابت است، پس
  مصرف‌کننده با `eventId` جمع می‌کند. «Exactly-once» اینجا ادعا نمی‌شود چون در سرتاسرِ
  Crash قابل تحویل نیست — وعدهِٔ صادقانه At-least-once + Idempotency است.
- `requeue(id)` بازیابیِ دستیِ یک `failed` است: State به `pending` و بودجه تازه — هویتِ
  رویداد دست‌نخورده می‌ماند؛ برای رکوردِ غیر-`failed` `false` برمی‌گرداند تا «چیزی برای
  بازیابی نبود» بی‌صدا نباشد.

## 9. Worker و Scheduler — همان حلقهٔ FND-007

```text
Scheduler ── هر OUTBOX_PUBLISH_INTERVAL_MS ──► صفِ Redis ──► Worker ──► outbox.publish
```

- `createOutboxPublishJob` یک Job با نوعِ `outbox.publish` است: یک `publishBatch`، سپس یک
  خطِ Logِ ساخت‌یافته با خلاصهٔ کاملِ اجرا (`released/claimed/published/retrying/failed`).
- `createOutboxPublishSchedule` ضامنِ ثبتِ آن در `SCHEDULED_JOB_DEFINITIONS` با نوعِ
  `outbox.publish.tick` است. ثبت در `JobsModule` از راهِ Factory انجام می‌شود؛ صف هیچ
  آگاهی‌ای از Feature ندارد (FND-007).
- **چرا Tick و نه « enqueue روی commit»:** تا وقتی تراکنش برگشته هیچ‌کس نمی‌تواند Job
  بگذارد؛ یک Tickِ از‌دست‌رفته رکوردِ Commit-شده را یتیم می‌کند. کشفِ دوره‌ای یعنی
  خودِ دیتابیس تصمیم می‌گیرد چه چیزی هنوز منتشر نشده — با هر Crashی، اجرای بعدی برمی‌گردد.
- Job فقط در شکستِ خودِ اجرا (مثلاً قطعی دیتابیس) Fail می‌شود؛ رکوردهایی که Park شده‌اند
  Stateِ خودِ Outbox هستند، نه شکستِ Tick.

## 10. پیکربندی

| متغیر | پیش‌فرض | نقش |
| --- | --- | --- |
| `OUTBOX_BATCH_SIZE` | `25` | حداکثر رکوردِ ادعاشده در هر اجرا |
| `OUTBOX_MAX_ATTEMPTS` | `5` | بودجهٔ تلاش هر رکورد پیش از `failed` |
| `OUTBOX_RETRY_BASE_DELAY_MS` | `1000` | اولین تأخیرِ Backoff؛ هر تلاش دوبرابر می‌شود |
| `OUTBOX_RETRY_MAX_DELAY_MS` | `60000` | سقفِ Backoff (باید ≥ پایه باشد — خطای اعتبارسنجی) |
| `OUTBOX_PUBLISH_INTERVAL_MS` | `1000` | فاصلهٔ Tick در Scheduler |

مانند بقیهٔ قراردادها یک‌جا در `Configuration` اعتبارسنجی می‌شود (baseline=base≤max، عددِ
صحیح ≥۱) و از `config.outbox` خوانده می‌شود؛ هیچ Adapterی متغیر خام نمی‌خواند
(FND-003).

## 11. مدل داده — `outbox_events`

- **هویت:** `id` (خودِ ردیف)، `event_id` با **Unique Index** — یک فکت، یک رکورد؛ تکرارِ
  `event_id` باگ است نه Retry.
- **متادیتای قابل‌پرسش:** `event_type`، `event_version`، `tenant_id`،
  `correlation_id`، `causation_id`.
- **Payload:** `MEDIUMTEXT` — پوششِ رویداد، Byte به Byte، همان‌چیزی که هر تلاش می‌فرستد.
- **چرخهٔ عمر:** `state` (ENUM)، `attempt_count`، `last_attempt_at`، `last_failure`،
  `published_at`، `next_attempt_at`، `claim_id`.
- **ایندکس‌ها:** `event_id` (یکتایی)، `(state, next_attempt_at)` (مسیرِ داغِ ادعا)،
  `created_at` (مرتب‌سازیِ Audit).
- DDL نسخه‌بندی‌شده و Idempotent در `persistence/outbox.schema.ts`
  (`OUTBOX_SCHEMA_VERSION`، `OUTBOX_DDL`، `ensureOutboxSchema`) — با `CREATE TABLE IF
  NOT EXISTS` اجرا می‌شود و چیزی را بازنویسی یا Drop نمی‌کند (سند ۰۷: مهاجرت باید
  نسخه‌بندی‌شده و قابل‌بازبینی باشد). امروز فقط e2e آن را فراخوانی می‌کند؛ ابزارِ
  Migration Runner موضوعِ جداگانه‌ای است و وقتی برای اولین جدولِ ماژول آمد، این DDL
  اولین مهاجرت آن است.

## 12. الگوهای ممنوع

```text
❌ record بدونِ مرزِ باز (OutboxTransactionRequiredError به همین دلیل وجود دارد)
❌ نوشتنِ مستقیم در Redis در کنارِ دیتابیس (dual write — دقیقاً باگِ ADR-004/14)
❌ تولیدِ دوبارهٔ eventId در هر تلاش یا تغییرِ Payload بین تلاش‌ها
❌ انتشارِ رویداد از Domain یا از Controller — ثبت فقط از Application داخلِ مرز
❌ خواندنِ متغیر خام (process.env) در Adapterها؛ فقط config.outbox
❌ خوردنِ شکستِ انتشارِ بلعیده‌شده بدون Log — خلاصهٔ اجرا باید حسابِ هر رکورد را بدهد
❌ وعدهٔ Exactly-once یا استفاده از Redis به‌عنوان Source of Truthِ رویدادِ منتشرنشده
❌ ثبتِ رویدادِ ماژولِ A در جدولِ دادهٔ ماژولِ B یا شکستنِ مرزِ ماژول‌ها (ADR-003)
```

## 13. تست‌ها

| سطح | فایل | پوشش |
| --- | --- | --- |
| واحد (نوشتن) | `src/infrastructure/outbox/outbox-recorder.spec.ts` | ردِ بدونِ مرز، Commit با مرز، Rollback با مرز، هویت و Payload، ستون‌های متادیتا |
| واحد (Dispatcher) | `src/infrastructure/outbox/outbox.publisher.spec.ts` | ادعا/تسویه، موعد و Batch، شکستِ گذرا/دائمی/بودجه‌ای، Backoff مرزبندی‌شده، هویتِ پایدار در چند تلاش، بازیابیِ Crash و `requeue` |
| واحد (Job) | `src/infrastructure/outbox/outbox-jobs.spec.ts` | خلاصهٔ اجرا، سطوح Log، انتشارِ خطای Store، Tick زمان‌بندی |
| واحد (Transport) | `src/infrastructure/outbox/redis-event-publisher.spec.ts` | نامِ Streamِ محیط، فیلدها، Trim، اتصالِ تنبل، انتشارِ خطا |
| واحد (Config) | `src/infrastructure/config/configuration.spec.ts` | پیش‌فرض‌ها، خواندنِ مقادیر، ردِ base>max |
| گارد سیم‌کشی | `test/process-wiring.e2e-spec.ts` | ثبتِ `outbox.publish` در هر سه پروسه |
| یکپارچه (MySQL) | `test/outbox.e2e-spec.ts` | با `MYSQL_INTEGRATION=1`: نامرئی‌بودن تا Commit، Rollback بدونِ رکورد، انتشارِ فقط Commit-شده، موعدِ Backoff، Permanent→Failed→Requeue، بودجهٔ تمام، بازیابیِ اجرای Crash، تقسیمِ ادعا بین دو ناشرِ همزمان |

```bash
pnpm infra:up
MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
```

## 14. معیار پذیرش

- ثبتِ رویداد بدونِ مرزِ باز رد می‌شود و چیزی نمی‌نویسد؛ داخلِ مرز با تغییر State
  commit یا rollback می‌شود.
- پیش از Commit، هیچ اتصالِ دیگری (و هیچ ناشری) رکورد را نمی‌بیند و چیزی منتشر نمی‌شود.
- هر رکورد دقیقاً در یک Stateِ بعدی است: انتشار، Retry با Backoff مرزبندی‌شده، یا
  `failed` با خطای Redact-شده — و `failed` برای همیشه قابلِ بازیابی می‌ماند.
- هویتِ رویداد (`event_id`) در همهٔ تلاش‌ها ثابت است و تکرارِ تحویل، قابلِ جمع‌بندی است.
- دو ناشرِ همزمان هیچ رکوردی را دوبار ادعا نمی‌کنند؛ اجرای مرده بازیابی می‌شود.
- Job و Schedule از طریق FND-007 در هر سه پروسه ثبت شده‌اند؛ پیکربندی یک‌جا
  اعتبارسنجی می‌شود.
- قرارداد به MySQL/Redis وابسته نیست: پورت‌ها بدونِ درایور تست می‌شوند و Adapter پشتِ
  توکن است.
- تست‌های خودکار (واحد + `MYSQL_INTEGRATION=1`) و `pnpm verify` (typecheck، lint،
  format، test، build) سبز است.
