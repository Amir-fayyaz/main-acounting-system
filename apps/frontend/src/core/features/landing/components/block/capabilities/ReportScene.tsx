import { P, Small, Span } from '@repo/web/ui';
import type { CSSProperties } from 'react';

const breakdown = [
  { label: 'سود خالص', value: '۲۸٪', slice: '#ffa00a' },
  { label: 'هزینه‌های عملیاتی', value: '۵۴٪', slice: '#4c4435' },
  { label: 'بهای کالا', value: '۱۸٪', slice: '#e7deca' },
];

export function ReportScene() {
  return (
    <div className="mx-[32px] mt-[24px] mb-[27px] grid grid-cols-[148px_1fr] items-center gap-7 border-t border-[#e9e2d4] pt-[22px] max-[1050px]:mx-[26px] max-[1050px]:grid-cols-[130px_1fr] max-[1050px]:gap-[18px] max-[350px]:mx-[18px] max-[350px]:grid-cols-[94px_1fr] max-[350px]:gap-3 max-[440px]:m-[22px] max-[440px]:grid-cols-[111px_1fr] max-[440px]:gap-[18px] max-[680px]:m-[24px_27px_28px] max-[680px]:grid-cols-[140px_1fr] max-[680px]:gap-7 max-[680px]:pt-6 max-[850px]:m-[22px] max-[850px]:grid-cols-[105px_1fr] max-[850px]:gap-4">
      <div
        role="img"
        aria-label="نمودار نمونه: ۲۸ درصد سود خالص، ۵۴ درصد هزینه عملیاتی و ۱۸ درصد بهای کالا"
        className="grid size-[138px] -rotate-90 place-items-center rounded-full bg-[conic-gradient(#ffa00a_0_28%,#4c4435_28%_82%,#e7deca_82%_100%)] before:col-start-1 before:row-start-1 before:size-[105px] before:rounded-full before:bg-[#fffdf8] before:content-[''] max-[1050px]:size-[123px] max-[1050px]:before:size-[94px] max-[350px]:size-[92px] max-[350px]:before:size-[70px] max-[440px]:size-[108px] max-[440px]:before:size-[82px] max-[680px]:size-[130px] max-[680px]:before:size-[101px] max-[850px]:size-[100px] max-[850px]:before:size-[76px]"
      >
        <div className="col-start-1 row-start-1 rotate-90 text-center text-[27px] leading-[1.6] font-[750] max-[1050px]:text-[24px] max-[350px]:text-[21px] max-[440px]:text-[23px] max-[680px]:text-[27px] max-[850px]:text-[22px]">
          ۲۸٪
          <Small className="!block !text-[9px] !font-normal !text-[#7f725d] max-[440px]:!text-[8px] max-[680px]:!text-[9px] max-[850px]:!text-[8px]">
            سود خالص
          </Small>
        </div>
      </div>

      <div className="flex flex-col gap-[11px]">
        {breakdown.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-[15px] border-b border-[#eee9dd] pb-[9px] text-[11px] last-of-type:border-0 last-of-type:pb-0 max-[1050px]:text-[10px] max-[350px]:text-[8px] max-[440px]:gap-[6px] max-[440px]:text-[9px] max-[680px]:pb-[10px] max-[680px]:text-[11px] max-[850px]:gap-[5px] max-[850px]:text-[9px]"
          >
            <Span className="!flex !items-center !gap-[6px] !text-inherit">
              <i
                className="size-[6px] rounded-[2px] bg-[var(--slice)]"
                style={{ '--slice': item.slice } as CSSProperties}
              />
              {item.label}
            </Span>

            <strong className="text-[13px] font-[650] max-[440px]:text-[11px] max-[680px]:text-[13px] max-[850px]:text-[11px]">
              {item.value}
            </strong>
          </div>
        ))}

        <P className="mt-0 text-[9px] text-[#81715b] max-[350px]:text-[8px] max-[440px]:text-[8px] max-[680px]:text-[9px] max-[850px]:text-[8px]">
          ترکیب نمونه فروش خالص · مهر ۱۴۰۵
        </P>
      </div>
    </div>
  );
}
