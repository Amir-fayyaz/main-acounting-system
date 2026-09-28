# 08 — Agent Engineering

## اصول

Agent یک Component تصمیم‌یار و Plan Builder است، نه مالک Business State.

Flow استاندارد:

```text
Request
→ Context
→ Analysis
→ Proposal
→ Plan
→ User Review/Edit
→ Approval
→ Execute
→ Validate
→ Audit
```

## قواعد

- Toolهای Agent محدود و مجوزدار هستند.
- Agent مستقیم به ORM/Database دسترسی ندارد.
- Low Confidence به‌عنوان Fact نمایش داده نمی‌شود.
- Plan قبل از Execute دوباره Validate می‌شود.
- Plan دارای Version و Trace است.
- Agent Version و Provider Version قابل ردیابی است.
- Prompt/Policy Version در حد لازم برای بازتولید نتیجه ثبت می‌شود.
- Execution Journal برای عملیات چندمرحله‌ای الزامی است.
- Evaluation Dataset برای Golden Flowهای Agent نگهداری می‌شود.
- Agent باید Approval و Rejection را در Metrics ثبت کند.

## تغییر Prompt/Policy

تغییر Prompt یا Policy باید مانند تغییر کد مهم تلقی شود و Regression Evaluation داشته باشد.
