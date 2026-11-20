import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ListCard } from './ListCard';

describe('ListCard', () => {
  it('renders title, action, and children', () => {
    render(
      <ListCard title="لیست تست" action={<span className="action">عملیات</span>}>
        <span className="child">محتوای لیست</span>
      </ListCard>,
    );

    expect(screen.getByText('لیست تست')).toBeInTheDocument();
    expect(screen.getByText('عملیات')).toBeInTheDocument();
    expect(screen.getByText('محتوای لیست')).toBeInTheDocument();
  });

  it('renders title inside H2', () => {
    render(<ListCard title="عنوان">محتوا</ListCard>);

    const heading = document.querySelector('h2');
    expect(heading).not.toBeNull();
    expect(heading).toHaveTextContent('عنوان');
    expect(heading).toHaveClass('text-[15px]', 'font-bold');
  });

  it('renders without action when not provided', () => {
    render(<ListCard title="بدون عملیات">محتوا</ListCard>);

    expect(screen.getByText('بدون عملیات')).toBeInTheDocument();
    expect(screen.getByText('محتوا')).toBeInTheDocument();
  });
});
