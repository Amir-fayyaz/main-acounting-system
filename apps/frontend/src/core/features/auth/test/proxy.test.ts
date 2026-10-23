// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, proxy } from '@/proxy';

const ORIGIN = 'http://localhost:3001';

const request = (path: string, token?: string) =>
  new NextRequest(
    `${ORIGIN}${path}`,
    token ? { headers: { cookie: `Token=${token}` } } : undefined,
  );

const jwt = (exp: number) => `h.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.s`;
const nowSec = () => Math.floor(Date.now() / 1000);

const redirectTarget = (res: Response) =>
  res.status >= 300 && res.status < 400 ? new URL(res.headers.get('location')!).pathname : null;

describe('proxy — مسیرهای محافظت‌شده', () => {
  it('بدون توکن به /login ریدایرکت می‌شود', () => {
    expect(redirectTarget(proxy(request('/dashboard')))).toBe('/login');
  });

  it('با توکن مات (غیر JWT) رد می‌شود', () => {
    const res = proxy(request('/dashboard', 'opaque-token-value'));
    expect(redirectTarget(res)).toBeNull();
  });

  it('JWT منقضی ریدایرکت می‌شود و کوکی پاک می‌شود', () => {
    const res = proxy(request('/dashboard', jwt(nowSec() - 60)));
    expect(redirectTarget(res)).toBe('/login');
    expect(res.headers.get('set-cookie')).toMatch(/Token=;/);
  });

  it('JWT معتبر رد می‌شود', () => {
    expect(redirectTarget(proxy(request('/dashboard', jwt(nowSec() + 3600))))).toBeNull();
  });
});

describe('proxy — مسیرهای عمومی', () => {
  it.each(['/', '/login', '/register', '/forgot', '/terms', '/faq', '/plans/pro'])(
    '%s بدون توکن باز است',
    (path) => {
      expect(redirectTarget(proxy(request(path)))).toBeNull();
    },
  );

  it('/loginx عمومی حساب نمی‌شود (فقط تطبیق دقیق یا زیرمسیر)', () => {
    expect(redirectTarget(proxy(request('/loginx')))).toBe('/login');
  });
});

describe('proxy — کاربر لاگین‌شده', () => {
  it.each(['/login', '/register'])('%s را به / برمی‌گرداند', (path) => {
    expect(redirectTarget(proxy(request(path, 'opaque-token-value')))).toBe('/');
  });

  it('/forgot را نمی‌بندد', () => {
    expect(redirectTarget(proxy(request('/forgot', 'opaque-token-value')))).toBeNull();
  });

  it('JWT منقضی روی /login ریدایرکت نمی‌شود', () => {
    expect(redirectTarget(proxy(request('/login', jwt(nowSec() - 60))))).toBeNull();
  });
});

describe('proxy — matcher', () => {
  const pattern = new RegExp(`^${config.matcher[0]}$`);

  it.each(['/dashboard', '/login', '/'])('%s را شامل می‌شود', (path) => {
    expect(pattern.test(path)).toBe(true);
  });

  it.each([
    '/api/v1/auth/session',
    '/_next/static/chunk.js',
    '/favicon.ico',
    '/common/img/a.png',
    '/logo.svg',
  ])('%s را شامل نمی‌شود', (path) => {
    expect(pattern.test(path)).toBe(false);
  });
});
