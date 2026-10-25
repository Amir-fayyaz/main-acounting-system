import SectionLayout from '@/core/components/custom/ui/wrapper/SectionLayout';
import { H1, P, Span } from '@/core/components/custom/ui/typography/Typography';
import { demoHeroData } from '@/core/features/landing/assets/mock/demo/page';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@/core/utils/shadcn/utils';

export function DemoHero() {
  return (
    <SectionLayout className="py-8 sm:py-12">
      <div aria-labelledby="demo-title" className="mx-auto max-w-200 text-center">
        <Span className={cn('landingEyebrowClass justify-center')}>{demoHeroData.eyebrow}</Span>

        <H1
          id="demo-title"
          className="mt-4 mb-3.5 leading-relaxed font-extrabold tracking-tighter max-sm:mt-3 max-sm:mb-3 text-3xl sm:text-5xl"
        >
          {demoHeroData.title.first}
          <br />
          <Span className="text-[length:inherit] text-[#a86400]">{demoHeroData.title.accent}</Span>
        </H1>

        <P className="mx-auto max-w-144 text-sm leading-loose text-[#746b60] max-sm:max-w-80 max-sm:text-xs">
          {demoHeroData.description}
        </P>

        <P className="mt-4 flex items-center justify-center gap-1.5 text-xs leading-loose text-[#826037] max-sm:items-start">
          <LandingIcon name="shield" className="size-3.5 max-sm:mt-0.5 max-sm:size-3" />
          {demoHeroData.notice}
        </P>
      </div>
    </SectionLayout>
  );
}
