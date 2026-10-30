import { H1, P, SectionLayout } from '@repo/web/ui';

export function PanelPlaceholder({ title }: { title: string }) {
  return (
    <SectionLayout>
      <div className="space-y-2">
        <H1 className="text-start text-xl font-bold sm:text-2xl">{title}</H1>
        <P className="text-sm text-muted-foreground">محتوای این صفحه در ادامه اضافه می‌شود.</P>
      </div>
    </SectionLayout>
  );
}
