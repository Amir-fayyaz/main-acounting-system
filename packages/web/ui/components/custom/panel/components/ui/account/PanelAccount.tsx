import type { ReactNode } from 'react';
import { ImgNormalCustom } from '../../../../ui/image/ImgNormalCustom';
import { Small, Span } from '../../../../ui/typography/Typography';
import type { PanelAccount as PanelAccountDetails } from '../../../assets/@types/panel';

export function PanelAccount({
  account,
  logoutControl,
}: {
  account?: PanelAccountDetails;
  logoutControl?: ReactNode;
}) {
  const name = account?.name ?? 'حساب کاربری';

  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-foreground-box p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
      <div className="relative grid size-[38px] shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-primary-foreground">
        {account?.avatarSrc ? (
          <ImgNormalCustom
            src={account.avatarSrc}
            alt={name}
            fill
            sizes="2.375rem"
            className="object-cover"
          />
        ) : (
          <span aria-hidden="true" className="text-sm font-bold">
            {name.trim().charAt(0)}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
        <Span className="truncate text-[13.5px] font-bold">{name}</Span>
        <Small className="truncate text-[11.5px] text-muted-foreground">
          {account?.description ?? 'حسابداری تراز'}
        </Small>
      </div>
      {logoutControl}
    </div>
  );
}
