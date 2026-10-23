// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/lib/basic-link/BackendBasicLink', () => ({ BASE_URL: 'http://legacy.test/api' }));

import { getSessionApi, signInApi, signOutApi, signUpApi } from '../lib/auth-api';
import { env } from 'process';

const fetchMock = vi.fn();
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: url as string, init: init as RequestInit };
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://api.test/api');
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('آدرس پایه', () => {
  it('از NEXT_PUBLIC_API_BASE_URL + /v1/auth ساخته می‌شود (نه /api/api)', async () => {
    fetchMock.mockResolvedValue(json(201, {}));
    await signInApi({ email: 'a@b.co', password: 'x' });
    expect(lastCall().url).toBe('http://api.test/api/v1/auth/sign-in');
  });

  it('سمت سرور INTERNAL_API_BASE_URL را ترجیح می‌دهد (Docker)', async () => {
    vi.stubEnv('INTERNAL_API_BASE_URL', 'http://backend:3000/api');
    fetchMock.mockResolvedValue(json(200, {}));
    await getSessionApi('tok');
    expect(lastCall().url).toBe('http://backend:3000/api/v1/auth/session');
  });

  it('بدون هیچ‌کدام از متغیرهای جدید به BASE_URL قدیمی برمی‌گردد', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', undefined as unknown as string);
    delete env.NEXT_PUBLIC_API_BASE_URL;
    fetchMock.mockResolvedValue(json(201, {}));
    await signInApi({ email: 'a@b.co', password: 'x' });
    expect(lastCall().url).toBe('http://legacy.test/api/v1/auth/sign-in');
  });
});

describe('signInApi', () => {
  it('POST با بدنه‌ی JSON می‌فرستد و پاسخ را برمی‌گرداند', async () => {
    const payload = { token: 't', tokenType: 'Bearer', expiresAt: 'e', principal: {} };
    fetchMock.mockResolvedValue(json(201, payload));

    await expect(signInApi({ email: 'a@b.co', password: 'secret' })).resolves.toEqual(payload);

    const { init } = lastCall();
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.co', password: 'secret' });
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('روی 401 شیء {status, body} پرتاب می‌کند', async () => {
    const body = { error: { code: 'UNAUTHENTICATED' } };
    fetchMock.mockResolvedValue(json(401, body));
    await expect(signInApi({ email: 'a@b.co', password: 'x' })).rejects.toEqual({
      status: 401,
      body,
    });
  });

  it('بدنه‌ی غیر JSON باعث کرش نمی‌شود', async () => {
    fetchMock.mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502 }));
    await expect(signInApi({ email: 'a@b.co', password: 'x' })).rejects.toEqual({
      status: 502,
      body: null,
    });
  });

  it('خطای شبکه همان‌طور که هست پرتاب می‌شود (بدون status)', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(signInApi({ email: 'a@b.co', password: 'x' })).rejects.toBeInstanceOf(TypeError);
  });
});

describe('signUpApi', () => {
  it('دقیقاً سه فیلد قرارداد را به /sign-up می‌فرستد', async () => {
    const user = { id: '1', displayName: 'Ali', email: 'a@b.co', status: 'active' };
    fetchMock.mockResolvedValue(json(201, user));

    await expect(
      signUpApi({ displayName: 'Ali', email: 'a@b.co', password: 'a-long-password' }),
    ).resolves.toEqual(user);

    const { url, init } = lastCall();
    expect(url).toBe('http://api.test/api/v1/auth/sign-up');
    expect(Object.keys(JSON.parse(init.body as string)).sort()).toEqual([
      'displayName',
      'email',
      'password',
    ]);
  });

  it('روی 409 شیء {status, body} پرتاب می‌کند', async () => {
    fetchMock.mockResolvedValue(json(409, { error: { code: 'CONFLICT' } }));
    await expect(
      signUpApi({ displayName: 'Ali', email: 'a@b.co', password: 'a-long-password' }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('getSessionApi', () => {
  it('GET با هدر Bearer و بدون cache', async () => {
    fetchMock.mockResolvedValue(json(200, { sessionId: 's' }));
    await getSessionApi('tok');

    const { init } = lastCall();
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(init.cache).toBe('no-store');
  });

  it('روی 401 پرتاب می‌کند', async () => {
    fetchMock.mockResolvedValue(json(401, {}));
    await expect(getSessionApi('bad')).rejects.toMatchObject({ status: 401 });
  });
});

describe('signOutApi', () => {
  it('با 204 موفق می‌شود و Bearer می‌فرستد', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(signOutApi('tok')).resolves.toBeUndefined();

    const { url, init } = lastCall();
    expect(url).toBe('http://api.test/api/v1/auth/sign-out');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('روی 401 پرتاب می‌کند', async () => {
    fetchMock.mockResolvedValue(json(401, {}));
    await expect(signOutApi('bad')).rejects.toMatchObject({ status: 401 });
  });
});
