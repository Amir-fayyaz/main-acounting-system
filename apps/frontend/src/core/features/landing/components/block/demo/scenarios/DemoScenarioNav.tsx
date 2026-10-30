import { Span } from '@repo/web/ui';
import Link from 'next/link';

import { demoScenarioLinks } from '@/core/features/landing/assets/mock/demo/page';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';

export function DemoScenarioNav() {
  return (
    <section className="py-4">
      <div aria-label="سناریوهای دمو">
        <nav aria-label="بخش‌های دمو">
          <div className="mt-6 flex flex-wrap justify-center gap-2.5 max-sm:mt-5 max-sm:gap-1.5">
            {demoScenarioLinks.map((scenario) => (
              <Link
                key={scenario.href}
                href={scenario.href}
                className="flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-accent px-3 py-1.5 text-xs transition-colors duration-200 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:outline-none max-sm:min-h-8 max-sm:gap-1 max-sm:px-2.5 max-sm:py-1"
              >
                <LandingIcon
                  name={scenario.icon}
                  className="size-3.5 text-brand-link max-sm:size-3"
                />
                <Span className="text-[length:inherit]">{scenario.label}</Span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </section>
  );
}
