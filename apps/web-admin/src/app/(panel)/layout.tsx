import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { PanelLayout } from '@repo/web/ui/panel';
import { adminPanelConfig } from '@/core/features/panel/assets/mock/navigation';
import { getSessionAction, LogoutButton } from '@repo/web/session';

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const sessionResult = await getSessionAction();
  
  if (!sessionResult.ok) {
    const loginBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';
    redirect(`${loginBaseUrl}/login?next=${encodeURIComponent('/admin')}`);
  }
  
  return (
    <PanelLayout 
      config={adminPanelConfig}
      account={{
        name: sessionResult.session.principal.displayName,
        description: sessionResult.session.principal.email
      }}
      logoutControl={<LogoutButton />}
    >
      {children}
    </PanelLayout>
  );
}
