'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import type { AssistantSectionData } from '@/core/features/landing/assets/@types/sections';
import { landingAssistantSectionData } from '@/core/features/landing/assets/mock/sections';
import { AssistantPreview } from '@/core/features/landing/components/ui/intelligence/AssistantPreview';
import { IntelligenceCopy } from '@/core/features/landing/components/ui/intelligence/IntelligenceCopy';
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
    <section className="py-8 sm:py-12">
      <div
        id={data.id}
        aria-labelledby={titleId}
        className={cn(isDemo && 'border-t border-border', className)}
      >
        <div
          className={cn(
            'grid grid-cols-2 items-center',
            isDemo
              ? 'gap-20 max-xl:gap-11 max-lg:gap-7 max-sm:grid-cols-1 max-sm:gap-6'
              : 'gap-20 max-xl:gap-9 max-sm:grid-cols-1 max-sm:gap-6 max-md:gap-7',
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
      </div>
    </section>
  );
}
