import { Check } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/components/shadcn/ui/table/table';
import type { ComparisonValue } from '@/core/features/landing/assets/@types/pricing';
import {
  comparisonColumns,
  comparisonFeatureHeader,
  comparisonRows,
} from '@/core/features/landing/assets/mock/pricing';
import { H2, P, Span } from '@/core/components/custom/ui/typography/Typography';

function ComparisonCell({ value }: { value: ComparisonValue }) {
  if (value.kind === 'included') {
    return (
      <div className="inline-flex items-center gap-1">
        <Check aria-hidden="true" strokeWidth={1.7} className="size-4 shrink-0 text-[#28765b]" />
        <Span className="text-xs">{value.label}</Span>
      </div>
    );
  }

  return <Span className="text-xs">{value.value}</Span>;
}

export function PricingComparison() {
  return (
    <section className="py-8 sm:py-12">
      <div aria-labelledby="comparison-title">
        <H2
          id="comparison-title"
          className="mt-0 mr-0 mb-3.5 ml-0 text-3xl leading-relaxed font-bold tracking-tight max-sm:text-2xl"
        >
          جزئیات را کنار هم ببینید.
        </H2>

        <P className="max-w-144 text-xs leading-loose text-[#746b60]">
          مقایسه ظرفیت‌های نمونه؛ مبنای انتخاب نهایی، نیاز و حجم کار تیم شماست.
        </P>

        <div
          role="region"
          aria-label="جدول مقایسه پلن‌ها؛ در موبایل قابل پیمایش افقی"
          tabIndex={0}
          className="mt-6 overflow-hidden rounded-xl border border-[#ddd3c0] bg-[#fffdf8] max-sm:mt-5"
        >
          <Table className="min-w-160 border-collapse text-center text-xs">
            <TableCaption className="caption-top mt-0 bg-[#eee8da] px-5 py-4 text-right text-xs font-semibold text-[#1a120a] max-sm:px-4 max-sm:py-3.5">
              <Span className="text-[length:inherit]">مقایسه پلن‌های نمایشی تراز</Span>
            </TableCaption>

            <TableHeader className="[&_tr]:border-none">
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead
                  scope="col"
                  className="h-auto min-w-52 border-t border-[#e4dccd] bg-[#f9f5e9] px-4 py-3.5 text-right text-xs font-semibold whitespace-nowrap text-[#1a120a] max-sm:min-w-48 max-sm:px-3.5 max-sm:py-3"
                >
                  <Span className="text-[length:inherit]">{comparisonFeatureHeader}</Span>
                </TableHead>

                {comparisonColumns.map((column) => (
                  <TableHead
                    key={column.id}
                    scope="col"
                    className="h-auto border-t border-[#e4dccd] bg-[#f9f5e9] px-4 py-3.5 text-center text-xs font-semibold whitespace-nowrap text-[#1a120a] max-sm:px-3.5 max-sm:py-3"
                  >
                    <Span className="text-[length:inherit]">{column.label}</Span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="[&_tr]:border-none">
              {comparisonRows.map((row) => (
                <TableRow key={row.label} className="border-0 hover:bg-transparent">
                  <TableHead
                    scope="row"
                    className="h-auto border-t border-[#e4dccd] bg-transparent px-4 py-3.5 text-right text-xs font-medium whitespace-nowrap text-[#1a120a] max-sm:px-3.5 max-sm:py-3"
                  >
                    <Span className="text-[length:inherit]">{row.label}</Span>
                  </TableHead>

                  {row.values.map((value, index) => (
                    <TableCell
                      key={`${row.label}-${comparisonColumns[index]?.id ?? index}`}
                      className="border-t border-[#e4dccd] px-4 py-3.5 text-xs whitespace-nowrap text-[#78654a] max-sm:px-3.5 max-sm:py-3"
                    >
                      <ComparisonCell value={value} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}
