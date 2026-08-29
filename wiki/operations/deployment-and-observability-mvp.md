# MVP Deployment and Observability

## 1. Environments

The minimum environments are local, staging, and production. Production data
must never be used in local or staging environments.

## 2. Deployment

- Build an immutable application artifact.
- Run automated tests before deployment.
- Apply backward-compatible migrations before application rollout.
- Support health checks and graceful shutdown.
- Roll back application versions without destroying data.

## 3. Configuration and Secrets

Configuration is environment-provided. Secrets include database credentials,
JWT signing keys, messaging credentials, and storage credentials. Secrets must
not be committed to source control or written to ordinary logs.

## 4. Logging

Structured logs must include `request_id`, `user_id` when available,
`tenant_id` when available, operation, outcome, and duration. Passwords,
tokens, and payment secrets must be redacted.

## 5. Metrics and Alerts

Track request latency/error rate, authentication failures, authorization
denials, database errors, job failures, inventory conflicts, and report query
latency. Alert on sustained error rates, failed migrations, and backup failure.

## 6. Backups and Recovery

Production database backups must be automated and periodically restore-tested.
Recovery objectives (RPO/RTO) must be selected before production launch.

## 7. Audit

Business audit events are append-only and record actor, Tenant, action,
resource, and timestamp. Security logs and business audit records are kept as
separate concerns with independently defined retention.
