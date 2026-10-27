import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PanelLayout } from '@repo/web/ui/panel';
import { PanelPlaceholder } from '../components/block/placeholder/PanelPlaceholder';
import { accountingPanelConfig } from '../assets/mock/navigation';
import type { PanelConfiguration } from '@repo/web/ui/panel';
import { getSidebarLinks } from '@repo/web/ui/sidebar';
import { getActivePanelItem } from '@repo/web/ui/panel';

const state = vi.hoisted(() => ({ pathname: '/panel', mobile: false, push: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ push: state.push }),
}));

beforeEach(() => {
  state.pathname = '/panel';
  state.mobile = false;
  state.push.mockReset();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('max-width') && state.mobile,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

// Submenus remain available to consumers, independently of the accounting menu.
const panelWithSublinks: PanelConfiguration = {
  ...accountingPanelConfig,
  navigation: [
    ...accountingPanelConfig.navigation,
    {
      id: 'store',
      label: 'مدیریت',
      items: [
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
        },
      ],
    },
  ],
};

function renderPanel(
  defaultSidebarOpen = true,
  config: PanelConfiguration = accountingPanelConfig,
) {
  return render(
    <PanelLayout config={config} defaultSidebarOpen={defaultSidebarOpen}>
      <PanelPlaceholder title="میز کار" />
    </PanelLayout>,
  );
}

describe('Reusable panel shell', () => {
  it('keeps navigation serializable across the server/client boundary', () => {
    expect(structuredClone(accountingPanelConfig)).toEqual(accountingPanelConfig);
  });

  it('renders every configured route and marks only the current destination active', () => {
    state.pathname = '/panel/sales';
    renderPanel();
    const nav = screen.getByRole('navigation', { name: 'منوی پنل' });
    expect(within(nav).getAllByRole('link')).toHaveLength(13);
    for (const item of getSidebarLinks(accountingPanelConfig.navigation)) {
      expect(within(nav).getByRole('link', { name: item.label })).toHaveAttribute(
        'href',
        item.href,
      );
    }
    expect(within(nav).getByRole('link', { name: 'فروش' })).toHaveAttribute('aria-current', 'page');
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('میز کار');
    expect(
      screen.getByRole('heading', { level: 1 }).closest('.section-layout'),
    ).toBeInTheDocument();
  });

  it('supports independent user and admin configurations with the same layout', () => {
    const createConfig = (type: 'user' | 'admin'): PanelConfiguration => ({
      type,
      title: type,
      subtitle: 'تراز',
      monogram: 'ت',
      homeHref: `/${type}`,
      navigation: [
        {
          id: type,
          label: type,
          items: [{ label: `${type} profile`, href: `/${type}/profile`, icon: 'CiUser' }],
        },
      ],
    });
    const { rerender } = render(
      <PanelLayout config={createConfig('user')}>
        <PanelPlaceholder title="کاربر" />
      </PanelLayout>,
    );
    expect(screen.getByRole('link', { name: 'user profile' })).toHaveAttribute(
      'href',
      '/user/profile',
    );
    expect(screen.queryByRole('link', { name: 'فروش' })).not.toBeInTheDocument();
    rerender(
      <PanelLayout config={createConfig('admin')}>
        <PanelPlaceholder title="مدیریت" />
      </PanelLayout>,
    );
    expect(screen.queryByRole('link', { name: 'user profile' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'admin profile' })).toHaveAttribute(
      'href',
      '/admin/profile',
    );
    expect(
      getSidebarLinks(accountingPanelConfig.navigation).find((item) => item.label === 'فروش')?.href,
    ).toBe('/panel/sales');
  });

  it('collapses on desktop and persists the preference using the existing sidebar cookie', async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();
    await user.click(screen.getAllByRole('button', { name: 'بستن منو' })[0]);
    expect(container.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
      'data-state',
      'collapsed',
    );
    expect(document.cookie).toContain('sidebar_state=false');
  });

  it('honors a saved collapsed state', () => {
    const { container } = renderPanel(false);
    expect(container.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
      'data-state',
      'collapsed',
    );
  });

  it('opens a mobile drawer, closes on navigation, and supports Escape', async () => {
    state.mobile = true;
    const user = userEvent.setup();
    renderPanel(false);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'باز کردن منو' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'فروش' })).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'فروش' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'باز کردن منو' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'باز کردن منو' })).toHaveFocus());
  });

  it('searches configured destinations, accepts Arabic letter variants, and navigates on Enter', async () => {
    const user = userEvent.setup();
    renderPanel();
    const input = screen.getByRole('searchbox', { name: 'جستجو در پنل' });
    await user.type(input, 'مغایرت');
    expect(screen.getAllByRole('link', { name: 'مغایرت‌گیری' })).toHaveLength(2);
    await user.keyboard('{Enter}');
    expect(state.push).toHaveBeenCalledWith('/panel/reconciliation');
    expect(input).toHaveValue('');
    await user.type(input, 'خريد');
    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('link', { name: 'خرید' })[1]).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(input).toHaveFocus();
    await user.click(input);
    await user.type(input, 'ناشناخته');
    expect(screen.getByRole('status')).toHaveTextContent('بخشی با این نام پیدا نشد.');
  });

  it('switches theme and restores the saved preference when mounted again', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPanel();
    await user.click(screen.getByRole('button', { name: 'فعال کردن حالت تاریک' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(localStorage.getItem('panel-theme')).toBe('dark');
    unmount();
    document.documentElement.classList.remove('dark');
    renderPanel();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'فعال کردن حالت روشن' })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'فعال کردن حالت روشن' }));
    expect(localStorage.getItem('panel-theme')).toBe('light');
  });
});

describe('Panel route matching', () => {
  it('matches nested routes without confusing prefixes or marking home active for known destinations', () => {
    const navigation = accountingPanelConfig.navigation;
    expect(getActivePanelItem(navigation, '/panel/sales/123')?.href).toBe('/panel/sales');
    expect(getActivePanelItem(navigation, '/panel/sales-archive')?.href).toBe('/panel');
    expect(getActivePanelItem(navigation, '/different')).toBeUndefined();
  });
});

describe('Configurable sidebar sublinks', () => {
  it('opens and closes a submenu using pointer and keyboard controls', async () => {
    const user = userEvent.setup();
    renderPanel(true, panelWithSublinks);
    const store = screen.getByRole('button', { name: 'فروشگاه' });
    expect(store).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'سفارش‌ها' })).toHaveAttribute(
      'href',
      '/panel/store/orders',
    );
    await user.click(store);
    expect(store).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'سفارش‌ها' })).not.toBeInTheDocument();
    store.focus();
    await user.keyboard('{Enter}');
    expect(store).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'تخفیف‌ها' })).toBeVisible();
  });

  it('opens a matching submenu when the current child route changes and marks its parent', async () => {
    const user = userEvent.setup();
    state.pathname = '/panel/store/orders/123';
    const { rerender } = renderPanel(true, panelWithSublinks);
    const store = screen.getByRole('button', { name: 'فروشگاه' });
    expect(store).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('link', { name: 'سفارش‌ها' })).toHaveAttribute('aria-current', 'page');
    await user.click(store);
    expect(store).toHaveAttribute('aria-expanded', 'false');
    state.pathname = '/panel/store/returns';
    rerender(
      <PanelLayout config={panelWithSublinks}>
        <PanelPlaceholder title="مرجوعی‌ها" />
      </PanelLayout>,
    );
    expect(store).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'مرجوعی‌ها' })).toHaveAttribute('aria-current', 'page');
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it('expands the desktop icon rail when a submenu icon is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderPanel(false, panelWithSublinks);
    const store = screen.getByRole('button', { name: 'فروشگاه' });
    expect(store).toHaveAttribute('aria-expanded', 'false');
    await user.click(store);
    expect(container.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
      'data-state',
      'expanded',
    );
    expect(screen.getByRole('link', { name: 'سفارش‌ها' })).toBeVisible();
  });

  it('closes the mobile drawer when a sublink is selected', async () => {
    state.mobile = true;
    const user = userEvent.setup();
    renderPanel(true, panelWithSublinks);
    await user.click(screen.getByRole('button', { name: 'باز کردن منو' }));
    await user.click(screen.getByRole('link', { name: 'مرجوعی‌ها' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('finds and navigates to sublinks through search, including when the submenu is closed', async () => {
    const user = userEvent.setup();
    renderPanel(true, panelWithSublinks);
    await user.click(screen.getByRole('button', { name: 'فروشگاه' }));
    const input = screen.getByRole('searchbox', { name: 'جستجو در پنل' });
    await user.type(input, 'تخفیف');
    expect(screen.getByRole('link', { name: 'تخفیف‌ها' })).toHaveAttribute(
      'href',
      '/panel/store/discounts',
    );
    await user.keyboard('{Enter}');
    expect(state.push).toHaveBeenCalledWith('/panel/store/discounts');
  });
});
