# 12 — Development Conventions

## Commit

Commit باید کوچک، مرتبط با یک هدف مشخص و قابل توضیح باشد.

## Pull Request

PR باید:

- هدف تغییر
- Scope
- Risk
- Test انجام‌شده
- Migration در صورت وجود
- اثر روی Security/Performance

را مشخص کند.

## Documentation

تصمیم معماری جدید باید ADR داشته باشد.
Business Rule جدید باید Domain/Product Documentation را به‌روزرسانی کند.
تغییر فنی عمومی باید Engineering Documentation را به‌روزرسانی کند.

## Breaking Change

Breaking Change بدون Versioning و Migration Plan مجاز نیست.

## Dependency

اضافه کردن Dependency جدید باید دلیل، وضعیت نگهداری، License، Security و اثر Bundle/Runtime را بررسی کند.
