import { H2, P, Span } from '@/core/components/custom/ui/typography/Typography'; // اضافه شدن Span

const LEDGER_ROWS = [
  { label: 'فروش این ماه', value: '۴۸۲٬۰۰۰٬۰۰۰' },
  { label: 'هزینه‌ها', value: '۳۱۰٬۴۰۰٬۰۰۰' },
  { label: 'چک‌های سررسید هفته', value: '۷' },
  { label: 'سود ناخالص', value: '۱۷۱٬۶۰۰٬۰۰۰' },
];

/** پنل تیره‌ی تزئینی (`.auth-art` در auth.html) */
export function LedgerPanel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <aside className="bg-ink-soft relative hidden flex-col justify-center overflow-hidden p-14 text-white lg:flex">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-brand)_1.4px,transparent_1.4px)] bg-size-[28px_28px] opacity-25 mask-[radial-gradient(circle_at_30%_70%,#000,transparent_70%)]"
      />

      <div className="relative">
        <H2 className="max-w-110 text-start text-2xl leading-relaxed font-extrabold xl:text-3xl">
          {title}
        </H2>
        <P className="text-sand/70 mt-3 mb-8 max-w-105">{subtitle}</P>

        <ul
          aria-hidden="true"
          className="grid max-w-105 gap-3 rounded-2xl border border-white/12 bg-white/6 p-5"
        >
          {LEDGER_ROWS.map((row, i) => {
            const last = i === LEDGER_ROWS.length - 1;
            return (
              <li
                key={row.label}
                // استایل‌های مشترک را از هم جدا کردیم
                className={`flex justify-between text-sm ${
                  last
                    ? 'text-primary font-bold'
                    : 'text-sand/85 border-b border-dashed border-white/14 pb-2.5'
                }`}
              >
                {/* استفاده از Span برای متن‌ها */}
                <Span className="text-inherit">{row.label}</Span>
                <Span className="font-sans text-inherit">{row.value}</Span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
