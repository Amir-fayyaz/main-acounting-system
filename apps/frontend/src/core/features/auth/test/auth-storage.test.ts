// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  setCoockie: vi.fn(),
  removeCoockie: vi.fn(),
  getAccessTokenSSR: vi.fn(),
  getSessionApi: vi.fn(),
  signOutApi: vi.fn(),
}));

vi.mock('@/core/lib/coockie/setCoockie', () => ({
  setCoockie: m.setCoockie,
  removeCoockie: m.removeCoockie,
}));
vi.mock('@/core/lib/coockie/getAccess', () => ({ getAccessTokenSSR: m.getAccessTokenSSR }));
vi.mock('../lib/auth-api', () => ({
  getSessionApi: m.getSessionApi,
  signOutApi: m.signOutApi,
}));

import { clearAuthToken, getSessionAction, setAuthToken, signOutAction } from '../lib/auth-storage';

const NOW = new Date('2026-01-01T00:00:00Z');
const inSeconds = (s: number) => new Date(NOW.getTime() + s * 1000).toISOString();
const maxAgeOfLastCall = () => m.setCoockie.mock.calls.at(-1)![1] as number;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  Object.values(m).forEach((fn) => fn.mockReset());
});

describe('setAuthToken', () => {
  it('توکن را به setCoockie می‌دهد', async () => {
    await setAuthToken('tok', inSeconds(600));
    expect(m.setCoockie).toHaveBeenCalledWith('tok', expect.any(Number));
  });

  it('maxAge را از expiresAt حساب می‌کند', async () => {
    await setAuthToken('tok', inSeconds(600), false);
    expect(maxAgeOfLastCall()).toBe(600);
  });

  it('remember=true یعنی ۳۰ روز', async () => {
    await setAuthToken('tok', inSeconds(600), true);
    expect(maxAgeOfLastCall()).toBe(30 * 24 * 60 * 60);
  });

  it.each([
    ['expiresAt گذشته', inSeconds(-5)],
    ['expiresAt نامعتبر', 'not-a-date'],
    ['بدون expiresAt', undefined],
  ])('%s یعنی fallback ۶۰ دقیقه', async (_label, expiresAt) => {
    await setAuthToken('tok', expiresAt as string | undefined);
    expect(maxAgeOfLastCall()).toBe(3600);
  });

  it('fallback از AUTH_SESSION_TTL_MINUTES خوانده می‌شود', async () => {
    vi.stubEnv('AUTH_SESSION_TTL_MINUTES', '5');
    vi.resetModules();
    const fresh = await import('../lib/auth-storage');
    await fresh.setAuthToken('tok');
    expect(maxAgeOfLastCall()).toBe(300);
  });
});

describe('clearAuthToken', () => {
  it('کوکی را پاک می‌کند', async () => {
    await clearAuthToken();
    expect(m.removeCoockie).toHaveBeenCalledOnce();
  });
});

describe('getSessionAction', () => {
  it('بدون توکن 401 برمی‌گرداند و API را صدا نمی‌زند', async () => {
    m.getAccessTokenSSR.mockResolvedValue(null);
    await expect(getSessionAction()).resolves.toEqual({
      ok: false,
      error: { status: 401, body: null },
    });
    expect(m.getSessionApi).not.toHaveBeenCalled();
  });

  it('با توکن معتبر session را برمی‌گرداند', async () => {
    const session = { sessionId: 's', expiresAt: 'e', principal: {} };
    m.getAccessTokenSSR.mockResolvedValue('tok');
    m.getSessionApi.mockResolvedValue(session);

    await expect(getSessionAction()).resolves.toEqual({ ok: true, session });
    expect(m.getSessionApi).toHaveBeenCalledWith('tok');
  });

  it('خطای API را به‌صورت {ok:false} برمی‌گرداند', async () => {
    m.getAccessTokenSSR.mockResolvedValue('tok');
    m.getSessionApi.mockRejectedValue({ status: 401, body: null });

    await expect(getSessionAction()).resolves.toEqual({
      ok: false,
      error: { status: 401, body: null },
    });
  });
});

describe('signOutAction', () => {
  it('API را صدا می‌زند و سپس کوکی را پاک می‌کند', async () => {
    m.getAccessTokenSSR.mockResolvedValue('tok');
    m.signOutApi.mockResolvedValue(undefined);

    await signOutAction();

    expect(m.signOutApi).toHaveBeenCalledWith('tok');
    expect(m.removeCoockie).toHaveBeenCalledOnce();
  });

  it('بدون توکن فقط کوکی را پاک می‌کند', async () => {
    m.getAccessTokenSSR.mockResolvedValue(null);
    await signOutAction();
    expect(m.signOutApi).not.toHaveBeenCalled();
    expect(m.removeCoockie).toHaveBeenCalledOnce();
  });

  it('حتی اگر API خطا بدهد کوکی پاک می‌شود', async () => {
    m.getAccessTokenSSR.mockResolvedValue('tok');
    m.signOutApi.mockRejectedValue({ status: 500 });

    await expect(signOutAction()).rejects.toEqual({ status: 500 });
    expect(m.removeCoockie).toHaveBeenCalledOnce();
  });
});
