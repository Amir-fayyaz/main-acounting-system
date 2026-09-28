# 10 — Observability

## Logging

Structured Log با Context مناسب:

- Correlation ID
- Company/Tenant ID
- User ID در صورت مجاز بودن
- Module
- Operation
- Outcome
- Error Code

اطلاعات محرمانه و Credential داخل Log ممنوع است.

## Metrics

حداقل:

- Request latency
- Error rate
- Job success/failure
- Queue depth
- Event processing latency
- Database errors
- Integration failures
- Agent approval rate
- Agent execution failure rate

## Tracing

برای عملیات Cross-Module، Job و Integrationهای مهم Trace Context حفظ شود.

## Health

سه مفهوم جدا باشد:

- Liveness
- Readiness
- Dependency Health

## Alerts

Alert باید روی Failure قابل اقدام ایجاد شود، نه روی هر Log خطا.
