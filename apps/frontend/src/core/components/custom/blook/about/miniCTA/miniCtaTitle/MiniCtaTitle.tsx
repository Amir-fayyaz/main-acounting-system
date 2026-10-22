export interface MiniCtaTitleProps {
  children?: string;
}

function MiniCtaTitle({ children = 'مسیر کار خودتان را پیدا کنید.' }: MiniCtaTitleProps) {
  return (
    <h2 className="mb-[5px] text-[22px] leading-[1.8] tracking-[-0.5px] sm:text-[23px] max-taraz-xl:text-[21px]">
      {children}
    </h2>
  );
}

export default MiniCtaTitle;
