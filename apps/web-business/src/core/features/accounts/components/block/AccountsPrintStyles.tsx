'use client';

/**
 * استایل چاپ فهرست حساب‌ها، هم‌راستا با نمونه‌ی `accounts.html`:
 * فقط عنوان، آمار و جدول چاپ می‌شود و پوسته‌ی پنل، ابزارها و صفحه‌بندی حذف می‌شوند.
 */
const PRINT_STYLES = `
@media print {
  body:has([data-accounts-print]) [data-slot='sidebar'],
  body:has([data-accounts-print]) [data-panel-type] > div > header,
  body:has([data-accounts-print]) [data-accounts-actions],
  body:has([data-accounts-print]) [data-accounts-toolbar],
  body:has([data-accounts-print]) [data-slot='data-table-pagination'] {
    display: none !important;
  }

  body:has([data-accounts-print]) [data-accounts-print] [data-slot='table-container'] {
    overflow: visible !important;
  }

  body:has([data-accounts-print]) [data-accounts-print] table {
    width: 100% !important;
    font-size: 10pt;
  }

  body:has([data-accounts-print]) [data-accounts-print] [data-slot='table-row'] {
    break-inside: avoid;
  }

  @page {
    margin: 12mm;
  }
}
`;

export function AccountsPrintStyles() {
  return <style>{PRINT_STYLES}</style>;
}
