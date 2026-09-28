# ADR-006 — معماری Agent و Plan Execution

- شناسه: ADR-006
- وضعیت: پذیرفته‌شده
- نسخه: v1
- تاریخ: 2026-09-27
- حوزه: Agent Architecture

## 1. تصمیم

Agent یک لایه تصمیم‌یار و Orchestrator هوشمند است و مالک Business Truth نیست.

مدل استاندارد:

```text
User Request
   ↓
Central Agent / Router
   ↓
Specialized Agent
   ↓
Context Retrieval
   ↓
Analysis
   ↓
Action Plan
   ↓
User Review / Edit
   ↓
Approval
   ↓
Execution Contract
   ↓
Domain Validation
   ↓
Execution
   ↓
Outcome + Audit
```

## 2. Central Agent

Central Agent نقطه ورود واحد برای تجربه Agent است.

مسئولیت:

- دریافت درخواست عمومی
- تعیین حوزه مرتبط
- انتخاب Specialized Agent
- نگهداشتن Context عمومی لازم
- مدیریت تجربه کاربری

Central Agent مالک Business Logic نیست.

## 3. Specialized Agent

هر Specialized Agent روی یک Domain/Golden Flow مشخص تمرکز دارد.

Agent باید قبل از گسترش حوزه عملکرد، Golden Flow خودش را با معیارهای لازم پایدار کرده باشد.

## 4. Agent ابزار آزاد ندارد

Agent فقط از Tool/Contractهای مشخص و مجاز استفاده می‌کند.

ممنوع:

- SQL مستقیم
- ORM مستقیم
- Database Write مستقیم
- دور زدن Authorization
- اجرای مستقیم Business Rule

## 5. Context

Agent فقط Context موردنیاز همان تصمیم را دریافت می‌کند.

- Context نامرتبط وارد Prompt/Decision نمی‌شود.
- Source of Truth از Domain می‌آید.
- Agent Context قابل Trace است.
- داده تاریخی و Snapshotهای Domain باید از Source of Truth خوانده شوند.

## 6. Plan به‌عنوان Domain Object

Plan موجودیت مستقل است و شامل حداقل:

```text
Plan
├── Intent
├── Actions
├── Preconditions
├── Expected Effects
├── Confidence
├── Rationale
├── Approval
├── Execution State
└── Outcome
```

## 7. Proposal در برابر Execution

Agent می‌تواند پیشنهاد بدهد بدون Approval.

هیچ عملیات مالی حساس بدون Approval کاربر اجرا نمی‌شود.

```text
Proposal ≠ Approval ≠ Execute
```

## 8. Approval

کاربر باید بتواند Plan را ببیند و در صورت نیاز ویرایش کند.

Approval روی نسخه دقیق Plan انجام می‌شود.

اگر بعد از Approval وضعیت Domain تغییر کرده باشد، Execute باید Preconditions را دوباره بررسی کند.

## 9. Plan Staleness

اگر Plan بر اساس State قدیمی ساخته شده باشد:

```text
Plan Stale
→ Revalidate
→ Recalculate / Rebuild / Review
```

اجرای کورکورانه Plan قدیمی ممنوع است.

## 10. Confidence

Confidence فقط در مواردی نمایش داده می‌شود که Agent یا مدل عدم قطعیت دارد.

Low Confidence نباید به Fact تبدیل شود.

Agent باید در صورت عدم اطمینان، پیشنهاد را به‌عنوان پیشنهاد یا مورد نیازمند بررسی ارائه کند.

## 11. Explanation و Trace

برای تصمیم‌های Agent باید تا حد لازم مشخص باشد:

- چه ورودی‌هایی استفاده شده
- چه Proposalی تولید شده
- چرا Proposal تولید شده
- Confidence چه بوده
- کاربر چه تغییراتی داده
- چه چیزی Approved شده
- چه چیزی اجرا شده
- نتیجه چه بوده

## 12. Model Provider Abstraction

Agent Domain به Provider خاص AI وابسته نیست.

الگو:

```text
Agent Application
      ↓
AI Port
      ↓
AI Adapter
      ↓
Provider
```

Provider و Model و Version قابل Trace هستند.

## 13. Safety Boundary

Domain Validation همیشه مرجع نهایی است.

حتی اگر Agent یک Plan معتبر به نظر بسازد، Domain می‌تواند آن را رد کند.

Agent حق تغییر Ruleهای Domain را ندارد.

## 14. Execution

Execution با Contractهای Application انجام می‌شود و وارد Domain Validation می‌شود.

Agent خودش عملیات را اجرا نمی‌کند.

## 15. Agent Memory

Agent مالک Source of Truth نیست.

داده‌های پایدار Agent شامل مواردی مانند:

- Plan
- Observation
- Execution Trace
- Recommendation
- Confidence
- Evaluation Data

می‌شوند.

Snapshot کامل Entityهای Business به‌عنوان Truth مستقل مجاز نیست.

## 16. معیارهای Agent

برای عملیات Agentی که در MVP مهم هستند، موارد زیر قابل اندازه‌گیری‌اند:

- Accuracy
- Approval Rate
- Execution Failure Rate
- Exception Rate
- Explainability
- Traceability
- Plan Staleness Rate

## 17. اصول قطعی

- Agent Suggests; Domain Decides.
- Agent Plans; Domain Executes.
- Agent never bypasses Business Rules.
- No silent execution.
- No silent partial execution.
