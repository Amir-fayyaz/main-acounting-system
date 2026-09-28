# دامنه طرف‌حساب

## 1. هدف

ارائه یک هویت مشترک برای اشخاص و سازمان‌هایی که در چند فرآیند مالی و عملیاتی نقش دارند.

## 2. مفاهیم اصلی

- Party
- Individual / Organization profile
- PartyRole
- ContactMethod
- Address
- BankAccountReference
- TaxIdentifier / Registration attributes

## 3. نقش‌ها

یک Party می‌تواند هم‌زمان یا در دوره‌های مختلف نقش‌های زیر را داشته باشد:

- Customer
- Supplier
- Employee Reference
- Other Party

Employee اطلاعات شغلی و حقوقی خودش را در Payroll نگهداری می‌کند و فقط هویت پایه را از Party به ارث می‌برد/ارجاع می‌دهد.

## 4. Invariants

- یک Party نباید با نقش‌های مختلف چند هویت پایه ناسازگار داشته باشد.
- حذف فیزیکی Party دارای سابقه مالی مجاز نیست.
- نقش Party قابل تغییر است ولی تاریخچه و روابط مالی حفظ می‌شوند.
- اطلاعات حساس Party فقط تحت مجوز دامنه مربوط قابل دسترسی است.

## 5. Commands

CreateParty، UpdateParty، AddPartyRole، RemovePartyRole، AddContact، UpdateBankAccountReference، DeactivateParty

## 6. Events

PartyCreated، PartyUpdated، PartyRoleAdded، PartyRoleRemoved، PartyDeactivated

## 7. Cross-Domain

Purchase و Sales از Party به‌عنوان هویت مرجع استفاده می‌کنند؛ Accounting از آن برای تفصیلی/شناسه طرف‌حساب استفاده می‌کند؛ Payroll داده‌های Employee-specific را مالک است.
