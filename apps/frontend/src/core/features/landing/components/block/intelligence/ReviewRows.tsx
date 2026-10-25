import { Span } from '@/core/components/custom/ui/typography/Typography';
import type { ReviewLine } from '@/core/features/landing/assets/@types/sections';



export function ReviewRows({ lines }: { lines: readonly ReviewLine[] }) {
  return lines.map((line) => (
    <div key={line.label} className="review-line">
      <Span className="text-[10px]">{line.label}</Span>
      <strong>{line.value}</strong>
    </div>
  ));
}
