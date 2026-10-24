export type CompanyBrandKey = 'digikala' | 'snapp' | 'tapsi' | 'aparat' | 'bazaar' | 'zarinpal';

export interface CompanyBrand {
  key: CompanyBrandKey;
  name: string;
  lang?: string;
  dir?: 'ltr' | 'rtl';
}
