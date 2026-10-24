import { H2, P, Span } from '@/core/components/custom/ui/typography/Typography';
import type { AssistantSectionData } from '@/core/features/landing/assets/@types/sections';
import { BenefitsList } from '@/core/features/landing/components/ui/benefits/BenefitsList';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { landingEyebrowClass } from '@/core/features/landing/lib/landing-classes';
import { cn } from '@/core/utils/shadcn/utils';

interface IntelligenceCopyProps {
  data: AssistantSectionData;
  isDemo: boolean;
  titleId: string;
}

export function IntelligenceCopy({ data, isDemo, titleId }: IntelligenceCopyProps) {
  return (
    <div className={cn(!isDemo && 'max-[600px]:row-start-1')}>
      <Span className={cn(landingEyebrowClass, 'mb-2.5')}>{data.eyebrow}</Span>

      <H2
        id={titleId}
        className={cn(
          'mr-0 ml-0 leading-[1.7] font-[780]',
          isDemo
            ? 'mt-3 mb-[15px] text-[33px] tracking-[-0.8px] max-[900px]:text-[28px] max-[600px]:text-[27px] max-[600px]:tracking-[-0.7px]'
            : 'mt-0 mb-4 text-[34px] tracking-[-1.2px] max-[1050px]:text-[28px] max-[600px]:text-[28px] max-[800px]:text-[25px]',
        )}
      >
        {data.title.first}
        <br />
        {data.title.second}
      </H2>

      <P className="text-[13px] leading-[2.2] text-[#746b60] max-[600px]:text-[12px] max-[800px]:text-[12px]">
        {data.description}
      </P>

      {data.benefits?.length ? (
        <BenefitsList
          items={data.benefits}
          className={cn(
            isDemo
              ? 'mt-[22px] max-[600px]:gap-[15px] max-[800px]:gap-3'
              : 'my-[22px] max-[600px]:gap-[15px] max-[800px]:gap-3',
          )}
          itemClassName="max-[600px]:text-[12px] max-[800px]:text-[12px]"
          descriptionClassName="max-[600px]:text-[10px] max-[800px]:text-[10px]"
        />
      ) : null}

      {data.tags?.length ? (
        <div className="mt-[25px] mb-5 flex flex-wrap gap-2 max-[600px]:mt-5 max-[800px]:gap-[5px] [&>span]:rounded-[5px] [&>span]:border [&>span]:border-[#ddd5c5] [&>span]:p-[4px_10px] [&>span]:text-[11px] [&>span]:text-[#74634c] max-[600px]:[&>span]:p-[3px_9px] max-[600px]:[&>span]:text-[10px] max-[800px]:[&>span]:p-[3px_7px] max-[800px]:[&>span]:text-[10px]">
          {data.tags.map((tag) => (
            <Span key={tag}>{tag}</Span>
          ))}
        </div>
      ) : null}

      {data.callout ? (
        <div className="mt-[23px] flex items-start gap-[9px] rounded-[8px] border border-[#dfd2b9] bg-[#fff3dc] p-[13px_15px] text-[11px] leading-[2] text-[#805f2d] max-[600px]:mt-5 max-[600px]:p-3 max-[600px]:text-[10px]">
          <LandingIcon name="info" className="mt-[3px] size-[17px] max-[600px]:size-[15px]" />
          <Span className="text-[11px] leading-[2] max-[600px]:text-[10px]">{data.callout}</Span>
        </div>
      ) : null}

      {data.quote ? (
        <P className="mt-[22px] border-r-2 border-r-[#ffa00a] pr-[13px] text-[11px] leading-[2] max-[800px]:text-[10px]">
          {data.quote}
        </P>
      ) : null}
    </div>
  );
}
