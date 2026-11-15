'use client';

/**
 * استایل چاپ فهرست چک‌ها، هم‌راستا با نمونه‌ی `cheques.html`:
 * فقط عنوان، آمار و جدول چاپ می‌شود و پوسته‌ی پنل، ابزارها، عملیات و صفحه‌بندی حذف می‌شوند.
 */
const PRINT_STYLES = `
@media print {
  body:has([data-checks-print]) [data-slot='sidebar'],
  body:has([data-checks-print]) [data-panel-type] > div > header,
  body:has([data-checks-print]) [data-checks-actions],
  body:has([data-checks-print]) [data-checks-toolbar],
  body:has([data-checks-print]) [data-slot='data-table-pagination'] {
    display: none !important;
  }

  body:has([data-checks-print]) [data-checks-print] [data-slot='table-container'] {
    overflow: visible !important;
  }

  body:has([data-checks-print]) [data-checks-print] table {
    width: 100% !important;
    font-size: 10pt;
  }

  body:has([data-checks-print]) [data-checks-print] [data-slot='table-row'] {
    break-inside: avoid;
  }

  @page {
    margin: 12mm;
  }
}
`;

export function ChecksPrintStyles() {
  return <style>{PRINT_STYLES}</style>;
}
