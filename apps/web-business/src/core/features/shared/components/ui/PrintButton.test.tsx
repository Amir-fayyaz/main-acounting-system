import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrintButton } from './PrintButton';

const originalPrint = window.print;

afterEach(() => {
  Object.defineProperty(window, 'print', {
    value: originalPrint,
    configurable: true,
    writable: true,
  });
});

describe('PrintButton', () => {
  it('opens the browser print dialog', async () => {
    const printMock = vi.fn();
    Object.defineProperty(window, 'print', {
      value: printMock,
      configurable: true,
      writable: true,
    });
    const user = userEvent.setup();

    render(<PrintButton />);

    await user.click(screen.getByRole('button', { name: 'چاپ' }));

    expect(printMock).toHaveBeenCalledTimes(1);
  });
});
