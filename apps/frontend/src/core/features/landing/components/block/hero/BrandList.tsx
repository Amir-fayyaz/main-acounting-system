import { Span } from '@repo/web/ui';
import { CarFront, PlayCircle, ShoppingBag, Store, Wallet, type LucideIcon } from 'lucide-react';

type Brand = {
  name: string;
  icon?: LucideIcon;
};

const brands = [
  { name: 'دیجی‌کالا', icon: ShoppingBag },
  { name: 'زرین‌پال', icon: Wallet },
  { name: 'آپارات', icon: PlayCircle },
  { name: 'تپسی', icon: CarFront },
  { name: '!Snapp' },
  { name: 'بازار', icon: Store },
] satisfies Brand[];

export function BrandList() {
  return (
    <section aria-label="برندها" dir="rtl" className="mx-auto mt-8">
      <ul className="m-0 grid list-none grid-cols-3 items-center justify-items-center gap-x-2 gap-y-8 p-0 sm:flex sm:flex-nowrap sm:justify-between sm:gap-3 lg:gap-8">
        {brands.map(({ name, icon: Icon }) => (
          <li key={name} className="min-w-0">
            <div className="group flex cursor-default items-center justify-center gap-1.5 text-muted-foreground transition-colors duration-200 hover:text-black sm:gap-2">
              {Icon && (
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0 transition-colors duration-200 sm:size-6"
                />
              )}

              <Span className="whitespace-nowrap text-[22px] font-medium transition-colors duration-200 group-hover:text-black sm:text-[27px]">
                {name}
              </Span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
