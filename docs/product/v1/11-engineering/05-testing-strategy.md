# 05 — Testing Strategy

## هرم تست

1. Domain Unit Tests
2. Application Integration Tests
3. Persistence/Database Integration Tests
4. API Contract Tests
5. E2E Tests
6. Agent Evaluation Tests

## الزامات

### Domain

- Invariantهای مالی باید Unit Test داشته باشند.
- State Transitionها تست شوند.
- Money/rounding تست شوند.

### Integration

- Transaction Boundaryها تست شوند.
- Outbox و Event Consumer تست شوند.
- Tenant Isolation تست شود.
- Migration روی Database واقعی Test شود.

### API

- OpenAPI Contract با Implementation هماهنگ باشد.
- Authorization و Object-level Access تست شوند.

### E2E

Golden Flowهای MVP باید حداقل مسیر موفق و شکست‌های حیاتی را پوشش دهند.

### Agent

- Accuracy
- Approval Rate
- Execution Failure Rate
- Invalid Plan Rate
- Stale Plan Handling
- Explainability/Traceability

به‌صورت قابل‌اندازه‌گیری ارزیابی شوند.

## Rule

تغییر کدی که رفتار را تغییر می‌دهد باید Test مناسب داشته باشد؛ Test صرفاً برای پوشش عددی نوشته نمی‌شود.
