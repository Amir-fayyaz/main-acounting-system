import { Check } from 'lucide-react';

import type { ComparisonValue } from '@/core/features/pricing/assets/@types/pricing';
import {
  comparisonColumns,
  comparisonFeatureHeader,
  comparisonRows,
} from '@/core/features/pricing/assets/mock/pricing';
import {
  H2,
  P,
  Span,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web/ui';

function ComparisonCell({ value }: { value: ComparisonValue }) {
  if (value.kind === 'included') {
    return (
      <div className="inline-flex items-center gap-1">
        <Check aria-hidden="true" strokeWidth={1.7} className="size-4 shrink-0 text-[#28765b]" />
        <Span className="text-xs">{value.label}</Span>
      </div>
    );
  }

  return value.value;
}

export function PricingComparison() {
  return (
    <section
      aria-labelledby="comparison-title"
      className="py-[45px] pb-[65px] max-[600px]:pt-[35px] max-[600px]:pb-[45px]"
    >
      <H2
        id="comparison-title"
        className="mt-0 mr-0 mb-[14px] ml-0 text-[31px] leading-[1.75] font-bold tracking-[-0.8px] max-[600px]:text-[26px]"
      >
        جزئیات را کنار هم ببینید.
      </H2>

      <P className="max-w-[600px] text-[13px] leading-[2.1] text-[#746b60] max-[600px]:text-xs">
        مقایسه ظرفیت‌های نمونه؛ مبنای انتخاب نهایی، نیاز و حجم کار تیم شماست.
      </P>

      <div
        role="region"
        aria-label="جدول مقایسه پلن‌ها؛ در موبایل قابل پیمایش افقی"
        tabIndex={0}
        className="mt-[26px] overflow-hidden rounded-[12px] border border-[#ddd3c0] bg-[#fffdf8] max-[600px]:mt-[21px]"
      >
        <Table className="min-w-[680px] border-collapse text-center text-xs max-[600px]:min-w-[640px]">
          <TableCaption className="caption-top mt-0 bg-[#eee8da] px-[22px] py-[18px] text-right text-[13px] font-[650] text-[#1a120a] max-[600px]:px-[18px] max-[600px]:py-[15px] max-[600px]:text-xs">
            مقایسه پلن‌های نمایشی تراز
          </TableCaption>

          <TableHeader className="[&_tr]:border-none">
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead
                scope="col"
                className="h-auto min-w-[210px] border-t border-[#e4dccd] bg-[#f9f5e9] px-[18px] py-[15px] text-right text-xs font-[650] whitespace-nowrap text-[#1a120a] max-[600px]:min-w-[185px] max-[600px]:px-[15px] max-[600px]:py-[13px]"
              >
                {comparisonFeatureHeader}
              </TableHead>

              {comparisonColumns.map((column) => (
                <TableHead
                  key={column.id}
                  scope="col"
                  className="h-auto border-t border-[#e4dccd] bg-[#f9f5e9] px-[18px] py-[15px] text-center text-xs font-[650] whitespace-nowrap text-[#1a120a] max-[600px]:px-[15px] max-[600px]:py-[13px]"
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="[&_tr]:border-none">
            {comparisonRows.map((row) => (
              <TableRow key={row.label} className="border-0 hover:bg-transparent">
                <TableHead
                  scope="row"
                  className="h-auto border-t border-[#e4dccd] bg-transparent px-[18px] py-[15px] text-right text-[11px] font-medium whitespace-nowrap text-[#1a120a] max-[600px]:px-[15px] max-[600px]:py-[13px]"
                >
                  {row.label}
                </TableHead>

                {row.values.map((value, index) => (
                  <TableCell
                    key={`${row.label}-${comparisonColumns[index]?.id ?? index}`}
                    className="border-t border-[#e4dccd] px-[18px] py-[15px] text-[11px] whitespace-nowrap text-[#78654a] max-[600px]:px-[15px] max-[600px]:py-[13px]"
                  >
                    <ComparisonCell value={value} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
