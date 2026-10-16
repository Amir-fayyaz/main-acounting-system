import { H2, P } from "@/core/components/custom/ui/typography/Typography";

const LEDGER_ROWS = [
  { label: "فروش این ماه", value: "۴۸۲٬۰۰۰٬۰۰۰" },
  { label: "هزینه‌ها", value: "۳۱۰٬۴۰۰٬۰۰۰" },
  { label: "چک‌های سررسید هفته", value: "۷" },
  { label: "سود ناخالص", value: "۱۷۱٬۶۰۰٬۰۰۰" },
];

/** پنل تیره‌ی تزئینی (`.auth-art` در auth.html) */
export function LedgerPanel({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <aside className="bg-ink-soft relative hidden flex-col justify-center overflow-hidden p-14 text-white lg:flex">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,160,10,0.25)_1.4px,transparent_1.4px)] bg-[length:28px_28px] [mask-image:radial-gradient(circle_at_30%_70%,#000,transparent_70%)]"
      />
      <div className="relative">
        <H2 className="max-w-[440px] text-start text-[clamp(1.6rem,2.6vw,2.2rem)] leading-[1.6] font-extrabold">
          {title}
        </H2>
        <P className="mt-3 mb-8 max-w-[420px] text-[#cdbfa9]">{subtitle}</P>
        <ul
          aria-hidden="true"
          className="grid max-w-[420px] gap-3 rounded-[18px] border border-white/12 bg-white/6 p-5"
        >
          {LEDGER_ROWS.map((row, i) => {
            const last = i === LEDGER_ROWS.length - 1;
            return (
              <li
                key={row.label}
                className={
                  last
                    ? "text-primary flex justify-between text-sm font-bold"
                    : "flex justify-between border-b border-dashed border-white/14 pb-2.5 text-sm text-[#e8dcc6]"
                }
              >
                <span>{row.label}</span>
                <span className="font-sans">{row.value}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
