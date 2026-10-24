import Link from 'next/link';

import { demoScenarioLinks } from '@/core/features/demo/assets/mock/page';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { landingContainerClass } from '@/core/features/landing/lib/landing-classes';

export function DemoScenarioNav() {
  return (
    <nav aria-label="بخش‌های دمو" className={landingContainerClass}>
      <div className="mt-[25px] flex flex-wrap justify-center gap-[11px] max-[600px]:mt-5 max-[600px]:gap-[7px]">
        {demoScenarioLinks.map((scenario) => (
          <Link
            key={scenario.href}
            href={scenario.href}
            className="flex min-h-[36px] items-center gap-[6px] rounded-[30px] border border-[#e0d2b8] bg-[#f4ecdb] px-[13px] py-[6px] text-[11px] transition-colors duration-200 hover:bg-[#eee2cb] focus-visible:ring-2 focus-visible:ring-[#a95600]/40 focus-visible:ring-offset-2 focus-visible:outline-none max-[600px]:min-h-[33px] max-[600px]:gap-[5px] max-[600px]:px-[10px] max-[600px]:py-[5px] max-[600px]:text-[9px]"
          >
            <LandingIcon
              name={scenario.icon}
              className="size-[14px] text-[#99661a] max-[600px]:size-3"
            />
            {scenario.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
