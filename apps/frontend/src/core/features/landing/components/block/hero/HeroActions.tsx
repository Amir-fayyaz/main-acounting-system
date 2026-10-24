import { Button } from '@repo/web/ui';
import { ArrowLeft, Play } from 'lucide-react';

const HeroActions = () => {
  return (
    <div className="mx-auto mt-8 flex w-full max-w-xl flex-col items-center justify-center gap-3 min-[321px]:flex-row">
      <Button className="w-full min-w-0 px-2 py-4 text-[clamp(11px,2.5vw,16px)] font-medium min-[321px]:flex-1 sm:px-4 sm:py-6.5">
        تجربه محیط نمونه
        <ArrowLeft aria-hidden="true" size={18} className="shrink-0" />
      </Button>

      <Button
        variant="outline"
        className="w-full min-w-0 border-border px-2 py-4 text-[clamp(11px,2.5vw,16px)] font-medium text-foreground hover:bg-card min-[321px]:flex-1 min-[321px]:px-3 sm:px-4 sm:py-6.5"
      >
        <Play aria-hidden="true" size={18} className="shrink-0" />
        ببینید چطور کار می‌کند
      </Button>
    </div>
  );
};

export default HeroActions;
