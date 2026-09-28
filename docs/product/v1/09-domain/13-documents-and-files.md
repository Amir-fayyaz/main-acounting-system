# دامنه اسناد و فایل‌ها

## 1. هدف

مدیریت فایل‌ها و پیوست‌ها به‌عنوان دارایی اطلاعاتی مستقل، بدون ادغام مفاهیم مختلف سند کسب‌وکاری.

## 2. مفاهیم اصلی

- FileAsset
- Attachment
- FileVersion
- ExtractionResult
- ImportBatch
- ExportArtifact

## 3. اصل مهم

هر نوع سند کسب‌وکاری مانند Purchase Invoice، Sales Invoice، Accounting Document و Tax Invoice Entity مستقل خودش را دارد. مفهوم عمومی Document نباید جای این Entityها را بگیرد.

FileAsset فقط فایل یا محتوای مستندشده است که می‌تواند به چند نوع Entity مجاز متصل شود.

## 4. Invariants

- فایل اصلی Immutable است.
- Hash فایل نگهداری می‌شود.
- ExtractionResult جدا از فایل اصلی نگهداری می‌شود.
- اجرای Extraction مجدد نباید نتیجه قبلی را نابود کند.
- Access به فایل تابع Company Context و Permission است.

## 5. Commands

UploadFile، CreateAttachment، CreateFileVersion، RunExtraction، CreateImportBatch، ExportData

## 6. Events

FileUploaded، FileAttached، FileVersionCreated، ExtractionCompleted، ImportBatchCompleted، ExportGenerated
