import { ImgNormalCustom, Small, Span } from '@repo/web/ui';
import { CiUser } from 'react-icons/ci';
import type { PanelAccount as PanelAccountDetails } from '../../../assets/@types/panel';

export function PanelAccount({ account }: { account?: PanelAccountDetails }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-foreground-box p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
      <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-primary-foreground">
        {account?.avatarSrc ? (
          <ImgNormalCustom
            src={account.avatarSrc}
            alt={account.name}
            fill
            sizes="2.5rem"
            className="object-cover"
          />
        ) : (
          <CiUser className="size-6" aria-hidden="true" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1 group-data-[collapsible=icon]:hidden">
        <Span className="truncate text-sm font-medium">{account?.name ?? 'حساب کاربری'}</Span>
        <Small className="truncate text-xs text-muted-foreground">
          {account?.description ?? 'حسابداری تراز'}
        </Small>
      </div>
    </div>
  );
}
