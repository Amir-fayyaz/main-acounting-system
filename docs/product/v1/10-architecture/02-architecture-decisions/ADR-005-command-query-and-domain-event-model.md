# ADR-005 — Command / Query / Domain Event Model

- شناسه: ADR-005
- وضعیت: پذیرفته‌شده
- نسخه: v1
- تاریخ: 2026-09-27
- حوزه: Application Communication / Domain Events

## 1. تصمیم

ارتباط داخلی سیستم بر سه مفهوم اصلی استوار است:

```text
Command → درخواست انجام یک عمل
Query   → درخواست خواندن اطلاعات
Event   → اعلام اینکه یک واقعیت رخ داده است
```

این سه مفهوم از هم تفکیک کامل دارند و جای یکدیگر استفاده نمی‌شوند.

## 2. Command

Command یک درخواست صریح برای انجام یک Use Case است.

اصول:

- نام Command با فعل و نیت کسب‌وکاری مشخص باشد.
- Command باید به یک Handler/Application Use Case مشخص متصل باشد.
- Command ممکن است State را تغییر دهد.
- Command باید Authorization و Preconditions را طی کند.
- Commandهای حساس باید Idempotent یا Duplicate-aware باشند.
- Command نباید Entity داخلی Module دیگر را دریافت یا تغییر دهد.

نمونه:

```text
RegisterPurchaseCommand
ApprovePlanCommand
ReceiveGoodsCommand
PostAccountingDocumentCommand
```

## 3. Query

Query فقط برای خواندن است و نباید Side Effect کسب‌وکاری داشته باشد.

اصول:

- Query نباید Domain State را تغییر دهد.
- Query می‌تواند Read Model یا Projection را بخواند.
- Query Contract باید مستقل از ORM باشد.
- Query یک Module نباید مستقیماً Persistence داخلی Module دیگر را بخواند.
- Query برای Reporting می‌تواند مستقیماً از Read Model مربوطه استفاده کند.

## 4. Event

Domain Event یک Fact است؛ اعلام می‌کند اتفاقی در Domain افتاده است.

مثال:

```text
PurchasePosted
SalePosted
PaymentReceived
InventoryIssued
PayrollFinalized
TaxInvoiceAccepted
PeriodClosed
```

Event نباید Command باشد و نباید از مخاطب خاص خود اطلاعی داشته باشد.

## 5. Event Naming

- Eventها با گذشته/Fact نام‌گذاری می‌شوند.
- Commandها با فعل/Intent نام‌گذاری می‌شوند.
- Queryها با Get/List/Search/Find یا معادل دقیق نام‌گذاری می‌شوند.

نمونه صحیح:

```text
ApprovePayment        → Command
GetPayment            → Query
PaymentApproved       → Event
```

## 6. Event Generation

Event فقط پس از وقوع واقعی Business Fact تولید می‌شود.

Controller، UI و Integration Layer اجازه تولید مستقیم Business Event را ندارند.

Event باید از Domain/Application پس از تغییر معتبر State تولید شود و برای انتشار پایدار از Outbox استفاده شود.

## 7. Event Delivery

در MVP از Event Bus داخلی مبتنی بر Redis Streams استفاده می‌شود.

```text
Transaction
  ├── Domain Data
  └── Outbox
         ↓
      Commit
         ↓
 Outbox Dispatcher
         ↓
    Redis Stream
         ↓
 Consumer Group
```

Redis Pub/Sub برای Business Eventهای حیاتی استفاده نمی‌شود، چون Durability و Replay موردنیاز را تأمین نمی‌کند.

## 8. Handlerها

Command Handler و Query Handler در Application Layer قرار دارند.

Event Handler نیز در Application یا Infrastructure ماژول مربوط به Consumer قرار می‌گیرد؛ اما حق دسترسی مستقیم به داخلیات Module دیگر ندارد.

## 9. Cross-Module Contract

Cross-Module Communication فقط از طریق:

- Command Contract
- Query Contract
- Application/Domain Service Contract
- Domain Event Contract

انجام می‌شود.

دسترسی مستقیم به Entity/Repository/ORM/Table ممنوع است.

## 10. Transaction و Event

Business Data و Outbox Record مربوط به Event باید در یک Transaction سازگار ثبت شوند.

Dispatcher وظیفه انتشار بعد از Commit را دارد.

Consumer باید Idempotent باشد.

## 11. Event Versioning

Eventها باید Contract version داشته باشند.

تغییر Breaking در Event نباید بدون Version جدید انجام شود.

Consumer باید در صورت امکان با نسخه‌های مورد نیاز خودش سازگار باشد.

## 12. Query Consistency

Queryهای مالیِ عملیاتی حساس باید از Source of Truth مناسب و به‌روز استفاده کنند.

Queryهای Reporting می‌توانند از Read Model با Eventual Consistency استفاده کنند و وضعیت آخرین به‌روزرسانی را در صورت نیاز نشان دهند.

## 13. منع Command از طریق Event

Event برای درخواست عملیات جدید استفاده نمی‌شود.

این الگو ممنوع است:

```text
SaleCreated Event → "لطفاً حسابداری کن"
```

اگر درخواست انجام عملیات لازم است، Command یا Application Process رسمی باید وجود داشته باشد.

Event فقط می‌گوید آن اتفاق رخ داده است.

## 14. اصول قطعی

- Command = Intent
- Query = Read
- Event = Fact
- Event نباید Side Effect مستقیم و مخفی ایجاد کند.
- Handlerها باید در Boundary خود عمل کنند.
- Event Delivery باید قابل ردیابی باشد.
- Duplicate Event نباید Duplicate Business Effect بسازد.

## 15. ADRهای وابسته

ADR-002، ADR-003، ADR-004، ADR-006، ADR-008، ADR-009
