import { Button, Span } from '@repo/web/ui';

import { ArrowLeft, Play } from 'lucide-react';

const HeroActions = () => {
  return (
    <div className="mx-auto mt-8 flex w-full max-w-xl flex-col items-center justify-center gap-3 sm:flex-row">
      <Button className="w-full min-w-0 px-2 py-4 text-base font-medium sm:flex-1 sm:px-4 sm:py-6.5">
        <Span className="text-[length:inherit]">تجربه محیط نمونه</Span>
        <ArrowLeft aria-hidden="true" size={18} className="shrink-0" />
      </Button>

      <Button
        variant="outline"
        className="w-full min-w-0 border-border px-2 py-4 text-base font-medium text-foreground hover:bg-card sm:flex-1 sm:px-4 sm:py-6.5"
      >
        <Play aria-hidden="true" size={18} className="shrink-0" />
        <Span className="text-[length:inherit]">ببینید چطور کار می‌کند</Span>
      </Button>
    </div>
  );
};

export default HeroActions;
