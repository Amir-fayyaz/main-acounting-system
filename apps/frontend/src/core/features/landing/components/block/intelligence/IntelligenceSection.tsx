'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import type { AssistantSectionData } from '@/core/features/landing/assets/@types/sections';
import { landingAssistantSectionData } from '@/core/features/landing/assets/mock/sections';
import { AssistantPreview } from '@/core/features/landing/components/block/intelligence/AssistantPreview';
import { IntelligenceCopy } from '@/core/features/landing/components/block/intelligence/IntelligenceCopy';
import { landingContainerClass } from '@/core/features/landing/lib/landing-classes';
import { cn } from '@repo/web/ui/utils/cn';

interface IntelligenceSectionProps {
  data?: AssistantSectionData;
  variant?: 'landing' | 'demo';
  className?: string;
}

export function IntelligenceSection({
  data = landingAssistantSectionData,
  variant = 'landing',
  className,
}: IntelligenceSectionProps) {
  const [approved, setApproved] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const isDemo = variant === 'demo';
  const titleId = `${data.id}-title`;
  const manualReviewId = `${data.id}-manual-review`;

  const handleApprovalToggle = () => {
    if (approved) {
      setApproved(false);
      setManualOpen(false);
      toast(data.preview.actions.toastReset);
      return;
    }

    setApproved(true);
    toast(data.preview.actions.toastApproved);
  };

  const copy = <IntelligenceCopy data={data} isDemo={isDemo} titleId={titleId} />;
  const preview = (
    <AssistantPreview
      approved={approved}
      manualOpen={manualOpen}
      manualReviewId={manualReviewId}
      preview={data.preview}
      onApprovalToggle={handleApprovalToggle}
      onManualToggle={() => setManualOpen((open) => !open)}
    />
  );

  return (
    <section
      id={data.id}
      aria-labelledby={titleId}
      className={cn(
        landingContainerClass,
        isDemo
          ? 'border-t border-[#e4dfd2] pt-[55px] pb-[30px] max-[600px]:py-[43px]'
          : 'pt-[92px] pb-[94px] max-[600px]:pt-[60px] max-[600px]:pb-[58px] max-[800px]:pb-[65px]',
        className,
      )}
    >
      <div
        className={cn(
          'grid grid-cols-2 items-center',
          isDemo
            ? 'gap-[75px] max-[1100px]:gap-[45px] max-[900px]:gap-[30px] max-[600px]:grid-cols-1 max-[600px]:gap-[25px]'
            : 'gap-20 max-[1050px]:gap-[38px] max-[600px]:grid-cols-1 max-[600px]:gap-[26px] max-[800px]:gap-[30px]',
        )}
      >
        {isDemo ? (
          <>
            {copy}
            {preview}
          </>
        ) : (
          <>
            {preview}
            {copy}
          </>
        )}
      </div>
    </section>
  );
}
