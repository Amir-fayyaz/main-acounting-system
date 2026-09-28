# دامنه مالیات و صورتحساب الکترونیکی

## 1. هدف

مدیریت داده و وضعیت مالیاتی معاملات، صورتحساب‌های الکترونیکی، کنترل‌های مالیاتی، اظهارنامه و تعامل با Providerهای بیرونی بدون وابستگی هسته دامنه به یک سامانه خارجی.

## 2. مفاهیم اصلی

- TaxProfile
- TaxableTransaction
- TaxInvoice
- TaxReturn
- TaxRuleReference
- Submission
- ExternalStatus
- TaxException
- Adapter/Provider Reference

## 3. مرز دامنه

هسته Tax مالک مدل مالیاتی داخلی، وضعیت‌ها، Rule Referenceها، Submission و سابقه تعامل است. Provider بیرونی مالک حقیقت داخلی محصول نیست.

## 4. چرخه TaxInvoice

```text
Draft → Validated → Ready → Submitted/Pending → Accepted
                                       ↘ Rejected → Correction Plan
```

## 5. Invariants

- هیچ Submission خارجی بدون Action Plan/Approval مناسب انجام نمی‌شود.
- پاسخ بیرونی باید ذخیره و به TaxInvoice مرتبط شود.
- رد شدن بیرونی باعث حذف صورتحساب اصلی نمی‌شود.
- Correction باید به رد یا علت مشخص مرتبط باشد.
- Ruleهای متغیر باید نسخه‌پذیر باشند.

## 6. Tax Return

TaxReturn یک Entity مستقل است و می‌تواند چند نوع اظهارنامه را پوشش دهد. مدل قالب‌ها قابل توسعه است.

## 7. Commands

CreateTaxInvoice، ValidateTaxInvoice، PrepareSubmission، SubmitTaxInvoice، RecordSubmissionResult، CreateCorrectionPlan، ApproveResubmission، CreateTaxReturn، ValidateTaxReturn، PrepareTaxReturnSubmission

## 8. Events

TaxInvoiceReady، TaxInvoiceSubmitted، TaxInvoiceAccepted، TaxInvoiceRejected، TaxCorrectionRequired، TaxReturnPrepared، TaxReturnSubmitted

## 9. Cross-Domain

Purchase و Sales داده معامله را تأمین می‌کنند؛ Tax نتیجه مالیاتی و وضعیت اظهار/صورتحساب را مالک می‌شود؛ Accounting اثر مالی را ثبت می‌کند.
