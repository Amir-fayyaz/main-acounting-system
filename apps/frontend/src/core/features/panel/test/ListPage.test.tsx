import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ListPage, type ListStatsState } from '../components/ui';

const SUCCESS_STATS: ListStatsState = {
  status: 'success',
  items: [
    { id: 'count', label: 'تعداد اسناد', value: '۴۸' },
    {
      id: 'sum',
      label: 'مجموع مبالغ',
      value: '۴۸٫۲ میلیارد ریال',
      hint: 'فقط اسناد تراز',
      tone: 'positive',
    },
  ],
};

describe('ListPage', () => {
  it('renders the page header with title, description and actions', () => {
    render(
      <ListPage
        title="دفتر روزنامه"
        description="اسناد ثبت‌شده"
        actions={<button type="button">افزودن سند</button>}
      >
        <table aria-label="جدول اسناد">
          <tbody />
        </table>
      </ListPage>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'دفتر روزنامه' })).toBeInTheDocument();
    expect(screen.getByText('اسناد ثبت‌شده')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'افزودن سند' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'جدول اسناد' })).toBeInTheDocument();
  });

  it('renders search, filter and extra toolbar slots above the list body', () => {
    render(
      <ListPage
        title="چک‌ها"
        toolbar={{
          search: <input aria-label="جستجو در چک‌ها" placeholder="جستجو…" />,
          filter: <button type="button">وضعیت: همه</button>,
          children: <button type="button">چاپ</button>,
        }}
      >
        <div data-testid="list-body" />
      </ListPage>,
    );

    expect(screen.getByLabelText('جستجو در چک‌ها')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'وضعیت: همه' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'چاپ' })).toBeInTheDocument();
    expect(screen.getByTestId('list-body')).toBeInTheDocument();
  });

  it('renders success statistics with labels, values and hints', () => {
    render(
      <ListPage title="حساب‌های بانکی" stats={SUCCESS_STATS}>
        <div />
      </ListPage>,
    );

    const region = screen.getByLabelText('آمار فهرست');
    expect(region).toHaveTextContent('تعداد اسناد');
    expect(region).toHaveTextContent('۴۸');
    expect(region).toHaveTextContent('۴۸٫۲ میلیارد ریال');
    expect(region).toHaveTextContent('فقط اسناد تراز');
  });

  it('shows the loading state for statistics', () => {
    render(
      <ListPage title="حساب‌های بانکی" stats={{ status: 'loading' }}>
        <div />
      </ListPage>,
    );

    expect(screen.getByRole('status', { name: 'در حال بارگذاری آمار' })).toBeInTheDocument();
  });

  it('shows an alert when statistics fail', () => {
    render(
      <ListPage title="حساب‌های بانکی" stats={{ status: 'error', message: 'خطا در دریافت آمار' }}>
        <div />
      </ListPage>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('خطا در دریافت آمار');
  });

  it('falls back to the default statistics error message', () => {
    render(
      <ListPage title="حساب‌های بانکی" stats={{ status: 'error' }}>
        <div />
      </ListPage>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'دریافت آمار با مشکل مواجه شد. لطفاً دوباره تلاش کنید.',
    );
  });

  it('omits the statistics row when the success list is empty', () => {
    render(
      <ListPage title="حساب‌های بانکی" stats={{ status: 'success', items: [] }}>
        <div />
      </ListPage>,
    );

    expect(screen.queryByLabelText('آمار فهرست')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders without optional stats and toolbar', () => {
    render(<ListPage title="فقط عنوان">بدون ابزار</ListPage>);

    expect(screen.getByRole('heading', { level: 1, name: 'فقط عنوان' })).toBeInTheDocument();
    expect(screen.getByText('بدون ابزار')).toBeInTheDocument();
  });
});
