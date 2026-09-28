# ADR-009 — معماری Reporting و Read Model

- شناسه: ADR-009
- وضعیت: پذیرفته‌شده
- نسخه: v1
- تاریخ: 2026-09-27
- حوزه: Reporting

## 1. تصمیم

Reporting یک مصرف‌کننده داده است، نه مالک Business Truth.

برای گزارش‌های پیچیده یا پرتکرار، Read Model/Projection استفاده می‌شود.

```text
Domain Source of Truth
      ↓
Domain Event / Projection Update
      ↓
Reporting Read Model
      ↓
Report / Dashboard
```

## 2. گزارش عملیاتی در برابر مدیریتی

### Operational

برای کاربرانی مثل Accountant و Operational User و با نیاز به جزئیات روز جاری.

### Management

برای Financial Manager و CEO با تمرکز بر KPI و وضعیت کلی.

هر دو در MVP وجود دارند، اما BI/Data Warehouse کامل در MVP نیست.

## 3. Source of Truth

Reporting هیچ‌وقت Source of Truth نیست.

اگر بین Reporting و Domain اختلافی باشد، Domain مرجع نهایی است و Projection باید قابل بازسازی باشد.

## 4. Rebuild

هر Read Model باید تا حد لازم قابلیت Rebuild از داده/رویدادهای معتبر را داشته باشد.

## 5. Consistency

Read Modelها می‌توانند Eventual Consistency داشته باشند.

UI در صورت نیاز باید وضعیت آخرین به‌روزرسانی را قابل مشاهده کند.

## 6. Query Ownership

Queryهایی که نیاز به گزارش ترکیبی دارند از Contractهای رسمی یا Read Model مخصوص Reporting استفاده می‌کنند.

دسترسی مستقیم Reporting به Persistence داخلی Domainهای دیگر برای تولید گزارش ممنوع است، مگر زیرساخت رسمی Projection آن را تغذیه کند.

## 7. Performance

گزارش سنگین نباید Transactionهای عملیاتی مالی را مختل کند.

گزارش سنگین به‌صورت Async قابل تولید است.

## 8. Export

Export گزارش می‌تواند Job Async باشد و فایل خروجی باید در Document/File infrastructure ثبت شود.

## 9. Audit

گزارش‌ها باید در صورت اهمیت مالی بتوانند Source/زمان استخراج/Version Projection را مشخص کنند.

## 10. اصول قطعی

- Reporting مالک Business Rule نیست.
- Reporting داده عملیاتی را تغییر نمی‌دهد.
- Read Model قابل Rebuild است.
- BI پیشرفته فعلاً خارج از MVP است.
