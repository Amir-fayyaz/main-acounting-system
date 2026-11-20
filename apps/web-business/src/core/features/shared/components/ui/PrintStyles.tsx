'use client';

interface PrintStylesProps {
  /** پیشوند data-attributeهای چاپ؛ `accounts` به `data-accounts-print` تبدیل می‌شود. */
  scope: string;
}

export function PrintStyles({ scope }: PrintStylesProps) {
  const printArea = `data-${scope}-print`;
  const actions = `data-${scope}-actions`;
  const toolbar = `data-${scope}-toolbar`;

  return (
    <style>{`
@media print {
  body:has([${printArea}]) [data-slot='sidebar'],
  body:has([${printArea}]) [data-panel-type] > div > header,
  body:has([${printArea}]) [${actions}],
  body:has([${printArea}]) [${toolbar}],
  body:has([${printArea}]) [data-slot='data-table-pagination'] {
    display: none !important;
  }

  body:has([${printArea}]) [${printArea}] [data-slot='table-container'] {
    overflow: visible !important;
  }

  body:has([${printArea}]) [${printArea}] table {
    width: 100% !important;
    font-size: 10pt;
  }

  body:has([${printArea}]) [${printArea}] [data-slot='table-row'] {
    break-inside: avoid;
  }

  @page {
    margin: 12mm;
  }
}
`}</style>
  );
}
