# Architecture Overview — نسخه MVP

- وضعیت: تصویب‌شده بر اساس ADRهای 001 تا 015
- نسخه: v1
- تاریخ: 2026-09-27

## 1. تصویر کلی

محصول یک **Modular Monolith** Dockerized است که روی سرور شرکت سازنده یا مشتری نصب می‌شود.

```text
                         Desktop Web Client
                                  |
                                  v
                           REST API / Web
                                  |
                    +---------------------------+
                    |      Modular Monolith     |
                    |                           |
                    | Company & Access          |
                    | Party                     |
                    | Accounting                |
                    | Product & Inventory       |
                    | Purchase                  |
                    | Sales                     |
                    | Bank & Treasury           |
                    | Expense                   |
                    | Payroll                   |
                    | Tax                       |
                    | Fixed Assets              |
                    | Agent & Plans             |
                    | Documents & Files        |
                    | Reporting                 |
                    | Notification              |
                    +---------------------------+
                       |        |        |
                    Commands  Queries   Events
                                         |
                                    Outbox / Bus
                                         |
                                   Redis Streams

         +----------------+    +----------------+
         | Worker Runtime  |    | Scheduler      |
         +----------------+    +----------------+
                 |                    |
                 +--------------------+
                           |
                   Same Domain Code

        +---------------+    +------------------+
        | Shared DB     |    | File Storage      |
        | per Install   |    | / Documents       |
        +---------------+    +------------------+
```

## 2. معماری داخلی Module

هر Module از Layer + Feature استفاده می‌کند:

```text
Module
├── Domain
├── Application
├── Infrastructure
└── Presentation
```

درون هر Layer، Featureها و Use Caseها به‌صورت مستقل سازمان‌دهی می‌شوند.

## 3. قوانین Dependency

- Domain از Framework و Infrastructure بی‌خبر است.
- Application Use Case را اجرا می‌کند.
- Infrastructure پیاده‌سازی Portهاست.
- Presentation Adapter ورود/خروج است.
- Moduleها به Internal Entity/Repository/ORM/Table یکدیگر دسترسی ندارند.
- Circular Dependency ممنوع است.
- Shared/Common فقط برای مفاهیم واقعاً عمومی است.

## 4. Data Ownership

هر Business Data یک Owner Module یکتا دارد.

یک Database مشترک برای هر Installation داریم، ولی مالکیت منطقی داده بین Moduleها جداست.

Foreign Key بین Moduleها ممنوع است؛ Foreign Key داخل یک Module مجاز است.

هر Module DbContext/Persistence Boundary مستقل دارد.

## 5. Cross-Module Communication

ارتباط از طریق:

```text
Command
Query
Application/Domain Service Contract
Domain Event
```

انجام می‌شود.

هیچ Moduleی مستقیم به داخلیات Module دیگر دسترسی ندارد.

## 6. Transaction

Transaction Boundary بر اساس Business Consistency Boundary است.

Strong Consistency برای اثرهای مالی/حساس و Eventual Consistency برای Read Model، Notification، Search و موارد غیرحیاتی استفاده می‌شود.

Outbox برای Eventهایی که باید بعد از Commit منتشر شوند به‌کار می‌رود.

## 7. Eventing

```text
Business Transaction
      |
      +-- Domain Data
      +-- Outbox
             |
           Commit
             |
      Outbox Dispatcher
             |
       Redis Streams
             |
       Consumer Groups
```

Kafka و RabbitMQ در MVP استفاده نمی‌شوند.

## 8. Agent Architecture

Agent مالک Business Truth نیست.

```text
User Request
  -> Central Agent
  -> Specialized Agent
  -> Context
  -> Proposal
  -> Plan
  -> User Edit
  -> Approval
  -> Domain Validation
  -> Execution
  -> Outcome / Audit
```

Agent مستقیم Database را تغییر نمی‌دهد و Domain Rule را دور نمی‌زند.

## 9. Integration

تمام Providerهای بیرونی پشت Adapter هستند:

```text
Domain/Application
      |
     Port
      |
   Adapter
      |
  Provider
```

این معماری برای مالیات، بانک، AI و سرویس‌های بیرونی اعمال می‌شود.

## 10. Async Runtime

Web/API از Worker و Scheduler جداست، ولی همه از Codebase و Domain Moduleهای یکسان استفاده می‌کنند.

کارهای طولانی و قابل Retry از Request Sync خارج می‌شوند.

## 11. Reporting

Reporting مالک Business Truth نیست و از Read Model/Projection استفاده می‌کند.

Read Model قابل Rebuild است و Eventual Consistency مجاز دارد.

## 12. Security

اصل‌های پایه:

- Least Privilege
- Tenant Isolation
- Object-level Authorization
- Encryption in transit
- Encryption at rest
- Secret Management
- Security Audit
- Agent privilege boundary

## 13. File Processing

File/Document Module مالک Blob و Metadata است. Business Module فقط رابطه کسب‌وکاری با Document را نگه می‌دارد.

حداکثر حجم فایل MVP برابر 20MB است و Processing فایل سنگین Async است.

## 14. Deployment

Deployment به‌صورت Dockerized و On-Premise First است.

اتصال اینترنت برای عملیات داخلی اجباری نیست؛ فقط عملیات وابسته به Provider بیرونی به اینترنت نیاز دارند.

## 15. Recovery

هدف RPO تقریباً صفر و RTO سریع‌ترین زمان عملی ممکن است.

Recovery مبتنی بر State، Execution Journal و Idempotency است، نه حدس از روی Log.

## 16. تست

تست‌ها در چند سطح انجام می‌شوند:

```text
Domain Unit
Application
Integration
Contract
Golden Flow E2E
Agent Evaluation
Security
Data Integrity
Failure / Recovery
Performance
```

## 17. اصل مالکیت

> هر Module مالک داده خودش است، تغییر آن را خودش کنترل می‌کند و فقط Contract در اختیار سایر Moduleها قرار می‌دهد.

## 18. اصل Agent

> Agent پیشنهاد می‌دهد، Domain تصمیم می‌گیرد و Domain عملیات را اجرا می‌کند.

## 19. اصل Consistency

> هیچ عملیات کسب‌وکاری نباید بدون Outcome قطعی، قابل ردیابی و قابل بازیابی باقی بماند.

## 20. Technology Decisions

این Overview عمداً Technology Stack سطح زبان/Framework/ORM/Database Engine را قطعی نمی‌کند. این انتخاب‌ها باید بعد از تأیید معماری و بر مبنای ADR جداگانه انجام شوند.
