# دامنه کالا و موجودی

## 1. هدف

مدیریت هویت کالا و کنترل حرکت و مانده موجودی در انبارهای شرکت.

## 2. مفاهیم اصلی

- Product
- Product Type
- Unit of Measure
- Warehouse
- Stock Movement
- Stock Balance
- Inventory Valuation Policy
- Cost Layer / Cost Basis Reference
- Inventory Location Reference

## 3. Product مرکزی

Product یک موجودیت مشترک برای Purchase، Sales و Inventory است و حداقل این اطلاعات را پوشش می‌دهد:

- کد
- نام
- واحد سنجش
- نوع
- وضعیت فعال/غیرفعال
- قابلیت خرید
- قابلیت فروش
- قابلیت نگهداری موجودی

## 4. انبار

شرکت می‌تواند چند Warehouse داشته باشد. Branch مفهوم مستقلی نیست و در MVP وارد این دامنه نمی‌شود.

## 5. ارزش‌گذاری

Domain ظرفیت روش‌های زیر را دارد:

- FIFO
- LIFO
- Weighted Average

روش فعال می‌تواند در سطح شرکت یا سیاست مربوط تنظیم شود.

## 6. Invariants

- Stock Balance فقط از طریق Stock Movement تغییر می‌کند.
- موجودی منفی تابع سیاست شرکت و Rule فروش است.
- هر Movement باید Product و Warehouse معتبر داشته باشد.
- نتیجه ارزش‌گذاری باید قابل بازتولید و Audit باشد.
- Inventory قوانین کسب‌وکار را خودش مالک است؛ Accounting نباید سیاست موجودی را تغییر دهد.

## 7. Commands

CreateProduct، UpdateProduct، CreateWarehouse، ReceiveStock، IssueStock، TransferStock، AdjustStock، RecalculateValuation

## 8. Events

ProductCreated، StockReceived، StockIssued، StockTransferred، StockAdjusted، InventoryValuationUpdated

## 9. Cross-Domain

Purchase از ReceiveStock استفاده می‌کند؛ Sales از IssueStock؛ هر دو اثر مالی خود را جداگانه به Accounting می‌دهند.
