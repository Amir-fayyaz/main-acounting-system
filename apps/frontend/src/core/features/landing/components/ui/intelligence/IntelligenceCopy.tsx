import { H2, P, Span } from '@/core/components/custom/ui/typography/Typography';
import type { AssistantSectionData } from '@/core/features/landing/assets/@types/sections';
import { BenefitsList } from '@/core/features/landing/components/ui/benefits/BenefitsList';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@/core/utils/shadcn/utils';

interface IntelligenceCopyProps {
  data: AssistantSectionData;
  isDemo: boolean;
  titleId: string;
}

export function IntelligenceCopy({ data, isDemo, titleId }: IntelligenceCopyProps) {
  return (
    <div className={cn(!isDemo && 'max-sm:row-start-1')}>
      <Span className={cn('landingEyebrowClass mb-2.5')}>{data.eyebrow}</Span>

      <H2
        id={titleId}
        className={cn(
          'mr-0 ml-0 leading-relaxed font-extrabold',
          isDemo
            ? 'mt-3 mb-3.5 text-3xl tracking-tight max-sm:text-2xl'
            : 'mt-0 mb-4 text-4xl tracking-tighter max-xl:text-3xl max-sm:text-3xl max-md:text-2xl',
        )}
      >
        {data.title.first}
        <br />
        {data.title.second}
      </H2>

      <P className="text-xs leading-loose text-[#746b60]">{data.description}</P>

      {data.benefits?.length ? (
        <BenefitsList
          items={data.benefits}
          className={cn(
            isDemo ? 'mt-5 max-sm:gap-3.5 max-md:gap-3' : 'my-5 max-sm:gap-3.5 max-md:gap-3',
          )}
          itemClassName="max-sm:text-xs max-md:text-xs"
          descriptionClassName="max-sm:text-xs max-md:text-xs"
        />
      ) : null}

      {data.tags?.length ? (
        <div className="mt-6 mb-5 flex flex-wrap gap-2 max-sm:mt-5 max-md:gap-1 [&>span]:rounded-sm [&>span]:border [&>span]:border-[#ddd5c5] [&>span]:py-1 [&>span]:px-2.5 [&>span]:text-xs [&>span]:text-[#74634c] max-sm:[&>span]:py-0.5 max-sm:[&>span]:px-2 max-sm:[&>span]:text-xs max-md:[&>span]:py-0.5 max-md:[&>span]:px-1.5 max-md:[&>span]:text-xs">
          {data.tags.map((tag) => (
            <Span className="text-[length:inherit]" key={tag}>
              {tag}
            </Span>
          ))}
        </div>
      ) : null}

      {data.callout ? (
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-[#dfd2b9] bg-[#fff3dc] py-3 px-3.5 text-xs leading-loose text-[#805f2d] max-sm:mt-5 max-sm:p-3">
          <LandingIcon name="info" className="mt-0.5 size-4 max-sm:size-3.5" />
          <Span className="text-xs leading-loose">{data.callout}</Span>
        </div>
      ) : null}

      {data.quote ? (
        <P className="mt-5 border-r-2 border-r-[#ffa00a] pr-3 text-xs leading-loose">
          {data.quote}
        </P>
      ) : null}
    </div>
  );
}
