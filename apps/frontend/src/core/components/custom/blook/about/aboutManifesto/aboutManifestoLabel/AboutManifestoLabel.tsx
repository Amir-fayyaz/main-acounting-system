import TarazIcon from '@/core/components/custom/ui/icons/TarazIcon';

export interface AboutManifestoLabelProps {
  children?: string;
}

function AboutManifestoLabel({ children = 'چرا تراز؟' }: AboutManifestoLabelProps) {
  return (
    <span className="mb-[13px] flex items-start gap-2 text-[11px] text-manifesto-label max-taraz-sm:pt-0 sm:pt-[9px] sm:text-xs">
      <TarazIcon className="size-4" name="logo" />
      {children}
    </span>
  );
}

export default AboutManifestoLabel;
