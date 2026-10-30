// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiRequest,
  createHttpApiError,
  getFieldErrors,
  normalizeApiError,
  serializeApiError,
} from '@repo/web/api';

const fetchMock = vi.fn();
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const backendError = {
  error: {
    code: 'VALIDATION_FAILED',
    category: 'validation',
    message: 'The request contains invalid values.',
    correlationId: 'e8f6c6bc-7932-4263-a141-47c85a85bef6',
    details: [
      { field: 'page', code: 'min', message: 'page is below the minimum allowed value' },
      { field: 'limit', code: 'max', message: 'limit is above the maximum allowed value' },
    ],
  },
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('apiRequest response formats', () => {
  it('JSON را فقط با parser به نوع T تبدیل می‌کند', async () => {
    fetchMock.mockResolvedValue(json(200, { id: '42' }));

    const result = await apiRequest('/resource', {
      parse(data) {
        if (typeof data !== 'object' || data === null || !('id' in data)) {
          throw new TypeError('invalid');
        }
        return { id: String(data.id) };
      },
    });

    expect(result).toEqual({ id: '42' });
  });

  it('JSON بدون parser را unknown برمی‌گرداند', async () => {
    fetchMock.mockResolvedValue(json(200, { ok: true }));
    await expect(apiRequest('/resource')).resolves.toEqual({ ok: true });
  });

  it('text، blob، arrayBuffer و formData را باز می‌کند', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('hello'))
      .mockResolvedValueOnce(new Response('blob-body'))
      .mockResolvedValueOnce(new Response('buffer-body'))
      .mockResolvedValueOnce(
        new Response('name=amir', {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

    await expect(apiRequest('/text', { responseType: 'text' })).resolves.toBe('hello');
    await expect(apiRequest('/blob', { responseType: 'blob' })).resolves.toBeInstanceOf(Blob);
    await expect(apiRequest('/buffer', { responseType: 'arrayBuffer' })).resolves.toBeInstanceOf(
      ArrayBuffer,
    );
    const form = await apiRequest('/form', { responseType: 'formData' });
    expect(form.get('name')).toBe('amir');
  });

  it('پاسخ بدون محتوا را برای responseType=void می‌پذیرد', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest('/resource', { responseType: 'void' })).resolves.toBeUndefined();
  });

  it('JSON خراب یا شکست parser را invalid-response می‌کند', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('<html>not json</html>', { status: 200 }))
      .mockResolvedValueOnce(json(200, { wrong: true }));

    await expect(apiRequest('/bad-json')).rejects.toMatchObject({
      kind: 'invalid-response',
      code: 'INVALID_RESPONSE',
    });
    await expect(
      apiRequest('/wrong-shape', {
        parse() {
          throw new TypeError('wrong shape');
        },
      }),
    ).rejects.toMatchObject({ kind: 'invalid-response', code: 'INVALID_RESPONSE' });
  });
});

describe('API error normalization', () => {
  it('پیام، correlationId و validation details واقعی بک‌اند را حفظ می‌کند', async () => {
    fetchMock.mockResolvedValue(json(400, backendError));

    await expect(apiRequest('/examples?page=0')).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'http',
      source: 'backend',
      status: 400,
      code: 'VALIDATION_FAILED',
      category: 'validation',
      message: 'The request contains invalid values.',
      correlationId: 'e8f6c6bc-7932-4263-a141-47c85a85bef6',
      details: backendError.error.details,
    });
  });

  it('برای HTML یا بدنه ناشناخته fallback امن می‌سازد', async () => {
    fetchMock.mockResolvedValue(new Response('<pre>secret stack</pre>', { status: 500 }));

    try {
      await apiRequest('/broken');
      expect.unreachable('request should fail');
    } catch (error: unknown) {
      expect(error).toMatchObject({
        kind: 'http',
        source: 'default',
        status: 500,
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      });
      expect(JSON.stringify(serializeApiError(error))).not.toContain('secret stack');
    }
  });

  it('401 و 403 را مستقل نگه می‌دارد', () => {
    expect(createHttpApiError(401)).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(createHttpApiError(403)).toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('خطای شبکه و لغو درخواست را از هم جدا می‌کند', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'));

    await expect(apiRequest('/offline')).rejects.toMatchObject({
      kind: 'network',
      code: 'NETWORK_ERROR',
    });
    await expect(apiRequest('/cancelled')).rejects.toMatchObject({
      kind: 'aborted',
      code: 'REQUEST_ABORTED',
    });
  });

  it('بعد از serialize شدن دوباره قابل normalize است', () => {
    const data = serializeApiError(createHttpApiError(404));
    const restored = normalizeApiError(data);

    expect(restored).toBeInstanceOf(ApiError);
    expect(restored).toMatchObject({ status: 404, code: 'NOT_FOUND', kind: 'http' });
  });

  it('داده سریال‌شده نامعتبر را به عنوان خطای قابل اعتماد قبول نمی‌کند', () => {
    const restored = normalizeApiError({
      name: 'ApiError',
      kind: 'http',
      source: 'backend',
      message: 'fake backend message',
      status: 200,
      details: [{ field: 'email', code: 'invalid', message: 42 }],
    });

    expect(restored).toMatchObject({
      kind: 'unexpected',
      source: 'default',
      code: 'UNEXPECTED_ERROR',
    });
    expect(restored.message).not.toContain('fake backend message');
  });

  it('فقط fieldهای allowlist شده را برای فرم برمی‌گرداند', () => {
    const error = createHttpApiError(400, backendError);
    expect(getFieldErrors(error, ['page'] as const)).toEqual({
      page: 'page is below the minimum allowed value',
    });
  });
});
