import { Span } from '@/core/components/custom/ui/typography/Typography';
import type { ReviewLine } from '@/core/features/landing/assets/@types/sections';

export const reviewLineClass =
  'flex justify-between gap-[10px] py-[6px] text-[10px] text-[#766a59] [&+&]:border-t [&+&]:border-[#f0ede5] [&_strong]:font-[600] [&_strong]:text-[#1a120a]';

export function ReviewRows({ lines }: { lines: readonly ReviewLine[] }) {
  return lines.map((line) => (
    <div key={line.label} className={reviewLineClass}>
      <Span className="text-[10px]">{line.label}</Span>
      <strong>{line.value}</strong>
    </div>
  ));
}
