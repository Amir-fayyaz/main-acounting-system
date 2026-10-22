export interface FaqCountProps {
  count: number;
}

function FaqCount({ count }: FaqCountProps) {
  return (
    <p aria-live="polite" className="mb-[15px] text-[10px] text-faq-count" role="status">
      {new Intl.NumberFormat('fa-IR').format(count)} پاسخ برای شما
    </p>
  );
}

export default FaqCount;
