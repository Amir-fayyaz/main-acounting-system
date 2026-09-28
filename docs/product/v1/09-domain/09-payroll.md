# دامنه حقوق و دستمزد

## 1. هدف

محاسبه و نهایی‌سازی حقوق ماهانه، کنترل اطلاعات، آماده‌سازی بیمه و مالیات حقوق و ایجاد اثر پرداخت و حسابداری.

## 2. مفاهیم اصلی

- Employee
- EmploymentProfile
- PayrollPeriod
- PayrollRun
- PayrollLine
- SalaryComponent
- Deduction
- Advance
- LeaveImpact
- Insurance Result
- SalaryTax Result
- GroupPayment Plan Reference

## 3. Employee

اطلاعات هویتی پایه از Party می‌آید. اطلاعات شغلی و حقوقی در Payroll مالکیت می‌شود.

## 4. وضعیت PayrollRun

```text
Draft → Calculated → Validated → Finalized → Payment/Accounting Completed
```

## 5. Invariants

- داده‌های ناقص مانع Finalization می‌شوند مگر مسیر کنترل‌شده‌ای برای Exception وجود داشته باشد.
- Agent فقط محاسبه/پیشنهاد می‌کند و اجرای نهایی نیازمند تأیید حسابدار است.
- پس از Finalized شدن، اصلاح فقط از مسیر مجاز انجام می‌شود.
- داده حضور و مرخصی ورودی خارجی است و Payroll مالک محاسبه نهایی است.

## 6. Commands

CreateEmployee، ImportPayrollInputs، CalculatePayroll، ValidatePayroll، FinalizePayroll، PrepareInsurance، PrepareSalaryTax، CreateGroupPaymentPlan

## 7. Events

PayrollCalculated، PayrollValidated، PayrollFinalized، InsurancePrepared، SalaryTaxPrepared، PayrollPaymentPlanned
