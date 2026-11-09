'use client';

/**
 * استایل چاپ فهرست دستگاه‌های POS، هم‌راستا با نمونه‌ی `pos.html`:
 * فقط عنوان و جدول چاپ می‌شود و پوسته‌ی پنل، ابزارها و صفحه‌بندی حذف می‌شوند.
 */
const PRINT_STYLES = `
@media print {
  body:has([data-pos-print]) [data-slot='sidebar'],
  body:has([data-pos-print]) [data-panel-type] > div > header,
  body:has([data-pos-print]) [data-pos-actions],
  body:has([data-pos-print]) [data-pos-toolbar],
  body:has([data-pos-print]) [data-slot='data-table-pagination'] {
    display: none !important;
  }

  body:has([data-pos-print]) [data-pos-print] [data-slot='table-container'] {
    overflow: visible !important;
  }

  body:has([data-pos-print]) [data-pos-print] table {
    width: 100% !important;
    font-size: 10pt;
  }

  body:has([data-pos-print]) [data-pos-print] [data-slot='table-row'] {
    break-inside: avoid;
  }

  @page {
    margin: 12mm;
  }
}
`;

export function PosPrintStyles() {
  return <style>{PRINT_STYLES}</style>;
}
