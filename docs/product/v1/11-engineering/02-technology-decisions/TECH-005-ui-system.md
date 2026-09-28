# TECH-005 — UI Component System

- وضعیت: پذیرفته‌شده

## تصمیم

محصول یک Design System داخلی و Component Layer استاندارد خواهد داشت.

یک UI Library می‌تواند برای سرعت MVP استفاده شود، اما Componentهای کلیدی محصول نباید مستقیماً به API آن Library قفل شوند.

## Componentهای حیاتی

- Table
- Form
- Modal / Drawer
- Approval Panel
- Action Plan Viewer
- Financial Document Viewer
- Accounting Entry
- Reconciliation Board
- Report Filters
- Notification Center
- Exception Panel

## اصل

Business UI از Presentation Contract جدا نگه داشته می‌شود تا جایگزینی Library در آینده تغییرات گسترده ایجاد نکند.
