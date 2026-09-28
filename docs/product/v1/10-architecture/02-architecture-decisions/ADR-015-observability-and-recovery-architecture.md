# ADR-015 — معماری Observability و Recovery

- شناسه: ADR-015
- وضعیت: پذیرفته‌شده
- نسخه: v1
- تاریخ: 2026-09-27
- حوزه: Observability / Recovery

## 1. تصمیم

Observability یک قابلیت پایه سیستم است و برای عملیات مالی، Agent، Job و Integration باید Trace قابل اتکا وجود داشته باشد.

سه ستون اصلی:

```text
Logs
Metrics
Traces
```

به‌علاوه:

- Audit Trail
- Execution Journal
- Job Status

## 2. Correlation ID

هر Request/Command/Job/Plan/Integration Flow باید Correlation ID داشته باشد.

این شناسه باید در مسیر زیر تا حد ممکن حفظ شود:

```text
UI
→ API
→ Application
→ Domain
→ Outbox/Event
→ Worker
→ Provider
```

## 3. Structured Logging

Logهای عملیاتی Structured باشند و شامل مواردی مانند:

- Timestamp
- Level
- CorrelationId
- CompanyId
- Module
- Operation
- Error Code

باشند.

داده حساس نباید بی‌دلیل در Log قرار گیرد.

## 4. Metrics

حداقل Metricها:

- Request latency
- Error rate
- Job queue depth
- Job failure rate
- Retry count
- Event lag
- Provider latency/failure
- Agent execution time
- Plan approval rate در صورت نیاز
- Database health

## 5. Trace

Trace برای عملیات چندلایه و Async باید امکان اتصال Spanها را فراهم کند.

## 6. Audit vs Log

Log فنی جای Audit را نمی‌گیرد.

Audit یک داده پایدار کسب‌وکاری/امنیتی است.

## 7. Alerts

Alert باید بر اساس وضعیت‌های قابل اقدام ساخته شود.

نمونه:

- Queue stuck
- Worker failure
- Database unavailable
- Redis unavailable
- Repeated Provider failure
- Backup failure
- High error rate
- Tenant isolation/security anomaly

## 8. Recovery

Recovery باید مبتنی بر State و Journal باشد، نه حدس از روی Log.

## 9. Health Checks

Health Check باید Liveness و Readiness را تفکیک کند.

## 10. Backup Monitoring

موفقیت Backup باید قابل مشاهده و Alertable باشد.

Restore Test نیز باید دوره‌ای انجام شود.

## 11. Incident State

در صورت Failure گسترده، سیستم باید بتواند وضعیت Incident را ثبت و عملیات بازیابی را Trace کند.

## 12. Sensitive Data

Log/Trace نباید شامل:

- Secret
- Password
- Token کامل
- داده مالی غیرضروری

باشد.

## 13. اصول قطعی

- No blind recovery
- No hidden failure
- Audit ≠ Log
- Every long-running operation is observable
- Every critical recovery action is traceable
