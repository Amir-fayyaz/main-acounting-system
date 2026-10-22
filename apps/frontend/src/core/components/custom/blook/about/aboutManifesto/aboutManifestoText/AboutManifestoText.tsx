export interface AboutManifestoTextProps {
  children?: string;
}

function AboutManifestoText({
  children = 'حسابدار باید وقتش را برای فهمیدن عددها بگذارد؛ نه برای نوشتن دوباره آن‌ها.',
}: AboutManifestoTextProps) {
  return (
    <p className="text-xl leading-5 tracking-[-0.3px] font-semibold max-[600px]:leading-[2] sm:text-[22px] sm:leading-[1.95] sm:tracking-[-0.5px] max-[900px]:text-[22px] sm:max-w-[820px]">
      {children}
    </p>
  );
}

export default AboutManifestoText;
