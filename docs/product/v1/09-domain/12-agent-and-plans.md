# دامنه Agent و برنامه عملیاتی

## 1. هدف

مدیریت لایه دامنه‌ای که پیشنهادهای هوشمند را به Plan قابل تأیید و اجرای قابل ردیابی تبدیل می‌کند، بدون مالکیت داده کسب‌وکاری سایر حوزه‌ها.

## 2. مفاهیم اصلی

- Agent
- Agent Session
- Observation
- Proposal
- Action Plan
- Plan Action
- Precondition
- Expected Effect
- Approval
- Execution
- Outcome
- Confidence
- Agent Version

## 3. اصل مالکیت

Agent مالک Purchase، Sales، Accounting و سایر Entityهای کسب‌وکاری نیست.

Agent فقط می‌تواند:

1. داده مرتبط را مشاهده کند.
2. تحلیل و Proposal تولید کند.
3. Plan بسازد.
4. Plan را برای Review ارائه کند.
5. پس از Approval، درخواست اجرای Commandهای مجاز را صادر کند.
6. نتیجه را ثبت و اعتبارسنجی کند.

## 4. چرخه Plan

```text
Draft → Proposed → Reviewed → Approved → Executing → Completed
                                      ↘ Rejected
                                                   ↘ Failed / PartiallyFailed
```

Partial failure باید صریح باشد و هر Action وضعیت مستقل داشته باشد.

## 5. Invariants

- Plan قبل از اجرا باید از نظر Permission و Domain Rule معتبر باشد.
- هیچ Planی نمی‌تواند Entity دامنه دیگر را مستقیم تغییر دهد.
- Low Confidence نباید به‌عنوان Fact نمایش داده شود.
- اجرای دوباره Plan باید تحت کنترل Idempotency/Execution State باشد.
- نسخه Agent و نسخه Rule مورد استفاده ثبت می‌شوند.

## 6. Commands

CreateProposal، CreatePlan، EditPlan، ApprovePlan، RejectPlan، ExecutePlan، RetryFailedAction، ValidateOutcome

## 7. Events

PlanCreated، PlanApproved، PlanRejected، PlanExecutionStarted، PlanCompleted، PlanFailed، PlanPartiallyFailed، PlanValidated
