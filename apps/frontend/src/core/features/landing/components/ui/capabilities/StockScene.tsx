import { Card } from '@/core/components/shadcn/ui/card/card';
import { Small, Span } from '@/core/components/custom/ui/typography/Typography';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import type { CSSProperties } from 'react';

const stockLines = [
  { code: '۰۰۱', name: 'قطعه صنعتی A', quantity: '۸۴', fill: '78%' },
  { code: '۰۰۲', name: 'بسته اتصالات', quantity: '۵۶', fill: '55%' },
  { code: '۰۰۳', name: 'تجهیزات جانبی', quantity: '۳۲', fill: '34%' },
];

export function StockScene() {
  return (
    <div className="relative mx-[30px] mt-[22px] mb-[28px] max-w-[390px] max-[1050px]:mx-6 max-[440px]:mx-[22px] max-[680px]:m-[24px_27px_28px] max-[680px]:max-w-none max-[850px]:mx-[19px]">
      {stockLines.map((line) => (
        <Card
          key={line.code}
          className="relative !flex !flex-row !items-center !gap-[10px] !rounded-[7px] !border-[#d98b10] !bg-[#fff9e9] !p-[11px_13px] !text-inherit !shadow-[0_3px_0_#b96c0640] text-[10px] max-[440px]:!gap-2 max-[440px]:!p-[11px] max-[680px]:!gap-[11px] max-[680px]:!p-[12px_14px] max-[850px]:!gap-[7px] max-[850px]:!p-[10px] [&+&]:mr-[15px] [&+&]:mt-[9px] [&:last-child]:mr-[30px] max-[440px]:[&+&]:mr-[10px] max-[440px]:[&:last-child]:mr-[20px] max-[680px]:[&+&]:mr-[15px] max-[680px]:[&:last-child]:mr-[30px] max-[850px]:[&+&]:mr-[9px] max-[850px]:[&:last-child]:mr-[18px] [&>svg]:size-[22px] [&>svg]:text-[#98702c] max-[440px]:[&>svg]:size-5 max-[680px]:[&>svg]:size-[22px] max-[850px]:[&>svg]:size-[17px]"
        >
          <LandingIcon name="box" />

          <div>
            <Span className="block text-[11px] font-[650] max-[440px]:text-[10px] max-[680px]:text-[12px] max-[850px]:text-[10px]">
              {line.name}
            </Span>

            <Small className="!block !text-[9px] !font-normal !leading-[1.7] !text-[#7b6c50] max-[440px]:!text-[8px] max-[680px]:!text-[9px] max-[850px]:!text-[8px]">
              انبار مرکزی · کد {line.code}
            </Small>

            <div
              className="mt-[6px] h-1 w-[50px] overflow-hidden rounded-[3px] bg-[#eee1c4] before:block before:h-1 before:w-[var(--fill)] before:rounded-[3px] before:bg-[#7d9568] before:content-[''] max-[440px]:w-[58px] max-[680px]:w-[75px]"
              style={{ '--fill': line.fill } as CSSProperties}
            />
          </div>

          <Span className="!mr-auto !text-[14px] !font-bold !whitespace-nowrap max-[440px]:!text-[13px] max-[680px]:!text-[15px] max-[850px]:!text-[12px]">
            {line.quantity}

            <Small className="!block !text-left !text-[8px] !font-normal max-[680px]:!text-[9px] max-[850px]:!text-[8px]">
              واحد موجود
            </Small>
          </Span>
        </Card>
      ))}
    </div>
  );
}