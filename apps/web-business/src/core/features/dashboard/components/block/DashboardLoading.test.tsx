import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardLoading } from './DashboardLoading';

describe('DashboardLoading', () => {
  it('renders the loading skeleton with aria attributes', () => {
    render(<DashboardLoading />);

    const container = screen.getByLabelText('در حال بارگذاری داشبورد');
    expect(container).toHaveAttribute('aria-busy', 'true');
  });

  it('renders 13 skeleton placeholder cards total', () => {
    render(<DashboardLoading />);

    expect(document.querySelectorAll('[data-slot="card"]')).toHaveLength(13);
  });

  it('renders skeletons inside each card', () => {
    render(<DashboardLoading />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
