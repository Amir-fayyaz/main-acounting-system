import { H1, P } from '@repo/web/ui';
import SectionLayout from '../../../../../../../../../packages/web/ui/components/custom/ui/wrapper/SectionLayout';
import { CiViewBoard } from 'react-icons/ci';

export function PanelPlaceholder({ title }: { title: string }) {
  return (
    <SectionLayout className="flex flex-1 flex-col py-6 sm:py-8 [&>.pages-container]:flex [&>.pages-container]:flex-1 [&>.pages-container]:flex-col [&>.pages-container]:gap-6 [&>.pages-container]:space-y-0 [&>.pages-container]:px-4 sm:[&>.pages-container]:px-6">
      <div className="space-y-1">
        <H1 className="text-start text-xl font-bold sm:text-2xl">{title}</H1>
        <P className="text-sm text-muted-foreground">فضای کاری شما در تراز</P>
      </div>
      <div className="grid flex-1 place-items-center rounded-xl border border-dashed bg-card p-6 text-center">
        <div className="max-w-prose space-y-3 py-12">
          <CiViewBoard className="mx-auto size-9 text-brand-dark" aria-hidden="true" />
          <P className="text-sm leading-7 text-muted-foreground">
            این بخش خالی است؛ محتوای صفحه اینجا قرار می‌گیرد.
          </P>
        </div>
      </div>
    </SectionLayout>
  );
}
