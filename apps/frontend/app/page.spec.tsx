import { render, screen } from '@testing-library/react';
import HomePage from './page';

const readinessReport = {
  status: 'ready',
  checks: [
    { name: 'database', status: 'up', latencyMs: 3 },
    { name: 'redis', status: 'up', latencyMs: 1 },
    { name: 'object-storage', status: 'up', latencyMs: 5 },
  ],
};

describe('HomePage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue({ json: async () => readinessReport }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders the shell heading and the infrastructure status', async () => {
    render(await HomePage());

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('سامانه حسابداری هوشمند');
    expect(screen.getByText('برقرار است')).toBeInTheDocument();
    expect(screen.getByText('object-storage')).toBeInTheDocument();
  });
});
