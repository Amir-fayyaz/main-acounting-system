import { demoHeroData } from '@/core/features/demo/assets/mock/page';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import {
  landingContainerClass,
  landingEyebrowClass,
} from '@/core/features/landing/lib/landing-classes';
import { H1, P, Span } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

export function DemoHero() {
  return (
    <section aria-labelledby="demo-title" className={landingContainerClass}>
      <div className="mx-auto max-w-[800px] pt-[66px] pb-[29px] text-center max-[600px]:pt-[43px] max-[600px]:pb-6 max-[900px]:pt-[53px]">
        <Span className={cn(landingEyebrowClass, 'justify-center')}>{demoHeroData.eyebrow}</Span>

        <H1
          id="demo-title"
          className="mt-[17px] mb-[15px] text-[48px] leading-[1.65] font-extrabold tracking-[-1.8px] max-[600px]:mt-[13px] max-[600px]:mb-3 max-[600px]:text-[32px] max-[600px]:leading-[1.7] max-[600px]:tracking-[-1px] max-[900px]:text-[41px]"
        >
          {demoHeroData.title.first}
          <br />
          <span className="text-[#a86400]">{demoHeroData.title.accent}</span>
        </H1>

        <P className="mx-auto max-w-[570px] text-[14px] leading-[2.1] text-[#746b60] max-[600px]:max-w-[345px] max-[600px]:text-[12px]">
          {demoHeroData.description}
        </P>

        <P className="mt-[17px] flex items-center justify-center gap-[7px] text-[11px] leading-[2] text-[#826037] max-[600px]:mt-4 max-[600px]:items-start max-[600px]:gap-[6px] max-[600px]:text-[10px]">
          <LandingIcon
            name="shield"
            className="size-[15px] max-[600px]:mt-0.5 max-[600px]:size-[13px]"
          />
          {demoHeroData.notice}
        </P>
      </div>
    </section>
  );
}
