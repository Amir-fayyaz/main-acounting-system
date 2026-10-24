import { Sparkles } from 'lucide-react';

export interface AboutManifestoLabelProps {
  children?: string;
}

function AboutManifestoLabel({ children = 'چرا تراز؟' }: AboutManifestoLabelProps) {
  return (
    <span className="mb-[13px] flex items-start gap-2 text-[11px] text-brand-link max-[600px]:pt-0 sm:pt-[9px] sm:text-xs">
      <Sparkles className="size-4" />
      {children}
    </span>
  );
}

export default AboutManifestoLabel;
