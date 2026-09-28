# ADR-007 — معماری Adapter / Provider

- شناسه: ADR-007
- وضعیت: پذیرفته‌شده
- نسخه: v1
- تاریخ: 2026-09-27
- حوزه: Integrations

## 1. تصمیم

همه Integrationهای بیرونی پشت Port/Contract و Adapter قرار می‌گیرند.

```text
Core Domain / Application
          ↓
        Port
          ↓
       Adapter
          ↓
      Provider
          ↓
External System
```

Provider نباید Contract داخلی خودش را به Domain تحمیل کند.

## 2. Adapter

Adapter مسئول:

- ترجمه Contract داخلی به Contract بیرونی
- ترجمه Response خارجی به مدل داخلی
- Mapping Status
- Mapping Error
- مدیریت Authentication خارجی
- Retry/Timeout طبق Policy
- ثبت External Reference

## 3. Provider

Provider یک سرویس/سامانه بیرونی است.

نمونه:

- بانک
- سامانه مالیاتی
- سرویس AI
- سرویس پرداخت

Provider بخشی از Domain Truth نیست.

## 4. External Status

Status بیرونی نباید بدون Mapping وارد Domain شود.

مثلاً برای Tax:

```text
Internal:
Ready / Submitted / Accepted / Rejected / NeedsCorrection
```

Adapter وضعیت خام Provider را به Status داخلی تبدیل می‌کند.

## 5. External Identifier

External IDها باید جدا از Internal ID نگهداری شوند.

```text
Internal Entity ID
External Provider ID
Provider Name
Adapter Version
```

## 6. Reliability

هر Adapter باید:

- Timeout
- Retry Policy
- Idempotency Strategy
- Error Mapping
- Observability
- Circuit/Backoff در صورت نیاز

داشته باشد.

## 7. Unknown Outcome

اگر درخواست به Provider ارسال شد ولی Response قطعی دریافت نشد، نتیجه نباید Success یا Failure قطعی فرض شود.

```text
UnknownOutcome
→ Reconcile / Query Status / Review
```

## 8. Provider Replacement

تعویض Provider نباید نیازمند تغییر Domain باشد.

فقط Adapter/Configuration/Provider Integration باید تغییر کند؛ مگر اینکه Contract خارجی واقعاً اطلاعاتی ارائه کند که در مدل داخلی وجود ندارد، که در این حالت تغییر Domain باید آگاهانه و مستقل ثبت شود.

## 9. Versioning

Adapterها و External Contractها باید Version داشته باشند.

تغییر Breaking در Provider باید در Adapter جدید مدیریت شود.

## 10. Manual Adapter

در Integrationهایی مثل Tax، Manual/Export Adapter نیز می‌تواند یک Adapter رسمی باشد.

مثلاً:

```text
Tax Port
 ├── ManualExportAdapter
 └── ProviderAdapter
```

## 11. Data Ownership

Raw External Response اگر برای Audit/Trace لازم باشد می‌تواند در Integration/Document area نگهداری شود، اما Business Truth داخلی باید در Domain مربوطه ذخیره شود.

## 12. اصول قطعی

- Domain از Provider بی‌خبر است.
- Adapter مرز ترجمه است.
- External Contract به Core نشت نمی‌کند.
- Unknown Outcome نباید حدس زده شود.
- Integration قابل تعویض است.
