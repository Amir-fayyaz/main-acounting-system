# Reusable panel

The panel is a static UI preview at `/panel`, accessible without login or a token. The default sidebar matches the reference: 13 links in four groups (workspace, daily operations, finance, and support). Each destination has its own placeholder page. No business data or backend integration is included.

## Structure

- `apps/frontend/src/app/(panel)/layout.tsx` renders the panel without reading server cookies.
- `apps/frontend/src/app/(panel)/panel.css` contains the panel's shared UI utility styles and scoped layout rules. The existing site header and footer are hidden only while this panel route is rendered.
- `packages/web/ui/components/custom/panel/components/block/layout/PanelLayout.tsx` (`@repo/web/ui/panel`) accepts a `PanelConfiguration`, page content, optional account details, and optional header actions.
- `AccountingPanelLayout.tsx` and `PanelLayout.tsx` are server components. `PanelSidebar.tsx` owns active-route detection on the client; sidebar controls, search, and theme controls remain client components.
- Navigation uses serializable icon names (for example `icon: 'CiUser'`). `SidebarIcon.tsx` maps these names to the existing `react-icons/ci` components.
- `src/core/features/panel/assets/mock/navigation.ts` contains the navigation groups, labels, routes, and `react-icons/ci` icons.
- `packages/web/ui/components/custom/ui/sidebar/SideBar.tsx` (`@repo/web/ui/sidebar`) extends the existing sidebar using the original shadcn primitives.
- `PanelPlaceholder` reuses the existing `SectionLayout` and Typography components.

The root layout, global stylesheet, shared shadcn primitives, shared wrapper, and global Vitest configuration are unchanged. The only authentication change is adding `/panel` to the proxy's public paths; authentication on other routes remains as before.

## Reuse

Import `PanelLayout` and a typed `PanelConfiguration` from `@repo/web/ui/panel` in a server layout. Supply a panel type (`user`, `business-owner`, or `admin`), brand text, home route, and navigation groups. Each navigation item takes a label, a valid route, and an icon name supported by `SidebarIcon`. A panel type configures presentation; it does not implement authorization.

```tsx
import type { ReactNode } from 'react';
import { PanelLayout, type PanelConfiguration } from '@repo/web/ui/panel';

const config: PanelConfiguration = {
  type: 'user',
  title: 'پروفایل',
  subtitle: 'حساب کاربری',
  homeHref: '/profile',
  monogram: 'پ',
  navigation: [
    {
      id: 'account',
      label: 'حساب کاربری',
      items: [{ label: 'پروفایل', href: '/profile', icon: 'CiUser' }],
    },
  ],
};

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <PanelLayout config={config}>{children}</PanelLayout>;
}
```

For a standalone sidebar, import `AppSidebar` and its navigation types from `@repo/web/ui/sidebar`. Render it within `SidebarProvider` and `TooltipProvider` from `@repo/web/ui`, supplying `navigation`, `activeHref`, and optional `header`/`footer` slots. The full `PanelLayout` handles providers, active routes, search, theme controls, and mobile navigation automatically.

Shared components have no frontend aliases or accounting routes. They use the existing `react-icons` library as a peer dependency. Tailwind must scan the shared package: use its existing stylesheet or add an `@source` pointing to `packages/web/ui` in the consuming app's CSS (the frontend panel already does this).

Pass `account` with `name`, `description`, and optional `avatarSrc` when real account data is available. Images render through `ImgNormalCustom`; the static preview displays a neutral account label. Pages remain placeholders.

## Run and verify

```bash
pnpm --filter frontend dev
# Open http://localhost:3001/panel directly; no login is required.

cd apps/frontend
node node_modules/vitest/vitest.mjs run --config src/core/features/panel/test/vitest.panel.config.ts
node node_modules/next/dist/bin/next build
```

The test configuration is local to this feature. Tests exercise role configuration isolation, navigation links and active state, desktop collapse, the mobile drawer, search keyboard controls, and theme persistence. Browser checks use a fresh context without authentication cookies.

## Sublinks

A navigation item can be either a destination (`label`, `href`, `icon`) or a collapsible parent (`id`, `label`, `icon`, `children`). Child links take `label`, `href`, and an optional icon. `defaultOpen` controls whether the parent starts expanded. The submenu containing the active route opens automatically; clicking a parent in the desktop icon rail expands the sidebar.

```tsx
{
  id: 'store',
  label: 'فروشگاه',
  icon: 'CiShop',
  defaultOpen: true,
  children: [
    { label: 'سفارش‌ها', href: '/panel/store/orders' },
    { label: 'مرجوعی‌ها', href: '/panel/store/returns' },
    { label: 'تخفیف‌ها', href: '/panel/store/discounts' },
  ],
}
```

The store group is an optional configuration example, excluded from the default accounting menu. Its three routes remain available as static placeholders. Search includes child destinations even when their submenu is closed. Keyboard activation, active child and parent states, and mobile drawer behavior are handled by the shared sidebar.
