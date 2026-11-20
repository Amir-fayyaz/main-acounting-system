import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { StatusFilter } from '../components/ui';

const OPTIONS = [
  { value: 'active', label: 'فعال' },
  { value: 'inactive', label: 'غیرفعال' },
];

beforeAll(() => {
  // jsdom does not implement the pointer/scroll APIs used by Radix Select.
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

describe('StatusFilter', () => {
  it('shows the all-option label when no status is selected', () => {
    render(<StatusFilter value="" options={OPTIONS} onChange={() => {}} />);

    expect(screen.getByRole('combobox', { name: 'وضعیت' })).toHaveTextContent('وضعیت: همه');
  });

  it('shows the Persian label of the selected status', () => {
    render(<StatusFilter value="active" options={OPTIONS} onChange={() => {}} />);

    expect(screen.getByRole('combobox')).toHaveTextContent('فعال');
  });

  it('uses a custom field label for the all-option', () => {
    render(<StatusFilter value="" options={OPTIONS} onChange={() => {}} fieldLabel="نتیجه" />);

    expect(screen.getByRole('combobox')).toHaveTextContent('نتیجه: همه');
  });

  it('emits the chosen status when an option is picked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatusFilter value="" options={OPTIONS} onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'غیرفعال' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('inactive');
  });

  it('emits an empty string when the filter is cleared', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatusFilter value="active" options={OPTIONS} onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'وضعیت: همه' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('');
  });
});
