# دامنه اعلان

## 1. هدف

مدیریت اعلان‌های عملیاتی و Exceptionها به‌عنوان یک دامنه مستقل که می‌تواند از رخدادهای همه حوزه‌ها تغذیه شود.

## 2. مفاهیم اصلی

- Notification
- NotificationType
- Severity
- Recipient
- DeliveryChannel
- NotificationStatus
- SourceReference

## 3. Severity

- Critical
- High
- Medium
- Informational

## 4. وضعیت

```text
Created → Delivered → Seen / Dismissed
```

## 5. Invariants

- Notification خودش عملیات مالی انجام نمی‌دهد.
- اعلان باید SourceReference داشته باشد تا کاربر بتواند به علت برگردد.
- Dismiss کردن اعلان به‌معنای حذف Exception منبع نیست.
- دسترسی به اعلان تابع شرکت و Recipient است.

## 6. Commands

CreateNotification، MarkAsSeen، DismissNotification، EscalateNotification

## 7. Events

NotificationCreated، NotificationDelivered، NotificationSeen، NotificationDismissed
