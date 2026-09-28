# ADR-014 — معماری تست

- شناسه: ADR-014
- وضعیت: پذیرفته‌شده
- نسخه: v1
- تاریخ: 2026-09-27
- حوزه: Testing Architecture

## 1. تصمیم

تست سیستم لایه‌ای است و باید Domain، Contract، Integration و رفتار واقعی Flowها را پوشش دهد.

مدل پایه:

```text
Unit
Integration
Contract
Agent Evaluation
E2E / Golden Flow
Security
Regression
Data Integrity
```

## 2. Domain Unit Tests

Business Rule و Invariantهای مهم باید بدون Framework و Infrastructure تست شوند.

## 3. Application Tests

Use Caseها و Command Handlerها باید با Dependencyهای تست‌پذیر بررسی شوند.

## 4. Integration Tests

موارد زیر حتماً Integration Test دارند:

- Database Persistence
- Transaction Boundary
- Redis/Event Bus
- Outbox
- Job Processing
- File Storage
- Provider Adapter

## 5. Contract Tests

Contract بین Moduleها و Provider Adapterها باید تست شود.

## 6. Data Integrity Tests

برای Flowهای مالی باید نتیجه نهایی داده بررسی شود، نه فقط Response API.

مثلاً:

- موجودی
- دریافتنی/پرداختنی
- Accounting Posting
- Audit
- Plan State

## 7. Golden Flow E2E

برای Golden Flowهای MVP تست E2E وجود خواهد داشت.

نمونه:

```text
Purchase → Inventory → Payable → Accounting
Sales → Inventory → Receivable → Receipt → Accounting
```

## 8. Agent Evaluation

Agent فقط با Unit Test ارزیابی نمی‌شود.

Dataset/Scenarioهای واقعی و سنجه‌هایی مانند:

- Accuracy
- Approval Rate
- Error Rate
- Hallucination/Unsupported Claim Rate
- Execution Failure Rate
- Explainability

بررسی می‌شوند.

## 9. Security Tests

حداقل:

- Authentication
- Authorization
- Tenant Isolation
- Object Access
- Secret Exposure
- File Access

## 10. Regression

هر Bug مهم پس از اصلاح باید Test Regression داشته باشد.

## 11. Migration Tests

Migrationهای Database باید روی Dataset نماینده آزمایش شوند.

## 12. Failure Tests

برای سیستم مالی، Testهای Failure مهم‌اند:

- Crash وسط Transaction
- Retry
- Duplicate Command
- Duplicate Event
- Provider Timeout
- Worker Restart
- Unknown External Outcome

## 13. Performance Tests

Baselineهای معماری باید با Load/Performance Test بررسی شوند.

## 14. Test Data

Test Data باید Company/Tenant Context واقعی داشته باشد و داده شرکت‌ها با هم قاطی نشوند.

## 15. اصول قطعی

- Business Rule بدون Test مناسب وارد Production نمی‌شود.
- Flow مالی فقط با UI Test معتبر تلقی نمی‌شود.
- Agent بدون Evaluation Dataset کامل محسوب نمی‌شود.
- Failure Scenario جزو Test Scope است.
