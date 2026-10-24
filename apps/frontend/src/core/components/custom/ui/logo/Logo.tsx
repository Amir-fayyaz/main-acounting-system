import { ImgNormalCustom } from '@repo/web/ui';

function Logo({ classname, width }: { classname?: string; width?: number }) {
  return (
    <ImgNormalCustom
      src={'/common/img/logo/kplogo.png'}
      alt="Logo"
      height={100}
      width={width ? width : 100}
      className={classname}
    />
  );
}

export default Logo;
