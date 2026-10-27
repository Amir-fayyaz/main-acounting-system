import { SiteFooter } from '@/core/features/landing/components/block/layout/footer/SiteFooter';
import { SiteHeader } from '@/core/features/landing/components/block/layout/header/SiteHeader';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
